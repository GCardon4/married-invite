import { writeFile } from "node:fs/promises";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/public/invitaciones/[token]/route";
import { POST } from "@/app/api/public/invitaciones/[token]/respuesta/route";
import { GuestService, getGuestService } from "@/lib/guest-service";
import { PUBLIC_MESSAGES } from "@/lib/public-messages";
import { resetPublicRateLimiters } from "@/lib/rate-limit";

import { newDataFile, readRaw } from "./helpers";

const ORIGIN = "http://localhost:3000";

interface PostOptions {
  origin?: string | null;
  contentType?: string | null;
  raw?: string;
  headers?: Record<string, string>;
}

const ctx = (token: string) => ({ params: Promise.resolve({ token }) }) as never;

function getRequest(token: string, headers: Record<string, string> = {}) {
  return new Request(`${ORIGIN}/api/public/invitaciones/${token}`, { headers });
}

function postRequest(token: string, body: unknown, options: PostOptions = {}) {
  const { origin = ORIGIN, contentType = "application/json", raw, headers = {} } = options;
  return new Request(`${ORIGIN}/api/public/invitaciones/${token}/respuesta`, {
    method: "POST",
    headers: {
      ...(origin ? { origin } : {}),
      ...(contentType ? { "content-type": contentType } : {}),
      ...headers,
    },
    body: raw ?? JSON.stringify(body),
  });
}

const doGet = (token: string, headers?: Record<string, string>) =>
  GET(getRequest(token, headers), ctx(token));
const doPost = (token: string, body: unknown, options?: PostOptions) =>
  POST(postRequest(token, body, options), ctx(token));

let file: string;

beforeEach(async () => {
  file = await newDataFile();
  vi.stubEnv("DATA_FILE_PATH", file);
  vi.stubEnv("APP_BASE_URL", "");
  resetPublicRateLimiters();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function seed(name = "Familia Pérez", allowedGuests = 2) {
  return getGuestService().createGuest({
    name,
    email: `${name.split(" ")[0].toLowerCase()}@example.com`,
    phone: "+57 300 123 4567",
    allowedGuests,
  });
}

describe("GET /api/public/invitaciones/[token]", () => {
  it("devuelve solo la proyección pública y no se cachea", async () => {
    const { token } = await seed();
    const response = await doGet(token);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(await response.json()).toEqual({
      invitation: { name: "Familia Pérez", allowedGuests: 2, confirmedGuests: 0, status: "pending" },
    });
  });

  it("no expone datos de otros invitados, identificadores, contactos ni hashes", async () => {
    const mine = await seed("Familia Pérez", 2);
    const other = await seed("Familia Gómez", 5);
    const stored = JSON.parse(await readRaw(file)) as {
      guests: { id: string; tokenHash: string; email: string }[];
    };

    const text = await (await doGet(mine.token)).text();

    expect(text).not.toContain("Gómez");
    expect(text).not.toContain(other.token);
    for (const guest of stored.guests) {
      expect(text).not.toContain(guest.id);
      expect(text).not.toContain(guest.tokenHash);
      expect(text).not.toContain(guest.email);
    }
    expect(text).not.toContain("tokenHash");
    expect(text).not.toContain("300 123");
    expect(text).not.toContain("createdAt");
  });

  it.each([["A".repeat(43)], ["corto"], ["..%2F..%2Fetc"], ["%00"]])(
    "enlace inválido (%s) → 404 con un mensaje claro e idéntico",
    async (token) => {
      await seed();
      const response = await doGet(token);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: { code: "NOT_FOUND", message: PUBLIC_MESSAGES.invalidLink },
      });
    },
  );

  it("un enlace regenerado deja de funcionar y el nuevo sí", async () => {
    const { guest, token: oldToken } = await seed();
    const { token: newToken } = await getGuestService().regenerateToken(guest.id);

    expect((await doGet(oldToken)).status).toBe(404);
    expect((await doGet(newToken)).status).toBe(200);
  });
});

