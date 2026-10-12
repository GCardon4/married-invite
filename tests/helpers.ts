import { randomBytes } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach } from "vitest";

import type { Guest } from "@/types/guest";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

/** Directorio temporal propio de la prueba (se elimina al terminar). */
export async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "married-invite-test-"));
  dirs.push(dir);
  return dir;
}

export async function newDataFile(): Promise<string> {
  return path.join(await makeTempDir(), "guests.json");
}

export async function readRaw(file: string): Promise<string> {
  return readFile(file, "utf8");
}

export async function tempFilesIn(file: string): Promise<string[]> {
  const entries = await readdir(path.dirname(file));
  return entries.filter((name) => name.endsWith(".tmp"));
}

const TIMESTAMP = "2026-10-01T14:30:00.000Z";

export function makeGuest(overrides: Partial<Guest> = {}): Guest {
  return {
    id: `guest_${randomBytes(8).toString("hex")}`,
    name: "Invitado de prueba",
    email: null,
    phone: null,
    allowedGuests: 2,
    confirmedGuests: 0,
    status: "pending",
    tokenHash: randomBytes(32).toString("hex"),
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    respondedAt: null,
    ...overrides,
  };
}
