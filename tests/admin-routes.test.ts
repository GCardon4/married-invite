import { hash } from "@node-rs/argon2";
import { randomBytes } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import * as loginRoute from "@/app/api/admin/login/route";
import * as logoutRoute from "@/app/api/admin/logout/route";
import * as enlaceRoute from "@/app/api/admin/invitados/[id]/enlace/route";
import * as itemRoute from "@/app/api/admin/invitados/[id]/route";
import * as listRoute from "@/app/api/admin/invitados/route";
import { GET as publicGet } from "@/app/api/public/invitaciones/[token]/route";
import { getGuestService } from "@/lib/guest-service";
import { resetAdminRateLimiters, resetPublicRateLimiters } from "@/lib/rate-limit";
import { getSessionStore } from "@/lib/session";

import { newDataFile, readRaw } from "./helpers";

const ORIGIN = "http://localhost:3000";
// Generados al ejecutar (no escritos en el código) para no parecer credenciales reales.
const PASSWORD = randomBytes(18).toString("base64url");
const WRONG_SECRET = randomBytes(18).toString("base64url");
const SECRET = "s".repeat(48);

let passwordHash: string;
let file: string;

beforeAll(async () => {
  passwordHash = await hash(PASSWORD);
});

beforeEach(async () => {
  file = await newDataFile();
  vi.stubEnv("DATA_FILE_PATH", file);
  vi.stubEnv("SESSION_SECRET", SECRET);
  vi.stubEnv("ADMIN_PASSWORD_HASH", passwordHash);
  vi.stubEnv("APP_BASE_URL", "https://boda.example.com");
  getSessionStore().clear();
  resetAdminRateLimiters();
  resetPublicRateLimiters();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// --- Utilidades ---------------------------------------------------------------

interface Options {
  body?: unknown;
  raw?: string;
  cookie?: string;
  origin?: string | null;
  contentType?: string | null;
  headers?: Record<string, string>;
}

function request(method: string, route: string, options: Options = {}) {
  const { body, raw, cookie, origin = ORIGIN, contentType = "application/json", headers = {} } = options;
  const hasBody = body !== undefined || raw !== undefined;
  return new Request(`${ORIGIN}${route}`, {
    method,
    headers: {
      ...(origin ? { origin } : {}),
      ...(cookie ? { cookie } : {}),
      ...(hasBody && contentType ? { "content-type": contentType } : {}),
      ...headers,
    },
    body: hasBody ? (raw ?? JSON.stringify(body)) : undefined,
  });
}

const idCtx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;

const api = {
  login: (options?: Options) => loginRoute.POST(request("POST", "/api/admin/login", options)),
  logout: (options?: Options) => logoutRoute.POST(request("POST", "/api/admin/logout", options)),
  list: (query = "", options?: Options) => listRoute.GET(request("GET", `/api/admin/invitados${query}`, options)),
  create: (body: unknown, options?: Options) =>
    listRoute.POST(request("POST", "/api/admin/invitados", { ...options, body })),
  get: (id: string, options?: Options) =>
    itemRoute.GET(request("GET", `/api/admin/invitados/${id}`, options), idCtx(id)),
  patch: (id: string, body: unknown, options?: Options) =>
    itemRoute.PATCH(request("PATCH", `/api/admin/invitados/${id}`, { ...options, body }), idCtx(id)),
  remove: (id: string, options?: Options) =>
    itemRoute.DELETE(request("DELETE", `/api/admin/invitados/${id}`, options), idCtx(id)),
  regenerate: (id: string, options?: Options) =>
    enlaceRoute.POST(request("POST", `/api/admin/invitados/${id}/enlace`, options), idCtx(id)),
};

function cookieOf(response: Response): string {
  return (response.headers.get("set-cookie") ?? "").split(";")[0];
}

async function loginCookie(): Promise<string> {
  const response = await api.login({ body: { password: PASSWORD } });
  expect(response.status).toBe(200);
  return cookieOf(response);
}

async function seed(name = "Familia Pérez", allowedGuests = 3) {
  return getGuestService().createGuest({ name, email: "perez@example.com", phone: "+57 300 111", allowedGuests });
}

const tokenOf = (link: string) => link.split("/invitacion/")[1];

// --- Todos los endpoints exigen sesión ------------------------------------------

describe("endpoints administrativos sin sesión → 401", () => {
  const ID = "guest_0123456789abcdef";

  // Cada solicitud es válida en todo (origen, tipo y cuerpo): solo falta la sesión.
  const calls: [string, (cookie?: string) => Promise<Response>][] = [
    ["GET /api/admin/invitados", (cookie) => api.list("", { cookie })],
    ["POST /api/admin/invitados", (cookie) => api.create({ name: "X", allowedGuests: 1 }, { cookie })],
    ["GET /api/admin/invitados/[id]", (cookie) => api.get(ID, { cookie })],
    ["PATCH /api/admin/invitados/[id]", (cookie) => api.patch(ID, { name: "Y" }, { cookie })],
    ["DELETE /api/admin/invitados/[id]", (cookie) => api.remove(ID, { cookie })],
    ["POST /api/admin/invitados/[id]/enlace", (cookie) => api.regenerate(ID, { cookie })],
  ];

  async function expectDenied(call: (cookie?: string) => Promise<Response>, cookie?: string) {
    const before = await readRaw(file).catch(() => null);
    const response = await call(cookie);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "Debes iniciar sesión para continuar." },
    });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await readRaw(file).catch(() => null)).toBe(before);
  }

  describe.each(calls)("%s", (_name, call) => {
    it("sin cookie", () => expectDenied(call));

    it("con una cookie inventada", () => expectDenied(call, "admin_session=abc.def"));

    it("con una cookie bien formada pero firmada con otro secreto", async () => {
      const forged = getSessionStore().create().cookieValue;
      vi.stubEnv("SESSION_SECRET", "z".repeat(48));
      await expectDenied(call, `admin_session=${forged}`);
    });

    it("con una cookie de una sesión ya cerrada", async () => {
      const cookie = await loginCookie();
      await api.logout({ cookie });
      await expectDenied(call, cookie);
    });

    it("con una sesión vencida", async () => {
      const cookie = await loginCookie();
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(Date.now() + 9 * 60 * 60 * 1000);
      await expectDenied(call, cookie);
    });
  });

  it("una sesión válida sí pasa (control: la prueba distingue ambos casos)", async () => {
    const cookie = await loginCookie();
    expect((await api.list("", { cookie })).status).toBe(200);
  });

  it("sin SESSION_SECRET configurado nadie puede entrar", async () => {
    const cookie = await loginCookie();
    vi.stubEnv("SESSION_SECRET", "");
    await expectDenied(calls[0][1], cookie);
  });
});