describe("POST /api/public/invitaciones/[token]/respuesta", () => {
  it("confirma asistencia y persiste el resultado", async () => {
    const { token } = await seed();
    const response = await doPost(token, { status: "confirmed", confirmedGuests: 2 });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      invitation: { name: "Familia Pérez", allowedGuests: 2, confirmedGuests: 2, status: "confirmed" },
    });
    const stored = JSON.parse(await readRaw(file)).guests[0];
    expect(stored).toMatchObject({ status: "confirmed", confirmedGuests: 2 });
    expect(stored.respondedAt).not.toBeNull();
    expect((await (await doGet(token)).json()).invitation.status).toBe("confirmed");
  });

  it("rechaza la invitación y permite cambiar de opinión", async () => {
    const { token } = await seed();
    await doPost(token, { status: "declined", confirmedGuests: 0 });
    expect((await (await doGet(token)).json()).invitation).toMatchObject({
      status: "declined",
      confirmedGuests: 0,
    });

    const again = await doPost(token, { status: "confirmed", confirmedGuests: 1 });
    expect((await again.json()).invitation).toMatchObject({ status: "confirmed", confirmedGuests: 1 });
  });

  it("no permite superar el cupo: 400 con mensaje claro y sin cambios", async () => {
    const { token } = await seed("Familia Pérez", 2);
    const before = await readRaw(file);

    const response = await doPost(token, { status: "confirmed", confirmedGuests: 3 });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION", message: "Tu invitación admite hasta 2 personas." },
    });
    expect(await readRaw(file)).toBe(before);
  });

  it("no confía en un cupo enviado por el navegador", async () => {
    const { token } = await seed("Familia Pérez", 2);
    const before = await readRaw(file);

    const response = await doPost(token, { status: "confirmed", confirmedGuests: 9, allowedGuests: 99 });
    expect(response.status).toBe(400);
    expect(await readRaw(file)).toBe(before);
  });

  it.each([
    ["volver a pending", { status: "pending", confirmedGuests: 0 }],
    ["confirmar con 0", { status: "confirmed", confirmedGuests: 0 }],
    ["rechazar con asistentes", { status: "declined", confirmedGuests: 1 }],
    ["cantidad negativa", { status: "confirmed", confirmedGuests: -1 }],
    ["cantidad como texto", { status: "confirmed", confirmedGuests: "2" }],
    ["campo extra", { status: "confirmed", confirmedGuests: 1, tokenHash: "x" }],
    ["arreglo", []],
    ["null", null],
  ])("entrada inválida → 400: %s", async (_name, body) => {
    const { token } = await seed();
    const before = await readRaw(file);

    const response = await doPost(token, body);
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBeTruthy();
    expect(await readRaw(file)).toBe(before);
  });

  it("enlace inválido → 404", async () => {
    await seed();
    const response = await doPost("A".repeat(43), { status: "declined", confirmedGuests: 0 });
    expect(response.status).toBe(404);
    expect((await response.json()).error.message).toBe(PUBLIC_MESSAGES.invalidLink);
  });

  describe("protección de las solicitudes que modifican datos", () => {
    it.each([
      ["sin Origin", { origin: null }],
      ["Origin de otro sitio", { origin: "https://evil.example" }],
      ["Origin con otro puerto", { origin: "http://localhost:4000" }],
    ])("%s → 403 y sin cambios", async (_name, options) => {
      const { token } = await seed();
      const before = await readRaw(file);

      const response = await doPost(token, { status: "confirmed", confirmedGuests: 1 }, options);
      expect(response.status).toBe(403);
      expect(await readRaw(file)).toBe(before);
    });

    it("acepta el dominio público detrás del proxy (x-forwarded-host) y APP_BASE_URL", async () => {
      const { token } = await seed();
      const proxied = await doPost(
        token,
        { status: "confirmed", confirmedGuests: 1 },
        {
          origin: "https://boda.example.com",
          headers: { "x-forwarded-host": "boda.example.com", "x-forwarded-proto": "https" },
        },
      );
      expect(proxied.status).toBe(200);

      vi.stubEnv("APP_BASE_URL", "https://boda.example.com/");
      const viaBase = await doPost(
        token,
        { status: "declined", confirmedGuests: 0 },
        { origin: "https://boda.example.com" },
      );
      expect(viaBase.status).toBe(200);
    });

    it.each([
      ["text/plain", "text/plain"],
      ["formulario", "application/x-www-form-urlencoded"],
      ["sin tipo", null],
    ])("Content-Type %s → 415", async (_name, contentType) => {
      const { token } = await seed();
      const before = await readRaw(file);

      const response = await doPost(token, { status: "confirmed", confirmedGuests: 1 }, { contentType });
      expect(response.status).toBe(415);
      expect(await readRaw(file)).toBe(before);
    });

    it("JSON malformado → 400", async () => {
      const { token } = await seed();
      const response = await doPost(token, null, { raw: "{ no es json" });
      expect(response.status).toBe(400);
    });

    it("cuerpo demasiado grande → 413", async () => {
      const { token } = await seed();
      const big = JSON.stringify({ status: "confirmed", confirmedGuests: 1, padding: "x".repeat(5000) });
      const response = await doPost(token, null, { raw: big });
      expect(response.status).toBe(413);
    });
  });

  describe("límites de uso", () => {
    const body = { status: "declined", confirmedGuests: 0 };

    it("limita los envíos por cliente (20/min) y avisa cuándo reintentar", async () => {
      const { token } = await seed();
      const headers = { "x-forwarded-for": "203.0.113.7" };

      // El límite por token (10/min) es menor: se usan tokens distintos e inválidos para contar solo por cliente.
      let last: Response | undefined;
      for (let i = 0; i < 21; i++) {
        last = await doPost(`${"B".repeat(42)}${i % 10}`, body, { headers });
      }
      expect(last?.status).toBe(429);
      expect(Number(last?.headers.get("retry-after"))).toBeGreaterThan(0);
      expect((await last!.json()).error.message).toBe(PUBLIC_MESSAGES.tooManyRequests);

      // Otro cliente no se ve afectado.
      const other = await doPost(token, body, { headers: { "x-forwarded-for": "198.51.100.9" } });
      expect(other.status).toBe(200);
    });

    it("limita los envíos por invitación (10/min) aunque cambie la IP", async () => {
      const { token } = await seed();
      const statuses: number[] = [];
      for (let i = 0; i < 12; i++) {
        const response = await doPost(token, body, { headers: { "x-forwarded-for": `198.51.100.${i}` } });
        statuses.push(response.status);
      }
      expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
      expect(statuses.slice(10)).toEqual([429, 429]);
    });

    it("una IP falsa al inicio de X-Forwarded-For no evade el límite", async () => {
      for (let i = 0; i < 20; i++) {
        await doPost(`${"C".repeat(42)}${i % 10}`, body, {
          headers: { "x-forwarded-for": `10.0.0.${i}, 203.0.113.50` },
        });
      }
      const blocked = await doPost("C".repeat(43), body, {
        headers: { "x-forwarded-for": "10.9.9.9, 203.0.113.50" },
      });
      expect(blocked.status).toBe(429);
    });

    it("limita también las consultas (120/min)", async () => {
      let last: Response | undefined;
      for (let i = 0; i < 121; i++) last = await doGet("A".repeat(43), { "x-forwarded-for": "203.0.113.20" });
      expect(last?.status).toBe(429);
    });
  });

  it("respuestas simultáneas: solo se aceptan las que caben en el cupo y el estado final es válido", async () => {
    const { token } = await seed("Familia Pérez", 3);

    const responses = await Promise.all(
      [1, 2, 3, 4, 5, 6].map((n) =>
        doPost(token, { status: "confirmed", confirmedGuests: n }, { headers: { "x-forwarded-for": `192.0.2.${n}` } }),
      ),
    );

    expect(responses.map((r) => r.status)).toEqual([200, 200, 200, 400, 400, 400]);
    const stored = JSON.parse(await readRaw(file)).guests[0];
    expect(stored).toMatchObject({ status: "confirmed", confirmedGuests: 3 });
  });
});

