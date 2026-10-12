export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Límite de ventana fija en memoria. Es válido porque la aplicación corre en una
 * sola instancia de Node.js (AGENTS.md); con varias réplicas cada una contaría aparte.
 */
export class RateLimiter {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = () => Date.now(),
    private readonly maxKeys = 10_000,
  ) {}

  check(key: string): RateLimitResult {
    const now = this.now();
    let entry = this.windows.get(key);

    if (!entry || entry.resetAt <= now) {
      this.makeRoom(now);
      entry = { count: 0, resetAt: now + this.windowMs };
      this.windows.set(key, entry);
    }

    entry.count += 1;
    return {
      allowed: entry.count <= this.max,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  /** Acota la memoria: descarta ventanas vencidas y, si hace falta, las más antiguas. */
  private makeRoom(now: number): void {
    if (this.windows.size < this.maxKeys) return;
    for (const [key, entry] of this.windows) {
      if (entry.resetAt <= now) this.windows.delete(key);
    }
    for (const key of this.windows.keys()) {
      if (this.windows.size < this.maxKeys) break;
      this.windows.delete(key);
    }
  }
}

export interface PublicRateLimiters {
  /** Lecturas por cliente. */
  read: RateLimiter;
  /** Envíos de respuesta por cliente. */
  write: RateLimiter;
  /** Envíos de respuesta por invitación (token). */
  writePerToken: RateLimiter;
}

const MINUTE = 60_000;

// En `globalThis` para que todos los bundles de Next.js compartan los mismos contadores.
const globalForLimiters = globalThis as typeof globalThis & {
  __publicRateLimiters?: PublicRateLimiters;
};

export function getPublicRateLimiters(): PublicRateLimiters {
  globalForLimiters.__publicRateLimiters ??= {
    read: new RateLimiter(120, MINUTE),
    write: new RateLimiter(20, MINUTE),
    writePerToken: new RateLimiter(10, MINUTE),
  };
  return globalForLimiters.__publicRateLimiters;
}

/** Solo para pruebas. */
export function resetPublicRateLimiters(): void {
  delete globalForLimiters.__publicRateLimiters;
}

export interface AdminRateLimiters {
  /** Intentos de inicio de sesión por cliente. */
  loginPerClient: RateLimiter;
  /** Intentos de inicio de sesión en total: acota la fuerza bruta distribuida. */
  loginGlobal: RateLimiter;
}

const FIFTEEN_MINUTES = 15 * MINUTE;

const globalForAdminLimiters = globalThis as typeof globalThis & {
  __adminRateLimiters?: AdminRateLimiters;
};

export function getAdminRateLimiters(): AdminRateLimiters {
  globalForAdminLimiters.__adminRateLimiters ??= {
    loginPerClient: new RateLimiter(10, FIFTEEN_MINUTES),
    loginGlobal: new RateLimiter(100, FIFTEEN_MINUTES),
  };
  return globalForAdminLimiters.__adminRateLimiters;
}

/** Solo para pruebas. */
export function resetAdminRateLimiters(): void {
  delete globalForAdminLimiters.__adminRateLimiters;
}