describe("guardia estructural: ningún endpoint administrativo omite withAdmin", () => {
  const ROOT = path.resolve(__dirname, "../src/app/api/admin");

  async function routeFiles(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map((entry) =>
        entry.isDirectory() ? routeFiles(path.join(dir, entry.name)) : entry.name === "route.ts" ? [path.join(dir, entry.name)] : [],
      ),
    );
    return nested.flat();
  }

  it("el conjunto de rutas es el revisado (una ruta nueva exige actualizar esta prueba)", async () => {
    const files = (await routeFiles(ROOT)).map((f) => path.relative(ROOT, f).replaceAll("\\", "/")).sort();
    expect(files).toEqual([
      "invitados/[id]/enlace/route.ts",
      "invitados/[id]/route.ts",
      "invitados/route.ts",
      "login/route.ts",
      "logout/route.ts",
    ]);
  });

  it("cada manejador de las rutas protegidas pasa por withAdmin", async () => {
    const protectedFiles = (await routeFiles(ROOT)).filter((f) => !/[\\/](login|logout)[\\/]/.test(f));
    expect(protectedFiles.length).toBe(3);

    for (const f of protectedFiles) {
      const source = await readFile(f, "utf8");
      const handlers = source.match(/export (?:async )?function (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g) ?? [];
      const guarded = source.match(/return withAdmin\(request, \{ mutating: (true|false) \}/g) ?? [];

      expect(handlers.length, f).toBeGreaterThan(0);
      expect(guarded.length, f).toBe(handlers.length);
      // Una operación que modifica datos debe declararlo para que se compruebe el origen.
      for (const handler of source.matchAll(/export function (GET|POST|PATCH|PUT|DELETE)[\s\S]*?withAdmin\(request, \{ mutating: (true|false) \}/g)) {
        expect(handler[2] === "true", `${f} ${handler[1]}`).toBe(handler[1] !== "GET");
      }
    }
  });
});

// --- Inicio y cierre de sesión ------------------------------------------------

describe("POST /api/admin/login", () => {
  it("con la contraseña correcta crea una sesión con cookie segura", async () => {
    const response = await api.login({ body: { password: PASSWORD } });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("cache-control")).toBe("no-store");
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/^admin_session=[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+;/);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=28800");
    expect(getSessionStore().size).toBe(1);
  });

  it("en producción la cookie es Secure y usa el prefijo __Host-", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await api.login({ body: { password: PASSWORD } });
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(setCookie).toMatch(/^__Host-admin_session=/);
    expect(setCookie).toContain("Secure");
    expect(setCookie).not.toContain("Domain");
  });

  it("la contraseña incorrecta da un 401 genérico, sin cookie ni sesión", async () => {
    const response = await api.login({ body: { password: "incorrecta" } });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "UNAUTHORIZED", message: "Contraseña incorrecta." } });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(getSessionStore().size).toBe(0);
  });

  it.each([
    ["sin contraseña", { body: {} }],
    ["contraseña vacía", { body: { password: "" } }],
    ["contraseña que no es texto", { body: { password: 1234 } }],
    ["contraseña enorme", { body: { password: "a".repeat(201) } }],
    ["campos extra", { body: { password: PASSWORD, admin: true } }],
    ["JSON malformado", { raw: "{ no es json" }],
  ])("entrada inválida (%s) → 400 sin sesión", async (_name, options) => {
    const response = await api.login(options as Options);
    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(getSessionStore().size).toBe(0);
  });

  it("exige Origin del propio sitio y Content-Type JSON", async () => {
    const body = { password: PASSWORD };
    expect((await api.login({ body, origin: null })).status).toBe(403);
    expect((await api.login({ body, origin: "https://evil.example" })).status).toBe(403);
    expect((await api.login({ body, contentType: "application/x-www-form-urlencoded" })).status).toBe(415);
    expect(getSessionStore().size).toBe(0);
  });

  it("limita los intentos por cliente (10) y avisa cuándo reintentar", async () => {
    const headers = { "x-forwarded-for": "203.0.113.5" };
    const statuses: number[] = [];
    let last!: Response;
    for (let i = 0; i < 11; i++) {
      last = await api.login({ body: { password: `mal-${i}` }, headers });
      statuses.push(last.status);
    }

    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
    expect(Number(last.headers.get("retry-after"))).toBeGreaterThan(0);

    // Con el cliente bloqueado, ni siquiera la contraseña correcta entra.
    expect((await api.login({ body: { password: PASSWORD }, headers })).status).toBe(429);
    // Otro cliente no se ve afectado.
    expect((await api.login({ body: { password: PASSWORD }, headers: { "x-forwarded-for": "198.51.100.1" } })).status).toBe(200);
  });

  it("limita el total de intentos aunque cambie la IP (fuerza bruta distribuida)", async () => {
    let last!: Response;
    for (let i = 0; i < 101; i++) {
      last = await api.login({ body: {}, headers: { "x-forwarded-for": `10.1.${Math.floor(i / 250)}.${i}` } });
    }
    expect(last.status).toBe(429);
  });

  it.each([
    ["ADMIN_PASSWORD_HASH sin definir", ""],
    ["ADMIN_PASSWORD_HASH que no es Argon2id", "contrasena-en-texto-plano"],
  ])("%s → 500 genérico; el motivo se registra sin secretos", async (_name, value) => {
    vi.stubEnv("ADMIN_PASSWORD_HASH", value);
    const response = await api.login({ body: { password: WRONG_SECRET } });
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).not.toContain("ADMIN_PASSWORD_HASH");
    expect(text).not.toContain(WRONG_SECRET);
    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).toContain("CONFIGURATION");
    expect(logged).not.toContain(WRONG_SECRET);
  });

  it("sin SESSION_SECRET válido no se crea ninguna sesión (500 genérico)", async () => {
    vi.stubEnv("SESSION_SECRET", "corto");
    const response = await api.login({ body: { password: PASSWORD } });

    expect(response.status).toBe(500);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(getSessionStore().size).toBe(0);
  });

  it("cada inicio de sesión crea una sesión nueva (no reutiliza la anterior)", async () => {
    const a = await loginCookie();
    const b = await loginCookie();
    expect(a).not.toBe(b);
  });
});

