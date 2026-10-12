import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { ConfigurationError } from "@/lib/errors";

/** Sesión absoluta: se vence aunque haya actividad. */
const ABSOLUTE_LIFETIME_MS = 8 * 60 * 60 * 1000;
/** Inactividad máxima antes de pedir la contraseña de nuevo. */
const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const MAX_SESSIONS = 20;
const MIN_SECRET_LENGTH = 32;

interface SessionRecord {
  createdAt: number;
  lastSeenAt: number;
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET ?? "";
  if (secret.length < MIN_SECRET_LENGTH) throw new ConfigurationError("SESSION_SECRET-too-short");
  return secret;
}

function sign(sessionId: string): string {
  return createHmac("sha256", sessionSecret()).update(sessionId).digest("base64url");
}

/**
 * Sesiones en el servidor. La cookie solo lleva un identificador aleatorio de 256 bits
 * firmado con `SESSION_SECRET`; los datos de la sesión nunca salen del servidor.
 *
 * Cerrar sesión la elimina de verdad, y un reinicio del proceso las cierra todas
 * (aceptable con un único administrador). Con varias réplicas cada una tendría su
 * propio registro: otra razón para mantener una sola instancia (AGENTS.md).
 */
export class SessionStore {
  private readonly sessions = new Map<string, SessionRecord>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  create(): { cookieValue: string; maxAgeSeconds: number } {
    const sessionId = randomBytes(32).toString("base64url");
    const cookieValue = `${sessionId}.${sign(sessionId)}`;

    this.purgeExpired();
    while (this.sessions.size >= MAX_SESSIONS) {
      const oldest = this.sessions.keys().next().value;
      if (oldest === undefined) break;
      this.sessions.delete(oldest);
    }

    const now = this.now();
    this.sessions.set(sessionId, { createdAt: now, lastSeenAt: now });
    return { cookieValue, maxAgeSeconds: ABSOLUTE_LIFETIME_MS / 1000 };
  }

  /** `true` si la cookie es auténtica, está registrada y no ha vencido. Renueva la inactividad. */
  validate(cookieValue: string | null | undefined): boolean {
    const sessionId = this.verifiedId(cookieValue);
    if (!sessionId) return false;

    const record = this.sessions.get(sessionId);
    if (!record) return false;

    const now = this.now();
    if (this.isExpired(record, now)) {
      this.sessions.delete(sessionId);
      return false;
    }
    record.lastSeenAt = now;
    return true;
  }

  destroy(cookieValue: string | null | undefined): void {
    const sessionId = this.verifiedId(cookieValue);
    if (sessionId) this.sessions.delete(sessionId);
  }

  get size(): number {
    return this.sessions.size;
  }

  clear(): void {
    this.sessions.clear();
  }

  /** Devuelve el id solo si la firma es válida; así las cookies falsas no tocan el registro. */
  private verifiedId(cookieValue: string | null | undefined): string | null {
    if (!cookieValue) return null;
    const separator = cookieValue.indexOf(".");
    if (separator <= 0) return null;

    const sessionId = cookieValue.slice(0, separator);
    const signature = cookieValue.slice(separator + 1);

    let expected: string;
    try {
      expected = sign(sessionId);
    } catch {
      return null; // Sin SESSION_SECRET válido ninguna sesión es auténtica.
    }

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b) ? sessionId : null;
  }

  private isExpired(record: SessionRecord, now: number): boolean {
    return now - record.createdAt >= ABSOLUTE_LIFETIME_MS || now - record.lastSeenAt >= IDLE_TIMEOUT_MS;
  }

  private purgeExpired(): void {
    const now = this.now();
    for (const [id, record] of this.sessions) {
      if (this.isExpired(record, now)) this.sessions.delete(id);
    }
  }
}

// En `globalThis` para que todos los bundles de Next.js compartan el mismo registro.
const globalForSessions = globalThis as typeof globalThis & { __sessionStore?: SessionStore };

export function getSessionStore(): SessionStore {
  globalForSessions.__sessionStore ??= new SessionStore();
  return globalForSessions.__sessionStore;
}

// --- Cookie -----------------------------------------------------------------

const isProduction = () => process.env.NODE_ENV === "production";

/** En producción lleva el prefijo `__Host-`: el navegador exige `Secure`, `Path=/` y sin `Domain`. */
export function sessionCookieName(): string {
  return isProduction() ? "__Host-admin_session" : "admin_session";
}

function cookieAttributes(maxAgeSeconds: number): string {
  return [
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAgeSeconds}`,
    ...(isProduction() ? ["Secure"] : []),
  ].join("; ");
}

export function serializeSessionCookie(cookieValue: string, maxAgeSeconds: number): string {
  return `${sessionCookieName()}=${cookieValue}; ${cookieAttributes(maxAgeSeconds)}`;
}

/** Mismos atributos que al crearla, con vencimiento inmediato. */
export function serializeClearedSessionCookie(): string {
  return `${sessionCookieName()}=; ${cookieAttributes(0)}`;
}

export function readSessionCookie(request: Request): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;

  const name = sessionCookieName();
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}
