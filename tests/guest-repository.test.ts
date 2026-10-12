import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as fsp from "node:fs/promises";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ConflictError,
  DataCorruptionError,
  NotFoundError,
  PersistenceError,
} from "@/lib/errors";
import { FileGuestRepository } from "@/lib/guest-repository";

import { makeGuest, makeTempDir, newDataFile, readRaw, tempFilesIn } from "./helpers";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, default: actual, rename: vi.fn(actual.rename), open: vi.fn(actual.open), unlink: vi.fn(actual.unlink) };
});

const renameMock = vi.mocked(fsp.rename);
const openMock = vi.mocked(fsp.open);
const unlinkMock = vi.mocked(fsp.unlink);

beforeEach(async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  renameMock.mockReset();
  renameMock.mockImplementation(actual.rename);
  openMock.mockReset();
  openMock.mockImplementation(actual.open);
  unlinkMock.mockReset();
  unlinkMock.mockImplementation(actual.unlink);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

const errno = (code: string) => Object.assign(new Error(code), { code });

async function seed(file: string, guests = [makeGuest()]) {
  await writeFile(file, JSON.stringify({ schemaVersion: 1, guests }, null, 2), "utf8");
  return guests;
}

describe("inicialización", () => {
  it("crea un archivo vacío y válido solo si no existe", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);

    expect(await repo.list()).toEqual([]);
    expect(JSON.parse(await readRaw(file))).toEqual({ schemaVersion: 1, guests: [] });
  });

  it("crea los directorios intermedios", async () => {
    const file = path.join(await makeTempDir(), "a", "b", "guests.json");
    expect(await new FileGuestRepository(file).list()).toEqual([]);
    expect(JSON.parse(await readRaw(file)).schemaVersion).toBe(1);
  });

  it("no toca un archivo existente y válido", async () => {
    const file = await newDataFile();
    const [guest] = await seed(file);
    const before = await readRaw(file);

    expect(await new FileGuestRepository(file).list()).toEqual([guest]);
    expect(await readRaw(file)).toBe(before);
  });

  it("acepta un archivo con BOM", async () => {
    const file = await newDataFile();
    await writeFile(file, `﻿${JSON.stringify({ schemaVersion: 1, guests: [] })}`, "utf8");
    expect(await new FileGuestRepository(file).list()).toEqual([]);
  });

  it("no inicializa datos vacíos si falta el archivo pero hay temporales huérfanos", async () => {
    const file = await newDataFile();
    await writeFile(`${file}.abc.tmp`, "{}", "utf8");

    await expect(new FileGuestRepository(file).list()).rejects.toBeInstanceOf(
      DataCorruptionError,
    );
    await expect(readFile(file)).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("archivos corruptos: nunca se sobrescriben", () => {
  const dupId = makeGuest({ id: "guest_dup" });
  const cases: [string, string][] = [
    ["JSON inválido", "{ esto no es json"],
    ["archivo vacío", ""],
    ["solo espacios", "   \n"],
    ["JSON truncado", '{"schemaVersion":1,"guests":[{"id":"guest_a'],
    ["versión de esquema no soportada", JSON.stringify({ schemaVersion: 2, guests: [] })],
    ["sin guests", JSON.stringify({ schemaVersion: 1 })],
    [
      "estado inválido",
      JSON.stringify({ schemaVersion: 1, guests: [makeGuest({ status: "maybe" as never })] }),
    ],
    [
      "confirmados sobre el cupo",
      JSON.stringify({
        schemaVersion: 1,
        guests: [
          makeGuest({ status: "confirmed", confirmedGuests: 9, respondedAt: "2026-10-02T00:00:00.000Z" }),
        ],
      }),
    ],
    ["id duplicado", JSON.stringify({ schemaVersion: 1, guests: [dupId, { ...dupId, tokenHash: "b".repeat(64) }] })],
    [
      "hash duplicado",
      JSON.stringify({
        schemaVersion: 1,
        guests: [makeGuest({ tokenHash: "c".repeat(64) }), makeGuest({ tokenHash: "c".repeat(64) })],
      }),
    ],
    ["un arreglo en la raíz", "[]"],
    ["null", "null"],
  ];

  it.each(cases)("%s", async (_name, content) => {
    const file = await newDataFile();
    await writeFile(file, content, "utf8");
    const repo = new FileGuestRepository(file);

    await expect(repo.list()).rejects.toBeInstanceOf(DataCorruptionError);
    await expect(repo.find({ id: "guest_x" })).rejects.toBeInstanceOf(DataCorruptionError);
    await expect(repo.create(makeGuest())).rejects.toBeInstanceOf(DataCorruptionError);
    await expect(repo.update({ id: "guest_x" }, (g) => g)).rejects.toBeInstanceOf(
      DataCorruptionError,
    );
    await expect(repo.delete("guest_x")).rejects.toBeInstanceOf(DataCorruptionError);

    expect(await readRaw(file)).toBe(content);
    expect(await tempFilesIn(file)).toEqual([]);
  });

  it("el mensaje al cliente no revela detalles internos ni datos", async () => {
    const file = await newDataFile();
    await writeFile(file, '{"schemaVersion":1,"guests":[{"name":"Secreto Personal"}]}', "utf8");

    const error = await new FileGuestRepository(file).list().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DataCorruptionError);
    const message = (error as Error).message;
    expect(message).not.toContain(file);
    expect(message).not.toContain("Secreto Personal");
  });

  it("un directorio en lugar del archivo produce PersistenceError y no se modifica", async () => {
    const file = await newDataFile();
    await mkdir(file);
    await expect(new FileGuestRepository(file).list()).rejects.toBeInstanceOf(PersistenceError);
  });
});

describe("operaciones", () => {
  it("persiste y sobrevive a un reinicio (nueva instancia)", async () => {
    const file = await newDataFile();
    const guest = makeGuest();
    await new FileGuestRepository(file).create(guest);

    const restarted = new FileGuestRepository(file);
    expect(await restarted.list()).toEqual([guest]);
    expect(await restarted.find({ tokenHash: guest.tokenHash })).toEqual(guest);
    expect(await restarted.find({ id: guest.id })).toEqual(guest);
    expect(await restarted.find({ id: "guest_nope" })).toBeNull();
  });

  it("rechaza id y tokenHash duplicados sin modificar el archivo", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    const guest = makeGuest();
    await repo.create(guest);
    const before = await readRaw(file);

    await expect(repo.create({ ...guest, tokenHash: "d".repeat(64) })).rejects.toBeInstanceOf(
      ConflictError,
    );
    await expect(repo.create(makeGuest({ tokenHash: guest.tokenHash }))).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(await readRaw(file)).toBe(before);
  });

  it("update: aplica el cambio, y NotFound si no existe", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    const guest = makeGuest();
    await repo.create(guest);

    const updated = await repo.update({ id: guest.id }, (g) => ({ ...g, name: "Nuevo" }));
    expect(updated.name).toBe("Nuevo");
    expect((await repo.list())[0].name).toBe("Nuevo");

    await expect(repo.update({ id: "guest_nope" }, (g) => g)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update: si el updater lanza no se escribe nada", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    const guest = makeGuest();
    await repo.create(guest);
    const before = await readRaw(file);

    await expect(
      repo.update({ id: guest.id }, () => {
        throw new ConflictError("regla de negocio");
      }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(await readRaw(file)).toBe(before);
  });

  it("update: no permite cambiar el id ni dejar un registro inválido", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    const guest = makeGuest();
    await repo.create(guest);
    const before = await readRaw(file);

    await expect(repo.update({ id: guest.id }, (g) => ({ ...g, id: "guest_otro" }))).rejects.toBeInstanceOf(
      PersistenceError,
    );
    await expect(
      repo.update({ id: guest.id }, (g) => ({ ...g, status: "confirmed", confirmedGuests: 99 })),
    ).rejects.toBeInstanceOf(PersistenceError);
    expect(await readRaw(file)).toBe(before);
  });

  it("delete: elimina, y NotFound si no existe", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    const [a, b] = [makeGuest(), makeGuest()];
    await repo.create(a);
    await repo.create(b);

    await repo.delete(a.id);
    expect(await repo.list()).toEqual([b]);
    await expect(repo.delete(a.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("el archivo escrito es JSON válido y no deja temporales", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    for (let i = 0; i < 10; i++) await repo.create(makeGuest());

    expect(JSON.parse(await readRaw(file)).guests).toHaveLength(10);
    expect(await tempFilesIn(file)).toEqual([]);
  });
});

describe("errores de escritura", () => {
  it("si falla el reemplazo: PersistenceError, archivo intacto, sin temporales", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    const existing = makeGuest();
    await repo.create(existing);
    const before = await readRaw(file);

    renameMock.mockRejectedValueOnce(errno("EIO"));
    await expect(repo.create(makeGuest())).rejects.toBeInstanceOf(PersistenceError);

    expect(await readRaw(file)).toBe(before);
    expect(await tempFilesIn(file)).toEqual([]);
    expect(await repo.list()).toEqual([existing]);
  });

  it("el mensaje del error de persistencia no incluye rutas ni el código del sistema", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    renameMock.mockRejectedValueOnce(errno("EIO"));

    const error = await repo.create(makeGuest()).catch((e: unknown) => e);
    expect((error as Error).message).not.toContain(file);
    expect((error as Error).message).not.toContain("EIO");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("PERSISTENCE (EIO)"));
  });

  it("reintenta bloqueos transitorios (EBUSY) y termina con éxito", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    renameMock.mockRejectedValueOnce(errno("EBUSY")).mockRejectedValueOnce(errno("EPERM"));

    const guest = makeGuest();
    await repo.create(guest);
    expect(await repo.list()).toEqual([guest]);
    expect(await tempFilesIn(file)).toEqual([]);
  });

  it("si el bloqueo persiste, falla sin informar éxito", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    renameMock.mockRejectedValue(errno("EBUSY"));

    await expect(repo.create(makeGuest())).rejects.toBeInstanceOf(PersistenceError);
    renameMock.mockReset();
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    renameMock.mockImplementation(actual.rename);
    expect(await repo.list()).toEqual([]);
    expect(await tempFilesIn(file)).toEqual([]);
  });
});