describe("POST /api/admin/logout", () => {
  it("invalida la sesión en el servidor y limpia la cookie", async () => {
    const cookie = await loginCookie();
    expect((await api.list("", { cookie })).status).toBe(200);

    const response = await api.logout({ cookie });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toMatch(/^admin_session=; .*Max-Age=0/);
    expect(getSessionStore().size).toBe(0);

    // La cookie anterior, aunque alguien la conserve, ya no sirve.
    expect((await api.list("", { cookie })).status).toBe(401);
  });

  it("es idempotente y no revela si había sesión", async () => {
    expect((await api.logout()).status).toBe(200);
    expect((await api.logout({ cookie: "admin_session=falsa.cookie" })).status).toBe(200);
  });

  it("cerrar una sesión no cierra las demás", async () => {
    const a = await loginCookie();
    const b = await loginCookie();
    await api.logout({ cookie: a });
    expect((await api.list("", { cookie: b })).status).toBe(200);
  });

  it("rechaza solicitudes de otro origen", async () => {
    const cookie = await loginCookie();
    expect((await api.logout({ cookie, origin: "https://evil.example" })).status).toBe(403);
    expect((await api.logout({ cookie, origin: null })).status).toBe(403);
    expect((await api.list("", { cookie })).status).toBe(200);
  });
});

