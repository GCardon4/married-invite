import { writeFile } from "node:fs/promises";
import * as fsp from "node:fs/promises";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ConflictError,
  NotFoundError,
  PersistenceError,
  ValidationError,
} from "@/lib/errors";
import { FileGuestRepository } from "@/lib/guest-repository";
import { GuestService } from "@/lib/guest-service";
import { hashToken } from "@/lib/token";

import { newDataFile, readRaw } from "./helpers";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, default: actual, rename: vi.fn(actual.rename) };
});

const renameMock = vi.mocked(fsp.rename);

beforeEach(async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  renameMock.mockReset();
  renameMock.mockImplementation(actual.rename);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

let clock = new Date("2026-10-05T10:00:00.000Z");

async function setup() {
  const file = await newDataFile();
  const service = new GuestService(new FileGuestRepository(file), () => clock);
  return { file, service };
}

beforeEach(() => {
  clock = new Date("2026-10-05T10:00:00.000Z");
});

describe("crear invitación", () => {
  it("devuelve el token una sola vez y persiste solo su hash", async () => {
    const { file, service } = await setup();
    const { guest, token } = await service.createGuest({
      name: "  Familia Pérez ",
      email: "Perez@Example.com",
      allowedGuests: 4,
    });

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(guest).toMatchObject({
      name: "Familia Pérez",
      email: "perez@example.com",
      phone: null,
      allowedGuests: 4,
      confirmedGuests: 0,
      status: "pending",
      respondedAt: null,
      createdAt: "2026-10-05T10:00:00.000Z",
      updatedAt: "2026-10-05T10:00:00.000Z",
    });
    expect(guest.id).toMatch(/^guest_[a-f0-9]{32}$/);
    expect(guest).not.toHaveProperty("tokenHash");

    const raw = await readRaw(file);
    expect(raw).not.toContain(token);
    expect(raw).toContain(hashToken(token));
  });

  it("los tokens son distintos entre invitaciones", async () => {
    const { service } = await setup();
    const tokens = await Promise.all(
      Array.from({ length: 20 }, () => service.createGuest({ name: "X", allowedGuests: 1 })),
    );
    expect(new Set(tokens.map((t) => t.token)).size).toBe(20);
  });

  it.each([
    ["sin nombre", { allowedGuests: 1 }],
    ["nombre vacío", { name: "   ", allowedGuests: 1 }],
    ["cupo 0", { name: "A", allowedGuests: 0 }],
    ["cupo decimal", { name: "A", allowedGuests: 1.5 }],
    ["correo inválido", { name: "A", email: "no-es-correo", allowedGuests: 1 }],
    ["intento de fijar el estado", { name: "A", allowedGuests: 1, status: "confirmed" }],
    ["intento de fijar el hash", { name: "A", allowedGuests: 1, tokenHash: "a".repeat(64) }],
    ["intento de fijar el id", { name: "A", allowedGuests: 1, id: "guest_x" }],
    ["no es un objeto", "texto"],
  ])("rechaza entrada inválida: %s", async (_name, input) => {
    const { file, service } = await setup();
    await expect(service.createGuest(input)).rejects.toBeInstanceOf(ValidationError);
    await expect(readRaw(file)).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("invitación pública", () => {
  it("expone solo los cuatro campos públicos", async () => {
    const { service } = await setup();
    const { token } = await service.createGuest({
      name: "Ana",
      email: "ana@example.com",
      phone: "+57 300",
      allowedGuests: 3,
    });

    const invitation = await service.getPublicInvitation(token);
    expect(invitation).toEqual({
      name: "Ana",
      allowedGuests: 3,
      confirmedGuests: 0,
      status: "pending",
    });
    expect(Object.keys(invitation).sort()).toEqual(
      ["allowedGuests", "confirmedGuests", "name", "status"],
    );
  });

  it.each([["../etc/passwd"], [""], [undefined], [42], ["corto"], ["A".repeat(500)]])(
    "token mal formado (%s) → NotFound",
    async (token) => {
      const { service } = await setup();
      await expect(service.getPublicInvitation(token)).rejects.toBeInstanceOf(NotFoundError);
      await expect(
        service.submitResponse(token, { status: "declined", confirmedGuests: 0 }),
      ).rejects.toBeInstanceOf(NotFoundError);
    },
  );

  it("token válido pero inexistente → NotFound (igual que uno mal formado)", async () => {
    const { service } = await setup();
    await service.createGuest({ name: "Ana", allowedGuests: 1 });
    await expect(service.getPublicInvitation("A".repeat(43))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("un invitado solo ve su propia invitación", async () => {
    const { service } = await setup();
    const a = await service.createGuest({ name: "Ana", allowedGuests: 1 });
    const b = await service.createGuest({ name: "Beto", allowedGuests: 2 });

    expect((await service.getPublicInvitation(a.token)).name).toBe("Ana");
    expect((await service.getPublicInvitation(b.token)).name).toBe("Beto");
  });
});

describe("respuesta del invitado", () => {
  it("confirma dentro del cupo y registra las fechas", async () => {
    const { service } = await setup();
    const { token, guest } = await service.createGuest({ name: "Ana", allowedGuests: 3 });
    clock = new Date("2026-10-06T08:00:00.000Z");

    const result = await service.submitResponse(token, { status: "confirmed", confirmedGuests: 3 });
    expect(result).toEqual({ name: "Ana", allowedGuests: 3, confirmedGuests: 3, status: "confirmed" });

    const stored = await service.getGuest(guest.id);
    expect(stored.respondedAt).toBe("2026-10-06T08:00:00.000Z");
    expect(stored.updatedAt).toBe("2026-10-06T08:00:00.000Z");
    expect(stored.createdAt).toBe("2026-10-05T10:00:00.000Z");
  });

  it("rechaza confirmar por encima del cupo autorizado y no cambia nada", async () => {
    const { file, service } = await setup();
    const { token } = await service.createGuest({ name: "Ana", allowedGuests: 2 });
    const before = await readRaw(file);

    await expect(
      service.submitResponse(token, { status: "confirmed", confirmedGuests: 3 }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(await readRaw(file)).toBe(before);
  });

  it("ignora valores de cupo enviados por el navegador", async () => {
    const { file, service } = await setup();
    const { token } = await service.createGuest({ name: "Ana", allowedGuests: 2 });
    const before = await readRaw(file);

    await expect(
      service.submitResponse(token, { status: "confirmed", confirmedGuests: 5, allowedGuests: 10 }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(await readRaw(file)).toBe(before);
  });

  it.each([
    ["confirmar con 0", { status: "confirmed", confirmedGuests: 0 }],
    ["rechazar con asistentes", { status: "declined", confirmedGuests: 1 }],
    ["volver a pending", { status: "pending", confirmedGuests: 0 }],
    ["negativo", { status: "confirmed", confirmedGuests: -1 }],
    ["decimal", { status: "confirmed", confirmedGuests: 1.5 }],
    ["texto", { status: "confirmed", confirmedGuests: "2" }],
  ])("rechaza respuesta inválida: %s", async (_name, input) => {
    const { service } = await setup();
    const { token } = await service.createGuest({ name: "Ana", allowedGuests: 2 });
    await expect(service.submitResponse(token, input)).rejects.toBeInstanceOf(ValidationError);
  });

  it("permite cambiar la respuesta después (confirmar → rechazar)", async () => {
    const { service } = await setup();
    const { token } = await service.createGuest({ name: "Ana", allowedGuests: 2 });

    await service.submitResponse(token, { status: "confirmed", confirmedGuests: 2 });
    const result = await service.submitResponse(token, { status: "declined", confirmedGuests: 0 });
    expect(result).toMatchObject({ status: "declined", confirmedGuests: 0 });
  });

  it("carrera de cupo: 6 respuestas simultáneas, solo valen las que caben en el cupo", async () => {
    const { file, service } = await setup();
    const { token } = await service.createGuest({ name: "Ana", allowedGuests: 3 });

    const results = await Promise.allSettled(
      [1, 2, 3, 4, 5, 6].map((n) =>
        service.submitResponse(token, { status: "confirmed", confirmedGuests: n }),
      ),
    );

    expect(results.map((r) => r.status)).toEqual([
      "fulfilled",
      "fulfilled",
      "fulfilled",
      "rejected",
      "rejected",
      "rejected",
    ]);
    // La última aceptada (en orden de llegada) es la vigente, y el archivo sigue siendo válido.
    const final = await service.getPublicInvitation(token);
    expect(final).toMatchObject({ status: "confirmed", confirmedGuests: 3 });
    expect(JSON.parse(await readRaw(file)).guests[0].confirmedGuests).toBe(3);
  });
});

describe("actualizar invitación", () => {
  it("actualiza parcialmente y conserva el resto", async () => {
    const { service } = await setup();
    const { guest } = await service.createGuest({
      name: "Ana",
      email: "ana@example.com",
      allowedGuests: 2,
    });
    clock = new Date("2026-10-07T00:00:00.000Z");

    const updated = await service.updateGuest(guest.id, { phone: "123", allowedGuests: 4 });
    expect(updated).toMatchObject({
      name: "Ana",
      email: "ana@example.com",
      phone: "123",
      allowedGuests: 4,
      updatedAt: "2026-10-07T00:00:00.000Z",
      createdAt: "2026-10-05T10:00:00.000Z",
    });
    expect(updated).not.toHaveProperty("tokenHash");
  });

  it("una cadena vacía borra el contacto (null)", async () => {
    const { service } = await setup();
    const { guest } = await service.createGuest({ name: "Ana", email: "ana@example.com", allowedGuests: 2 });
    expect((await service.updateGuest(guest.id, { email: "" })).email).toBeNull();
  });

  it("no permite un cupo menor que los asistentes ya confirmados", async () => {
    const { service } = await setup();
    const { guest, token } = await service.createGuest({ name: "Ana", allowedGuests: 4 });
    await service.submitResponse(token, { status: "confirmed", confirmedGuests: 3 });

    await expect(service.updateGuest(guest.id, { allowedGuests: 2 })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect((await service.updateGuest(guest.id, { allowedGuests: 3 })).allowedGuests).toBe(3);
  });

  it.each([
    ["vacío", {}],
    ["estado", { status: "confirmed" }],
    ["asistentes", { confirmedGuests: 2 }],
    ["hash", { tokenHash: "a".repeat(64) }],
    ["nombre vacío", { name: "" }],
  ])("rechaza actualización inválida: %s", async (_name, input) => {
    const { service } = await setup();
    const { guest } = await service.createGuest({ name: "Ana", allowedGuests: 2 });
    await expect(service.updateGuest(guest.id, input)).rejects.toBeInstanceOf(ValidationError);
  });

  it("id inexistente → NotFound; id mal formado → Validation", async () => {
    const { service } = await setup();
    await expect(service.updateGuest("guest_noexiste", { name: "X" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(service.updateGuest("../x", { name: "X" })).rejects.toBeInstanceOf(ValidationError);
  });

  it("actualizaciones simultáneas de campos distintos no se pisan", async () => {
    const { service } = await setup();
    const { guest } = await service.createGuest({ name: "Ana", allowedGuests: 2 });

    await Promise.all([
      service.updateGuest(guest.id, { name: "Ana María" }),
      service.updateGuest(guest.id, { email: "ana@example.com" }),
      service.updateGuest(guest.id, { phone: "555" }),
      service.updateGuest(guest.id, { allowedGuests: 6 }),
    ]);

    expect(await service.getGuest(guest.id)).toMatchObject({
      name: "Ana María",
      email: "ana@example.com",
      phone: "555",
      allowedGuests: 6,
    });
  });
});

describe("regenerar token", () => {
  it("invalida el enlace anterior de inmediato y conserva la respuesta", async () => {
    const { file, service } = await setup();
    const { guest, token: oldToken } = await service.createGuest({ name: "Ana", allowedGuests: 2 });
    await service.submitResponse(oldToken, { status: "confirmed", confirmedGuests: 2 });

    const { token: newToken, guest: after } = await service.regenerateToken(guest.id);

    expect(newToken).not.toBe(oldToken);
    await expect(service.getPublicInvitation(oldToken)).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      service.submitResponse(oldToken, { status: "declined", confirmedGuests: 0 }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(await service.getPublicInvitation(newToken)).toMatchObject({
      status: "confirmed",
      confirmedGuests: 2,
    });
    expect(after).not.toHaveProperty("tokenHash");

    const raw = await readRaw(file);
    expect(raw).not.toContain(newToken);
    expect(raw).not.toContain(hashToken(oldToken));
  });

  it("id inexistente → NotFound", async () => {
    const { service } = await setup();
    await expect(service.regenerateToken("guest_noexiste")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("eliminar y listar", () => {
  it("eliminar invalida el enlace; eliminar de nuevo → NotFound", async () => {
    const { service } = await setup();
    const { guest, token } = await service.createGuest({ name: "Ana", allowedGuests: 1 });

    await service.deleteGuest(guest.id);
    await expect(service.getPublicInvitation(token)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.getGuest(guest.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.deleteGuest(guest.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("busca por nombre y contacto, filtra por estado y pagina; nunca expone tokenHash", async () => {
    const { service } = await setup();
    const ana = await service.createGuest({ name: "Ana Gómez", email: "ana@example.com", allowedGuests: 2 });
    await service.createGuest({ name: "Beto", phone: "+57 300 111", allowedGuests: 1 });
    await service.createGuest({ name: "Carla", allowedGuests: 1 });
    await service.submitResponse(ana.token, { status: "confirmed", confirmedGuests: 1 });

    const all = await service.listGuests();
    expect(all).toMatchObject({ total: 3, page: 1, limit: 50 });
    expect(JSON.stringify(all)).not.toContain("tokenHash");

    expect((await service.listGuests({ search: "GÓMEZ" })).items.map((g) => g.name)).toEqual(["Ana Gómez"]);
    expect((await service.listGuests({ search: "example.com" })).total).toBe(1);
    expect((await service.listGuests({ search: "300 111" })).items[0].name).toBe("Beto");
    expect((await service.listGuests({ status: "pending" })).total).toBe(2);
    expect((await service.listGuests({ status: "confirmed" })).total).toBe(1);

    const page2 = await service.listGuests({ page: "2", limit: "2" });
    expect(page2).toMatchObject({ total: 3, page: 2, limit: 2 });
    expect(page2.items).toHaveLength(1);
  });

  it("rechaza parámetros de listado inválidos", async () => {
    const { service } = await setup();
    await expect(service.listGuests({ status: "otro" })).rejects.toBeInstanceOf(ValidationError);
    await expect(service.listGuests({ limit: "100000" })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("persistencia y errores", () => {
  it("los enlaces siguen funcionando tras reiniciar (nueva instancia)", async () => {
    const { file, service } = await setup();
    const { token } = await service.createGuest({ name: "Ana", allowedGuests: 2 });
    await service.submitResponse(token, { status: "confirmed", confirmedGuests: 2 });

    const restarted = new GuestService(new FileGuestRepository(file));
    expect(await restarted.getPublicInvitation(token)).toMatchObject({
      name: "Ana",
      status: "confirmed",
      confirmedGuests: 2,
    });
  });

  it("60 invitaciones simultáneas: todas persisten y cada enlace funciona", async () => {
    const { service } = await setup();
    const created = await Promise.all(
      Array.from({ length: 60 }, (_, i) => service.createGuest({ name: `Invitado ${i}`, allowedGuests: 1 })),
    );

    expect((await service.listGuests({ limit: 200 })).total).toBe(60);
    const names = await Promise.all(created.map((c) => service.getPublicInvitation(c.token)));
    expect(names.map((n) => n.name).sort()).toEqual(created.map((_, i) => `Invitado ${i}`).sort());
  });

  it("si la escritura falla, la operación falla y nada queda guardado", async () => {
    const { service } = await setup();
    const { guest, token } = await service.createGuest({ name: "Ana", allowedGuests: 2 });

    renameMock.mockRejectedValueOnce(Object.assign(new Error("disco lleno"), { code: "ENOSPC" }));
    const failure = await service
      .submitResponse(token, { status: "confirmed", confirmedGuests: 2 })
      .catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(PersistenceError);
    expect((failure as Error).message).not.toMatch(/ENOSPC|disco|[\\/]/);
    expect((await service.getGuest(guest.id)).status).toBe("pending");
  });

  it("con el archivo corrupto, el servicio falla y no lo sobrescribe", async () => {
    const { file, service } = await setup();
    await writeFile(file, "{ corrupto", "utf8");

    await expect(service.createGuest({ name: "Ana", allowedGuests: 1 })).rejects.toMatchObject({
      code: "DATA_CORRUPTION",
    });
    await expect(service.listGuests()).rejects.toMatchObject({ code: "DATA_CORRUPTION" });
    expect(await readRaw(file)).toBe("{ corrupto");
  });
});