describe("concurrencia", () => {
  it("100 creaciones simultáneas: no se pierde ninguna", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    const guests = Array.from({ length: 100 }, (_, i) => makeGuest({ name: `Invitado ${i}` }));

    await Promise.all(guests.map((g) => repo.create(g)));

    const stored = await new FileGuestRepository(file).list();
    expect(stored).toHaveLength(100);
    expect(new Set(stored.map((g) => g.id)).size).toBe(100);
    expect(new Set(stored.map((g) => g.name)).size).toBe(100);
    expect(await tempFilesIn(file)).toEqual([]);
  });

  it("50 lecturas-modificaciones-escrituras sobre el mismo registro: ninguna se pisa", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    const guest = makeGuest({ allowedGuests: 1 });
    await repo.create(guest);

    await Promise.all(
      Array.from({ length: 50 }, () =>
        repo.update({ id: guest.id }, (g) => ({ ...g, allowedGuests: g.allowedGuests + 1 })),
      ),
    );

    expect((await repo.find({ id: guest.id }))?.allowedGuests).toBe(51);
  });

  it("las operaciones se ejecutan en orden de envío", async () => {
    const repo = new FileGuestRepository(await newDataFile());
    const guest = makeGuest();

    const created = repo.create(guest);
    const listed = repo.list();
    const deleted = repo.delete(guest.id);
    const listedAfter = repo.list();

    await created;
    expect(await listed).toEqual([guest]);
    await deleted;
    expect(await listedAfter).toEqual([]);
  });

  it("mezcla de creaciones, actualizaciones, borrados y lecturas: siempre estado válido", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    const base = Array.from({ length: 20 }, () => makeGuest({ allowedGuests: 1 }));
    await Promise.all(base.map((g) => repo.create(g)));

    const ops: Promise<unknown>[] = [];
    for (let i = 0; i < 20; i++) {
      ops.push(repo.create(makeGuest()));
      ops.push(repo.update({ id: base[i].id }, (g) => ({ ...g, allowedGuests: 5 })));
      ops.push(repo.list().then((list) => expect(list.length).toBeGreaterThanOrEqual(20)));
      if (i % 2 === 0) ops.push(repo.delete(base[i].id));
    }
    await Promise.all(ops);

    const stored = await new FileGuestRepository(file).list();
    expect(stored).toHaveLength(20 + 20 - 10);
    expect(stored.filter((g) => base.some((b) => b.id === g.id)).every((g) => g.allowedGuests === 5)).toBe(true);
  });

  it("un fallo no bloquea la cola: las demás operaciones se completan", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    renameMock.mockRejectedValueOnce(errno("EIO"));

    const results = await Promise.allSettled([
      repo.create(makeGuest()),
      repo.create(makeGuest()),
      repo.create(makeGuest()),
    ]);

    expect(results.map((r) => r.status)).toEqual(["rejected", "fulfilled", "fulfilled"]);
    expect(await repo.list()).toHaveLength(2);
  });

  it("un updater que lanza no bloquea las operaciones siguientes", async () => {
    const repo = new FileGuestRepository(await newDataFile());
    const guest = makeGuest();
    await repo.create(guest);

    const failing = repo.update({ id: guest.id }, () => {
      throw new Error("falla del updater");
    });
    const next = repo.update({ id: guest.id }, (g) => ({ ...g, name: "Después" }));

    await expect(failing).rejects.toThrow("falla del updater");
    expect((await next).name).toBe("Después");
  });
});