// --- CRUD con sesión ----------------------------------------------------------

describe("CRUD de invitados (con sesión)", () => {
  let cookie: string;

  beforeEach(async () => {
    cookie = await loginCookie();
  });

  describe("crear", () => {
    it("201 con el enlace completo; el token solo existe en esa respuesta y en el enlace", async () => {
      const response = await api.create({ name: "  Familia Gómez ", email: "GOMEZ@Example.com", allowedGuests: 4 }, { cookie });
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(body.guest).toMatchObject({
        name: "Familia Gómez",
        email: "gomez@example.com",
        phone: null,
        allowedGuests: 4,
        confirmedGuests: 0,
        status: "pending",
        respondedAt: null,
      });
      expect(body.guest).not.toHaveProperty("tokenHash");
      expect(body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(body.link).toBe(`https://boda.example.com/invitacion/${body.token}`);

      // Solo se guarda el hash.
      const stored = await readRaw(file);
      expect(stored).not.toContain(body.token);
      expect(stored).toContain("tokenHash");
    });

    it("el enlace generado funciona en la API pública", async () => {
      const { link } = await (await api.create({ name: "Ana", allowedGuests: 2 }, { cookie })).json();
      const response = await publicGet(
        new Request(`${ORIGIN}/api/public/invitaciones/${tokenOf(link)}`),
        { params: Promise.resolve({ token: tokenOf(link) }) } as never,
      );

      expect(response.status).toBe(200);
      expect((await response.json()).invitation).toMatchObject({ name: "Ana", allowedGuests: 2, status: "pending" });
    });

    it("sin APP_BASE_URL usa el dominio de la solicitud (también detrás de un proxy)", async () => {
      vi.stubEnv("APP_BASE_URL", "");
      const direct = await (await api.create({ name: "A", allowedGuests: 1 }, { cookie })).json();
      expect(direct.link).toMatch(/^http:\/\/localhost:3000\/invitacion\//);

      const proxied = await (
        await api.create(
          { name: "B", allowedGuests: 1 },
          { cookie, origin: "https://boda.example.org", headers: { "x-forwarded-host": "boda.example.org", "x-forwarded-proto": "https" } },
        )
      ).json();
      expect(proxied.link).toMatch(/^https:\/\/boda\.example\.org\/invitacion\//);
    });

    it.each([
      ["sin cuerpo", {}],
      ["nombre vacío", { name: "  ", allowedGuests: 1 }],
      ["cupo cero", { name: "A", allowedGuests: 0 }],
      ["cupo decimal", { name: "A", allowedGuests: 1.5 }],
      ["correo inválido", { name: "A", email: "x", allowedGuests: 1 }],
      ["estado enviado por el cliente", { name: "A", allowedGuests: 1, status: "confirmed" }],
      ["hash enviado por el cliente", { name: "A", allowedGuests: 1, tokenHash: "a".repeat(64) }],
      ["identificador enviado por el cliente", { name: "A", allowedGuests: 1, id: "guest_x" }],
    ])("rechaza %s con 400 y mensajes en español", async (_name, body) => {
      const before = await readRaw(file).catch(() => null);
      const response = await api.create(body, { cookie });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe("VALIDATION");
      expect(json.error.issues.length).toBeGreaterThan(0);
      expect(JSON.stringify(json)).not.toMatch(/Invalid|expected|Required/);
      expect(await readRaw(file).catch(() => null)).toBe(before);
    });

    it("indica el campo con error (para mostrarlo junto al campo)", async () => {
      const json = await (await api.create({ name: "A", email: "no-es-correo", allowedGuests: 1 }, { cookie })).json();
      expect(json.error.issues).toContainEqual({ path: "email", message: "Correo electrónico inválido." });
    });
  });

  describe("listar, buscar y filtrar", () => {
    beforeEach(async () => {
      const ana = await seed("Ana Gómez", 2);
      await seed("Beto Ruiz", 1);
      await seed("Carla Gómez", 4);
      await getGuestService().submitResponse(ana.token, { status: "confirmed", confirmedGuests: 2 });
    });

    it("devuelve todos con paginación y sin tokenHash", async () => {
      const response = await api.list("", { cookie });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({ total: 3, page: 1, limit: 50 });
      expect(body.items.map((g: { name: string }) => g.name)).toEqual(["Ana Gómez", "Beto Ruiz", "Carla Gómez"]);
      expect(JSON.stringify(body)).not.toContain("tokenHash");
    });

    it("busca por nombre, correo o teléfono sin distinguir mayúsculas", async () => {
      const names = async (query: string) =>
        (await (await api.list(query, { cookie })).json()).items.map((g: { name: string }) => g.name);

      expect(await names("?search=g%C3%93mez")).toEqual(["Ana Gómez", "Carla Gómez"]);
      expect(await names("?search=perez%40example")).toHaveLength(3);
      expect(await names("?search=300%20111")).toHaveLength(3);
      expect(await names("?search=zzz")).toEqual([]);
    });

    it("filtra por estado e ignora un filtro vacío (opción «Todos»)", async () => {
      const total = async (query: string) => (await (await api.list(query, { cookie })).json()).total;

      expect(await total("?status=pending")).toBe(2);
      expect(await total("?status=confirmed")).toBe(1);
      expect(await total("?status=declined")).toBe(0);
      expect(await total("?status=&search=")).toBe(3);
    });

    it("pagina", async () => {
      const body = await (await api.list("?page=2&limit=2", { cookie })).json();
      expect(body).toMatchObject({ total: 3, page: 2, limit: 2 });
      expect(body.items).toHaveLength(1);
    });

    it.each([["?status=otro"], ["?limit=500"], ["?page=0"], ["?page=abc"]])("rechaza %s con 400", async (query) => {
      expect((await api.list(query, { cookie })).status).toBe(400);
    });
  });

  describe("consultar", () => {
    it("200 con los datos administrativos y sin tokenHash", async () => {
      const { guest } = await seed();
      const response = await api.get(guest.id, { cookie });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.guest).toMatchObject({ id: guest.id, name: "Familia Pérez", email: "perez@example.com", phone: "+57 300 111" });
      expect(body.guest).not.toHaveProperty("tokenHash");
    });

    it("404 con un mensaje para el administrador si no existe, 400 si el id es inválido", async () => {
      await seed();
      const missing = await api.get("guest_0123456789abcdef", { cookie });
      expect(missing.status).toBe(404);
      expect((await missing.json()).error.message).toBe("Invitación no encontrada.");

      expect((await api.get("..%2F..%2Fetc", { cookie })).status).toBe(400);
      expect((await api.get("x", { cookie })).status).toBe(400);
    });
  });

  describe("actualizar", () => {
    it("modifica solo los campos enviados", async () => {
      const { guest } = await seed("Familia Pérez", 3);
      const response = await api.patch(guest.id, { name: "Familia Pérez Gómez", allowedGuests: 5 }, { cookie });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.guest).toMatchObject({ name: "Familia Pérez Gómez", allowedGuests: 5, email: "perez@example.com", phone: "+57 300 111" });
      expect(body.guest).not.toHaveProperty("tokenHash");
      expect(body.guest.updatedAt >= guest.updatedAt).toBe(true);
    });

    it("una cadena vacía borra el correo o el teléfono", async () => {
      const { guest } = await seed();
      const body = await (await api.patch(guest.id, { email: "", phone: "" }, { cookie })).json();
      expect(body.guest).toMatchObject({ email: null, phone: null });
    });

    it("no permite un cupo menor que los asistentes ya confirmados (409)", async () => {
      const { guest, token } = await seed("Familia Pérez", 4);
      await getGuestService().submitResponse(token, { status: "confirmed", confirmedGuests: 3 });
      const before = await readRaw(file);

      const response = await api.patch(guest.id, { allowedGuests: 2 }, { cookie });
      expect(response.status).toBe(409);
      expect((await response.json()).error.message).toBe("El cupo no puede ser menor que los asistentes ya confirmados.");
      expect(await readRaw(file)).toBe(before);
    });

    it.each([
      ["vacío", {}],
      ["estado", { status: "confirmed" }],
      ["asistentes confirmados", { confirmedGuests: 5 }],
      ["hash del token", { tokenHash: "a".repeat(64) }],
      ["identificador", { id: "guest_otro" }],
      ["fechas", { respondedAt: "2026-10-05T00:00:00.000Z" }],
      ["correo inválido", { email: "no-es-correo" }],
    ])("rechaza modificar %s (400)", async (_name, body) => {
      const { guest } = await seed();
      const before = await readRaw(file);

      expect((await api.patch(guest.id, body, { cookie })).status).toBe(400);
      expect(await readRaw(file)).toBe(before);
    });

    it("404 si no existe", async () => {
      expect((await api.patch("guest_0123456789abcdef", { name: "X" }, { cookie })).status).toBe(404);
    });
  });

  describe("eliminar", () => {
    it("elimina la invitación y su enlace deja de funcionar", async () => {
      const { guest, token } = await seed();
      const response = await api.remove(guest.id, { cookie });

      expect(response.status).toBe(200);
      expect((await api.get(guest.id, { cookie })).status).toBe(404);
      expect((await api.remove(guest.id, { cookie })).status).toBe(404);

      const publicResponse = await publicGet(new Request(`${ORIGIN}/api/public/invitaciones/${token}`), {
        params: Promise.resolve({ token }),
      } as never);
      expect(publicResponse.status).toBe(404);
    });

    it("no afecta a las demás invitaciones", async () => {
      const a = await seed("Ana", 1);
      await seed("Beto", 1);
      await api.remove(a.guest.id, { cookie });

      const body = await (await api.list("", { cookie })).json();
      expect(body.items.map((g: { name: string }) => g.name)).toEqual(["Beto"]);
    });
  });

  describe("regenerar el enlace", () => {
    it("invalida el enlace anterior, entrega uno nuevo y conserva la respuesta", async () => {
      const { guest, token: oldToken } = await seed("Familia Pérez", 3);
      await getGuestService().submitResponse(oldToken, { status: "confirmed", confirmedGuests: 2 });

      const response = await api.regenerate(guest.id, { cookie });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.token).not.toBe(oldToken);
      expect(body.link).toBe(`https://boda.example.com/invitacion/${body.token}`);
      expect(body.guest).toMatchObject({ status: "confirmed", confirmedGuests: 2 });
      expect(body.guest).not.toHaveProperty("tokenHash");
      expect(await readRaw(file)).not.toContain(body.token);

      const publicWith = (token: string) =>
        publicGet(new Request(`${ORIGIN}/api/public/invitaciones/${token}`), { params: Promise.resolve({ token }) } as never);
      expect((await publicWith(oldToken)).status).toBe(404);
      expect((await publicWith(body.token)).status).toBe(200);
    });

    it("404 si la invitación no existe", async () => {
      expect((await api.regenerate("guest_0123456789abcdef", { cookie })).status).toBe(404);
    });
  });

  describe("protección de las operaciones que modifican datos", () => {
    it.each([
      ["sin Origin", null],
      ["con Origin de otro sitio", "https://evil.example"],
    ])("rechaza con 403 %s, aunque haya sesión válida, y no cambia nada", async (_name, origin) => {
      const { guest } = await seed();
      const before = await readRaw(file);

      const responses = await Promise.all([
        api.create({ name: "X", allowedGuests: 1 }, { cookie, origin }),
        api.patch(guest.id, { name: "Hackeado" }, { cookie, origin }),
        api.remove(guest.id, { cookie, origin }),
        api.regenerate(guest.id, { cookie, origin }),
      ]);

      expect(responses.map((r) => r.status)).toEqual([403, 403, 403, 403]);
      expect(await readRaw(file)).toBe(before);
    });

    it("exige Content-Type JSON al crear o modificar (415)", async () => {
      const { guest } = await seed();
      const text = { cookie, contentType: "text/plain" };
      expect((await api.create({ name: "X", allowedGuests: 1 }, text)).status).toBe(415);
      expect((await api.patch(guest.id, { name: "X" }, text)).status).toBe(415);
    });

    it("limita el tamaño del cuerpo (413) y rechaza JSON malformado (400)", async () => {
      expect((await api.create(undefined, { cookie, raw: JSON.stringify({ name: "x".repeat(5000), allowedGuests: 1 }) })).status).toBe(413);
      expect((await api.create(undefined, { cookie, raw: "{ no es json" })).status).toBe(400);
    });

    it("las lecturas no exigen Origin (un GET no modifica datos)", async () => {
      expect((await api.list("", { cookie, origin: null })).status).toBe(200);
    });
  });

  describe("errores del servidor", () => {
    it("un archivo corrupto → 500 genérico y el archivo no se toca", async () => {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(file, '{ "schemaVersion": 1, "guests": [ roto', "utf8");

      const response = await api.create({ name: "X", allowedGuests: 1 }, { cookie });
      const text = await response.text();

      expect(response.status).toBe(500);
      expect(text).not.toContain(file);
      expect(text).not.toMatch(/schemaVersion|roto|DATA_CORRUPTION/);
      expect(await readRaw(file)).toBe('{ "schemaVersion": 1, "guests": [ roto');
    });
  });

  it("ninguna respuesta administrativa contiene hashes de token ni se cachea", async () => {
    const { guest } = await seed();
    const stored = JSON.parse(await readRaw(file)).guests[0].tokenHash as string;

    const responses = [
      await api.list("", { cookie }),
      await api.get(guest.id, { cookie }),
      await api.patch(guest.id, { name: "Nuevo" }, { cookie }),
      await api.regenerate(guest.id, { cookie }),
      await api.create({ name: "Otro", allowedGuests: 1 }, { cookie }),
    ];

    for (const response of responses) {
      expect(response.headers.get("cache-control")).toBe("no-store");
      const text = await response.text();
      expect(text).not.toContain("tokenHash");
      expect(text).not.toContain(stored);
    }
  });
});

