import { stat, utimes, writeFile } from "node:fs/promises";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { PersistenceError } from "@/lib/errors";
import { FileGuestRepository } from "@/lib/guest-repository";

import { makeGuest, newDataFile, readRaw, tempFilesIn } from "./helpers";

/**
 * Coolify actualiza con «rolling update»: el contenedor nuevo arranca mientras el viejo sigue
 * vivo, y ambos comparten el volumen. Cada proceso tiene su propia cola en memoria, así que
 * la cola no basta: aquí cada instancia del repositorio hace de un proceso distinto.
 */
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

const lockPathOf = (file: string) => `${file}.lock`;

describe("dos procesos sobre el mismo archivo", () => {
  it("lecturas-modificaciones-escrituras simultáneas: no se pierde ninguna actualización", async () => {
    const file = await newDataFile();
    const a = new FileGuestRepository(file);
    const b = new FileGuestRepository(file);
    const guest = makeGuest({ allowedGuests: 1 });
    await a.create(guest);

    const bump = (repo: FileGuestRepository) =>
      repo.update({ id: guest.id }, (g) => ({ ...g, allowedGuests: g.allowedGuests + 1 }));
    await Promise.all(Array.from({ length: 40 }, (_, i) => bump(i % 2 === 0 ? a : b)));

    expect((await a.find({ id: guest.id }))?.allowedGuests).toBe(41);
  });

  it("creaciones simultáneas desde ambas instancias: se conservan todas", async () => {
    const file = await newDataFile();
    const a = new FileGuestRepository(file);
    const b = new FileGuestRepository(file);

    await Promise.all(Array.from({ length: 60 }, (_, i) => (i % 2 === 0 ? a : b).create(makeGuest())));

    expect(await a.list()).toHaveLength(60);
    expect(await b.list()).toHaveLength(60);
    expect(await tempFilesIn(file)).toEqual([]);
  });

  it("un borrado y una actualización cruzados no se pisan", async () => {
    const file = await newDataFile();
    const a = new FileGuestRepository(file);
    const b = new FileGuestRepository(file);
    const guests = Array.from({ length: 10 }, () => makeGuest({ allowedGuests: 1 }));
    for (const g of guests) await a.create(g);

    await Promise.all(
      guests.map((g, i) =>
        i % 2 === 0
          ? a.delete(g.id)
          : b.update({ id: g.id }, (current) => ({ ...current, allowedGuests: 9 })),
      ),
    );

    const stored = await a.list();
    expect(stored).toHaveLength(5);
    expect(stored.every((g) => g.allowedGuests === 9)).toBe(true);
  });
});

describe("bloqueo de archivo", () => {
  it("no deja el bloqueo tras una operación correcta ni tras un error", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    const guest = makeGuest();

    await repo.create(guest);
    await expect(stat(lockPathOf(file))).rejects.toMatchObject({ code: "ENOENT" });

    await expect(
      repo.update({ id: guest.id }, () => {
        throw new Error("falla del updater");
      }),
    ).rejects.toThrow("falla del updater");
    await expect(repo.delete("guest_noexiste")).rejects.toBeDefined();
    await expect(stat(lockPathOf(file))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("las lecturas no necesitan el bloqueo", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    const guest = makeGuest();
    await repo.create(guest);

    await writeFile(lockPathOf(file), "{}", "utf8"); // otro proceso está escribiendo
    expect(await repo.list()).toEqual([guest]);
    expect(await repo.find({ id: guest.id })).toEqual(guest);
  });

  it("espera a que otro proceso suelte el bloqueo y continúa", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file);
    await writeFile(lockPathOf(file), "{}", "utf8");

    const { unlink } = await import("node:fs/promises");
    setTimeout(() => void unlink(lockPathOf(file)), 200);

    const started = Date.now();
    await repo.create(makeGuest());
    expect(Date.now() - started).toBeGreaterThanOrEqual(150);
    expect(await repo.list()).toHaveLength(1);
  });

  it("si el bloqueo no se libera a tiempo, falla sin escribir y sin tocar el archivo", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file, { lockWaitMs: 150, lockStaleMs: 60_000 });
    await repo.create(makeGuest());
    const before = await readRaw(file);
    await writeFile(lockPathOf(file), "{}", "utf8");

    await expect(repo.create(makeGuest())).rejects.toBeInstanceOf(PersistenceError);
    expect(await readRaw(file)).toBe(before);
    // El bloqueo ajeno no se elimina.
    await expect(stat(lockPathOf(file))).resolves.toBeDefined();
  });

  it("recupera un bloqueo abandonado por un proceso que murió (vencido)", async () => {
    const file = await newDataFile();
    const repo = new FileGuestRepository(file, { lockWaitMs: 2_000, lockStaleMs: 1_000 });
    await writeFile(lockPathOf(file), "{}", "utf8");
    const old = new Date(Date.now() - 60_000);
    await utimes(lockPathOf(file), old, old);

    const guest = makeGuest();
    await repo.create(guest);

    expect(await repo.list()).toEqual([guest]);
    await expect(stat(lockPathOf(file))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("un bloqueo huérfano no se confunde con un archivo temporal ni impide iniciar", async () => {
    const file = await newDataFile();
    await writeFile(lockPathOf(file), "{}", "utf8");

    // Sin archivo de datos y con un .lock (no un .tmp), la lectura inicializa normalmente.
    expect(await new FileGuestRepository(file).list()).toEqual([]);
  });
});