describe("errores del servidor", () => {
  it("un archivo corrupto → 500 genérico, sin detalles, y el archivo no se toca", async () => {
    await writeFile(file, '{ "schemaVersion": 1, "guests": [ roto', "utf8");

    for (const response of [
      await doGet("A".repeat(43)),
      await doPost("A".repeat(43), { status: "declined", confirmedGuests: 0 }),
    ]) {
      expect(response.status).toBe(500);
      const text = await response.text();
      expect(JSON.parse(text).error.message).toBe(PUBLIC_MESSAGES.server);
      expect(text).not.toContain(file);
      expect(text).not.toMatch(/schemaVersion|roto|JSON|DATA_CORRUPTION.*guests/);
    }
    expect(await readRaw(file)).toBe('{ "schemaVersion": 1, "guests": [ roto');
  });

  it("sin DATA_FILE_PATH → 500 genérico", async () => {
    vi.stubEnv("DATA_FILE_PATH", "");
    const response = await doGet("A".repeat(43));
    expect(response.status).toBe(500);
    expect((await response.text())).not.toContain("DATA_FILE_PATH");
  });

  it("un error inesperado no filtra su mensaje al cliente", async () => {
    vi.spyOn(GuestService.prototype, "getPublicInvitation").mockRejectedValue(
      new Error("secreto C:\\data\\guests.json token=abc"),
    );
    const response = await doGet("A".repeat(43));
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).not.toContain("secreto");
    expect(text).not.toContain("guests.json");
    expect(console.error).toHaveBeenCalledWith("[http] UNEXPECTED");
  });

  it("los logs no incluyen el token", async () => {
    vi.spyOn(GuestService.prototype, "submitResponse").mockRejectedValue(new Error("falla"));
    const token = "T".repeat(43);
    await doPost(token, { status: "declined", confirmedGuests: 0 });

    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).not.toContain(token);
  });
});
