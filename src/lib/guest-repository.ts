import { randomUUID } from "node:crypto";
import { mkdir, open, readdir, readFile, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";

import {
  AppError,
  ConflictError,
  DataCorruptionError,
  describeErrorForLog,
  NotFoundError,
  PersistenceError,
} from "@/lib/errors";
import { guestDatabaseSchema, SCHEMA_VERSION } from "@/lib/validations";
import type { Guest, GuestDatabase } from "@/types/guest";

export type GuestMatch = { id: string } | { tokenHash: string };

/**
 * Contrato de persistencia. `guest-service.ts` depende solo de esta interfaz,
 * de modo que JSON pueda sustituirse por SQLite o PostgreSQL (ARCHITECTURE §9.6).
 *
 * `update` ejecuta lectura, modificación y escritura como una única operación
 * indivisible: las reglas que dependen del estado almacenado (p. ej. el cupo)
 * deben comprobarse dentro del `updater`, nunca antes de llamar al repositorio.
 */
export interface GuestRepository {
  list(): Promise<Guest[]>;
  find(match: GuestMatch): Promise<Guest | null>;
  create(guest: Guest): Promise<Guest>;
  /** `updater` es síncrono y no debe llamar al repositorio. Si lanza, no se escribe nada. */
  update(match: GuestMatch, updater: (current: Guest) => Guest): Promise<Guest>;
  delete(id: string): Promise<void>;
}

const RENAME_RETRYABLE = ["EPERM", "EBUSY", "EACCES"];
const RENAME_ATTEMPTS = 5;

/** Cuánto espera una operación a que otro proceso suelte el bloqueo del archivo. */
const LOCK_WAIT_MS = 10_000;
/** Un bloqueo más antiguo que esto lo dejó un proceso que murió; las operaciones duran milisegundos. */
const LOCK_STALE_MS = 30_000;
/**
 * En Windows, crear el bloqueo justo después de que otro proceso lo borre falla con EPERM/EACCES/EBUSY
 * (el archivo queda «pendiente de eliminar» unos milisegundos) en lugar de EEXIST. Es contención
 * transitoria, no un error de almacenamiento. Un permiso realmente denegado persiste y acaba fallando.
 */
const LOCK_TRANSIENT_CODES = ["EPERM", "EACCES", "EBUSY"];
const LOCK_TRANSIENT_MS = 1_000;

export interface FileGuestRepositoryOptions {
  lockWaitMs?: number;
  lockStaleMs?: number;
}

function errnoCode(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : undefined;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function indexOfMatch(guests: Guest[], match: GuestMatch): number {
  return "id" in match
    ? guests.findIndex((g) => g.id === match.id)
    : guests.findIndex((g) => g.tokenHash === match.tokenHash);
}

/**
 * Repositorio sobre un archivo JSON.
 *
 * - Toda operación (también las lecturas) pasa por una cola: una a la vez.
 * - Cada operación vuelve a leer y validar el archivo; no hay caché que pueda quedar vieja.
 * - Se escribe a un temporal del mismo directorio, con fsync, y se reemplaza con `rename`.
 * - Un archivo existente pero inválido NUNCA se modifica ni se reinicializa.
 *
 * La cola es local al proceso: solo es válido con UNA instancia de Node.js
 * (AGENTS.md). No usar con varias réplicas sobre el mismo archivo.
 *
 * Aun así, durante un despliegue con «rolling update» (Coolify) el contenedor nuevo arranca
 * mientras el viejo sigue vivo y ambos comparten el volumen. Por eso cada modificación toma
 * además un bloqueo de archivo (`<archivo>.lock`, creación exclusiva) que dura solo lo que
 * tarda la operación y caduca si el proceso que lo tenía muere. Es una salvaguarda para ese
 * solape, no una autorización para ejecutar varias réplicas.
 */
export class FileGuestRepository implements GuestRepository {
  private tail: Promise<unknown> = Promise.resolve();

  private readonly lockWaitMs: number;
  private readonly lockStaleMs: number;

  constructor(
    private readonly filePath: string,
    options: FileGuestRepositoryOptions = {},
  ) {
    this.lockWaitMs = options.lockWaitMs ?? LOCK_WAIT_MS;
    this.lockStaleMs = options.lockStaleMs ?? LOCK_STALE_MS;
  }

  list(): Promise<Guest[]> {
    return this.enqueue(async () => (await this.load()).guests);
  }

  find(match: GuestMatch): Promise<Guest | null> {
    return this.enqueue(async () => {
      const { guests } = await this.load();
      const index = indexOfMatch(guests, match);
      return index === -1 ? null : guests[index];
    });
  }

  create(guest: Guest): Promise<Guest> {
    return this.mutate(async () => {
      const db = await this.load();
      if (db.guests.some((g) => g.id === guest.id || g.tokenHash === guest.tokenHash)) {
        throw new ConflictError("Ya existe una invitación con ese identificador.");
      }
      db.guests.push(guest);
      await this.commit(db);
      return guest;
    });
  }

  update(match: GuestMatch, updater: (current: Guest) => Guest): Promise<Guest> {
    return this.mutate(async () => {
      const db = await this.load();
      const index = indexOfMatch(db.guests, match);
      if (index === -1) throw new NotFoundError();

      const current = db.guests[index];
      const next = updater({ ...current });
      if (next.id !== current.id) {
        throw new PersistenceError(new Error("updater-changed-id"));
      }

      db.guests[index] = next;
      await this.commit(db);
      return next;
    });
  }

  delete(id: string): Promise<void> {
    return this.mutate(async () => {
      const db = await this.load();
      const index = db.guests.findIndex((g) => g.id === id);
      if (index === -1) throw new NotFoundError();

      db.guests.splice(index, 1);
      await this.commit(db);
    });
  }

  // --- Cola -----------------------------------------------------------------

  /** Encadena la operación tras las anteriores. Un fallo no bloquea las siguientes. */
  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.tail.then(operation).catch((error: unknown) => {
      if (error instanceof PersistenceError || error instanceof DataCorruptionError) {
        // Solo código y tipo de fallo: nunca contenido del archivo, rutas ni tokens.
        console.error(`[guest-repository] ${describeErrorForLog(error)}`);
      }
      throw error;
    });
    this.tail = run.catch(() => undefined);
    return run;
  }

  /** Operación de modificación: en cola dentro del proceso y con el bloqueo de archivo entre procesos. */
  private mutate<T>(operation: () => Promise<T>): Promise<T> {
    return this.enqueue(() => this.withFileLock(operation));
  }

  // --- Bloqueo entre procesos -----------------------------------------------

  private get lockPath(): string {
    return `${this.filePath}.lock`;
  }

  private async withFileLock<T>(operation: () => Promise<T>): Promise<T> {
    await this.acquireLock();
    try {
      return await operation();
    } finally {
      await this.releaseLock();
    }
  }

  private async acquireLock(): Promise<void> {
    const deadline = Date.now() + this.lockWaitMs;
    let transientUntil: number | null = null;

    for (let attempt = 1; ; attempt++) {
      try {
        await mkdir(path.dirname(this.filePath), { recursive: true });
        const handle = await open(this.lockPath, "wx", 0o600);
        try {
          await handle.writeFile(JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
        } finally {
          await handle.close();
        }
        return;
      } catch (error) {
        const code = errnoCode(error);
        if (code !== "EEXIST") {
          if (!code || !LOCK_TRANSIENT_CODES.includes(code)) throw new PersistenceError(error);
          // Contención transitoria (Windows): se reintenta un instante; si persiste, es un error real.
          transientUntil ??= Date.now() + LOCK_TRANSIENT_MS;
          if (Date.now() >= transientUntil) throw new PersistenceError(error);
        } else {
          transientUntil = null;
        }
      }

      if (await this.removeIfStale()) continue;
      if (Date.now() >= deadline) {
        throw new PersistenceError(new Error("file-lock-timeout"));
      }
      await sleep(Math.min(250, 10 * attempt) + Math.floor(Math.random() * 15));
    }
  }

  /** Suelta el bloqueo. Si no puede borrarlo, caduca solo (LOCK_STALE_MS), pero antes se reintenta. */
  private async releaseLock(): Promise<void> {
    for (let attempt = 1; attempt <= RENAME_ATTEMPTS; attempt++) {
      try {
        await unlink(this.lockPath);
        return;
      } catch (error) {
        const code = errnoCode(error);
        if (code === "ENOENT") return;
        if (!code || !RENAME_RETRYABLE.includes(code)) return;
        await sleep(20 * attempt);
      }
    }
  }

  /** Elimina el bloqueo solo si lleva más de `lockStaleMs` sin cambios. `true` si lo eliminó. */
  private async removeIfStale(): Promise<boolean> {
    try {
      const { mtimeMs } = await stat(this.lockPath);
      if (Date.now() - mtimeMs < this.lockStaleMs) return false;

      // Se vuelve a comprobar justo antes de borrar para no pisar un bloqueo recién tomado.
      const again = await stat(this.lockPath);
      if (again.mtimeMs !== mtimeMs) return false;

      await unlink(this.lockPath);
      console.error("[guest-repository] PERSISTENCE: stale-file-lock-removed");
      return true;
    } catch (error) {
      // Desapareció entre medias (otro proceso lo soltó): se reintenta tomarlo.
      return errnoCode(error) === "ENOENT";
    }
  }

  // --- Lectura --------------------------------------------------------------

  private async load(): Promise<GuestDatabase> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, "utf8");
    } catch (error) {
      if (errnoCode(error) === "ENOENT") return this.initialize();
      throw new PersistenceError(error);
    }
    return this.parse(raw);
  }

  private parse(raw: string): GuestDatabase {
    const text = raw.replace(/^﻿/, "");
    if (text.trim() === "") throw new DataCorruptionError("empty-file");

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (error) {
      throw new DataCorruptionError("invalid-json", error);
    }

    const version = (json as { schemaVersion?: unknown } | null)?.schemaVersion;
    if (typeof version === "number" && version !== SCHEMA_VERSION) {
      throw new DataCorruptionError(`unsupported-schema-version-${version}`);
    }

    const result = guestDatabaseSchema.safeParse(json);
    if (!result.success) {
      // Solo la ruta del primer problema: los mensajes y valores pueden contener datos personales.
      const where = result.error.issues[0]?.path.join(".") || "root";
      throw new DataCorruptionError(`schema-invalid-at-${where}`, result.error);
    }
    return result.data;
  }

  /**
   * El archivo no existe. Solo se crea uno vacío si no hay señales de que los datos
   * se hayan perdido (temporales huérfanos junto al archivo ausente), y siempre con
   * creación exclusiva (`wx`): jamás sobrescribe un archivo que aparezca entre medias.
   */
  private async initialize(): Promise<GuestDatabase> {
    const dir = path.dirname(this.filePath);
    const base = path.basename(this.filePath);

    try {
      const entries = await readdir(dir);
      if (entries.some((name) => name.startsWith(`${base}.`) && name.endsWith(".tmp"))) {
        throw new DataCorruptionError("main-file-missing-with-leftover-temp-files");
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (errnoCode(error) !== "ENOENT") throw new PersistenceError(error);
    }

    const empty: GuestDatabase = { schemaVersion: SCHEMA_VERSION, guests: [] };
    try {
      await mkdir(dir, { recursive: true });
      const handle = await open(this.filePath, "wx", 0o600);
      try {
        await handle.writeFile(`${JSON.stringify(empty, null, 2)}\n`, "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }
    } catch (error) {
      if (errnoCode(error) === "EEXIST") {
        // Otro actor creó el archivo mientras tanto: se usa ese, nunca se pisa.
        return this.parse(await this.readExisting());
      }
      throw new PersistenceError(error);
    }
    return empty;
  }

  private async readExisting(): Promise<string> {
    try {
      return await readFile(this.filePath, "utf8");
    } catch (error) {
      throw new PersistenceError(error);
    }
  }

  // --- Escritura ------------------------------------------------------------

  /** Valida el estado completo y lo escribe de forma atómica. Propaga cualquier fallo. */
  private async commit(db: GuestDatabase): Promise<void> {
    const checked = guestDatabaseSchema.safeParse(db);
    if (!checked.success) {
      throw new PersistenceError(new Error("invalid-state-before-write"));
    }
    const content = `${JSON.stringify(checked.data, null, 2)}\n`;
    const tempPath = `${this.filePath}.${randomUUID()}.tmp`;

    try {
      const handle = await open(tempPath, "wx", 0o600);
      try {
        await handle.writeFile(content, "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }
      await this.replace(tempPath);
    } catch (error) {
      await unlink(tempPath).catch(() => undefined);
      throw error instanceof AppError ? error : new PersistenceError(error);
    }
  }

  /** `rename` sobre el archivo existente; en Windows reintenta ante bloqueos transitorios. */
  private async replace(tempPath: string): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      try {
        await rename(tempPath, this.filePath);
        return;
      } catch (error) {
        const code = errnoCode(error);
        if (attempt >= RENAME_ATTEMPTS || !code || !RENAME_RETRYABLE.includes(code)) {
          throw error;
        }
        await sleep(25 * attempt);
      }
    }
  }
}

// La caché en `globalThis` evita que Next.js (recarga en desarrollo, bundles
// separados por ruta) cree varias instancias con colas independientes sobre el
// mismo archivo, lo que permitiría perder escrituras.
const globalForRepository = globalThis as typeof globalThis & {
  __guestRepository?: { filePath: string; repository: GuestRepository };
};

export function getGuestRepository(): GuestRepository {
  const configured = process.env.DATA_FILE_PATH?.trim();
  if (!configured) {
    throw new PersistenceError(new Error("DATA_FILE_PATH-not-set"));
  }
  const filePath = path.resolve(configured);

  const cached = globalForRepository.__guestRepository;
  if (cached?.filePath === filePath) return cached.repository;

  const repository = new FileGuestRepository(filePath);
  globalForRepository.__guestRepository = { filePath, repository };
  return repository;
}