describe("bloqueo de archivo: contención transitoria de Windows", () => {
  // Windows devuelve EPERM/EACCES/EBUSY (no EEXIST) al crear el bloqueo justo después de que otro
  // proceso lo borre, porque el archivo queda «pendiente de eliminar» unos milisegundos.
  it.each([["EPERM"], ["EACCES"], ["EBUSY"]])("%s al crear el bloqueo se reintenta y la operación termina bien", async (code) => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    openMock.mockRejectedValueOnce(errno(code));

    const guest = makeGuest();
    await repo.create(guest);

    expect(await repo.list()).toEqual([guest]);
    expect(await tempFilesIn(file)).toEqual([]);
    await expect(fsp.stat(`${file}.lock`)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("varios fallos transitorios seguidos tampoco hacen fallar la operación", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    openMock.mockRejectedValueOnce(errno("EPERM")).mockRejectedValueOnce(errno("EPERM")).mockRejectedValueOnce(errno("EBUSY"));

    await repo.create(makeGuest());
    expect(await repo.list()).toHaveLength(1);
  });

  it("si el permiso se deniega de verdad (persiste), falla sin escribir y deja el código para diagnosticarlo", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    await repo.create(makeGuest());
    const before = await readRaw(file);
    openMock.mockRejectedValue(errno("EACCES"));

    const started = Date.now();
    await expect(repo.create(makeGuest())).rejects.toBeInstanceOf(PersistenceError);

    expect(Date.now() - started).toBeLessThan(4_000); // no espera los 10 s del bloqueo ajeno
    expect(await readRaw(file)).toBe(before);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("PERSISTENCE (EACCES)"));
  });

  it("un error que no es de contención (EIO) falla de inmediato", async () => {
    const repo = new FileGuestRepository(await newDataFile());
    openMock.mockRejectedValue(errno("EIO"));

    const started = Date.now();
    await expect(repo.create(makeGuest())).rejects.toBeInstanceOf(PersistenceError);
    expect(Date.now() - started).toBeLessThan(500);
  });

  it("si no puede soltar el bloqueo a la primera, lo reintenta y no lo deja atrás", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    unlinkMock.mockRejectedValueOnce(errno("EPERM")).mockRejectedValueOnce(errno("EBUSY"));

    await repo.create(makeGuest());

    await expect(fsp.stat(`${file}.lock`)).rejects.toMatchObject({ code: "ENOENT" });
    // La siguiente operación no tiene que esperar a que el bloqueo caduque.
    const started = Date.now();
    await repo.create(makeGuest());
    expect(Date.now() - started).toBeLessThan(1_000);
  });
});