// --- Envío por WhatsApp --------------------------------------------------------

describe("envío por WhatsApp desde el panel", () => {
  let cookie: string;

  beforeEach(async () => {
    cookie = await loginCookie();
  });

  const messageOf = (whatsappUrl: string) => new URL(whatsappUrl).searchParams.get("text") ?? "";

  it("al crear con teléfono devuelve el enlace de WhatsApp con el número normalizado y el enlace de la invitación", async () => {
    const body = await (await api.create({ name: "Ana Gómez", phone: "300 123 4567", allowedGuests: 2 }, { cookie })).json();
    const url = new URL(body.whatsappUrl);

    expect(url.origin + url.pathname).toBe("https://wa.me/573001234567");
    expect(messageOf(body.whatsappUrl)).toContain(body.link);
    expect(messageOf(body.whatsappUrl)).toContain("Ana Gómez");
    expect(body.link).toBe(`https://boda.example.com/invitacion/${body.token}`);
  });

  it("acepta un teléfono con prefijo internacional", async () => {
    const body = await (await api.create({ name: "Beto", phone: "+1 415 555 2671", allowedGuests: 1 }, { cookie })).json();
    expect(new URL(body.whatsappUrl).pathname).toBe("/14155552671");
  });

  it.each([
    ["sin teléfono", { name: "Carla", allowedGuests: 1 }],
    ["con teléfono vacío", { name: "Carla", phone: "", allowedGuests: 1 }],
    ["con un teléfono que no se puede interpretar", { name: "Carla", phone: "300123", allowedGuests: 1 }],
    ["con un teléfono con letras", { name: "Carla", phone: "llamar a Carla", allowedGuests: 1 }],
  ])("%s: crea la invitación igual y whatsappUrl es null", async (_name, input) => {
    const response = await api.create(input, { cookie });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.whatsappUrl).toBeNull();
    expect(body.link).toContain("/invitacion/");
  });

  it("al regenerar el enlace, el mensaje lleva el enlace NUEVO y el anterior deja de funcionar", async () => {
    const created = await (await api.create({ name: "Ana", phone: "3001234567", allowedGuests: 2 }, { cookie })).json();
    const regenerated = await (await api.regenerate(created.guest.id, { cookie })).json();

    expect(regenerated.token).not.toBe(created.token);
    expect(messageOf(regenerated.whatsappUrl)).toContain(regenerated.link);
    expect(messageOf(regenerated.whatsappUrl)).not.toContain(created.token);

    const publicWith = (token: string) =>
      publicGet(new Request(`${ORIGIN}/api/public/invitaciones/${token}`), { params: Promise.resolve({ token }) } as never);
    expect((await publicWith(created.token)).status).toBe(404);
    expect((await publicWith(regenerated.token)).status).toBe(200);
  });

  it("regenerar sin teléfono utilizable devuelve whatsappUrl null y el enlace nuevo igualmente", async () => {
    const { guest } = await seed("Sin teléfono", 2);
    await api.patch(guest.id, { phone: "" }, { cookie });

    const body = await (await api.regenerate(guest.id, { cookie })).json();
    expect(body.whatsappUrl).toBeNull();
    expect(body.link).toContain(body.token);
  });

  it("usa WHATSAPP_DEFAULT_COUNTRY_CODE para los números de 10 dígitos", async () => {
    vi.stubEnv("WHATSAPP_DEFAULT_COUNTRY_CODE", "52");
    const body = await (await api.create({ name: "Dora", phone: "5512345678", allowedGuests: 1 }, { cookie })).json();
    expect(new URL(body.whatsappUrl).pathname).toBe("/525512345678");
  });

  it("el mensaje contiene el enlace pero nunca el hash del token", async () => {
    const body = await (await api.create({ name: "Eva", phone: "3001234567", allowedGuests: 1 }, { cookie })).json();
    const stored = JSON.parse(await readRaw(file)).guests.at(-1).tokenHash as string;

    expect(body.whatsappUrl).not.toContain(stored);
    expect(decodeURIComponent(body.whatsappUrl)).not.toContain(stored);
  });

  it("un nombre malicioso no puede alterar el destino ni añadir parámetros al enlace de WhatsApp", async () => {
    const evil = "Eva&phone=999999999&text=x #";
    const body = await (await api.create({ name: evil, phone: "3001234567", allowedGuests: 1 }, { cookie })).json();
    const url = new URL(body.whatsappUrl);

    expect(url.hostname).toBe("wa.me");
    expect(url.pathname).toBe("/573001234567");
    expect([...url.searchParams.keys()]).toEqual(["text"]);
  });

  it("los endpoints siguen exigiendo sesión: sin ella no se genera ningún enlace de WhatsApp", async () => {
    const { guest } = await seed("Frida", 2);
    const before = await readRaw(file);

    const response = await api.regenerate(guest.id);
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain("wa.me");
    expect(await readRaw(file)).toBe(before);
  });
});
