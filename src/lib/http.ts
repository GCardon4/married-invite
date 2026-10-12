import {
  AppError,
  describeErrorForLog,
  ForbiddenError,
  PayloadTooLargeError,
  TooManyRequestsError,
  UnsupportedMediaTypeError,
  ValidationError,
} from "@/lib/errors";
import { PUBLIC_MESSAGES } from "@/lib/public-messages";
import type { RateLimiter } from "@/lib/rate-limit";

/** El cuerpo de una respuesta legítima ocupa unas decenas de bytes. */
const MAX_BODY_BYTES = 2048;

const BASE_HEADERS = {
  // Contienen datos personales y dependen del token: nunca deben guardarse en cachés.
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

export function jsonResponse(body: unknown, init: { status?: number; headers?: HeadersInit } = {}) {
  return Response.json(body, {
    status: init.status ?? 200,
    headers: { ...BASE_HEADERS, ...init.headers },
  });
}

/**
 * Convierte cualquier error en una respuesta segura para el invitado:
 * mensaje claro en español, sin rutas, tokens ni detalles internos.
 */
export function errorResponse(error: unknown): Response {
  if (!(error instanceof AppError)) {
    console.error(`[http] ${describeErrorForLog(error)}`);
    return publicError(500, "SERVER_ERROR", PUBLIC_MESSAGES.server);
  }

  switch (error.code) {
    case "NOT_FOUND":
      return publicError(404, error.code, PUBLIC_MESSAGES.invalidLink);
    case "VALIDATION":
      // Los mensajes de validación son nuestros (p. ej. el cupo) y no incluyen datos ajenos.
      return publicError(400, error.code, error.message || PUBLIC_MESSAGES.invalidRequest);
    case "FORBIDDEN":
    case "PAYLOAD_TOO_LARGE":
    case "UNSUPPORTED_MEDIA_TYPE":
      return publicError(error.status, error.code, PUBLIC_MESSAGES.forbidden);
    case "RATE_LIMITED": {
      const retryAfter = error instanceof TooManyRequestsError ? error.retryAfterSeconds : 60;
      return publicError(429, error.code, PUBLIC_MESSAGES.tooManyRequests, {
        "Retry-After": String(retryAfter),
      });
    }
    case "CONFLICT":
      return publicError(409, error.code, PUBLIC_MESSAGES.invalidRequest);
    case "CONFIGURATION":
      // Solo el motivo (p. ej. «ADMIN_PASSWORD_HASH-not-set»), nunca valores.
      console.error(`[http] ${describeErrorForLog(error)}`);
      return publicError(500, "SERVER_ERROR", PUBLIC_MESSAGES.server);
    default:
      // PERSISTENCE / DATA_CORRUPTION: el repositorio ya los registró en el log.
      return publicError(500, "SERVER_ERROR", PUBLIC_MESSAGES.server);
  }
}

function publicError(status: number, code: string, message: string, headers?: HeadersInit) {
  return jsonResponse({ error: { code, message } }, { status, headers });
}

/**
 * Identifica al cliente para los límites de uso. Detrás de un proxy inverso (Coolify/Traefik)
 * la última entrada de `X-Forwarded-For` la añade el proxy; las anteriores las controla el cliente.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  return last || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function enforceRateLimit(limiter: RateLimiter, key: string): void {
  const result = limiter.check(key);
  if (!result.allowed) throw new TooManyRequestsError(result.retryAfterSeconds);
}

/**
 * Defensa CSRF para solicitudes que modifican datos: el navegador siempre envía `Origin`
 * en un POST, y debe coincidir con el sitio. Se rechaza si falta o es de otro origen.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) throw new ForbiddenError();

  const allowed = new Set<string>([new URL(request.url).origin]);

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    allowed.add(`${proto}://${forwardedHost}`);
  }

  const baseUrl = process.env.APP_BASE_URL?.trim();
  if (baseUrl) {
    try {
      allowed.add(new URL(baseUrl).origin);
    } catch {
      // APP_BASE_URL mal configurada: se ignora, no amplía los orígenes permitidos.
    }
  }

  if (!allowed.has(origin)) throw new ForbiddenError();
}

/** Lee el cuerpo JSON con tipo y tamaño acotados, cortando la lectura al pasarse del límite. */
export async function readJsonBody(request: Request, maxBytes = MAX_BODY_BYTES): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json\s*(;|$)/i.test(contentType)) throw new UnsupportedMediaTypeError();

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new PayloadTooLargeError();

  const reader = request.body?.getReader();
  if (!reader) throw new ValidationError();

  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }
    chunks.push(value);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ValidationError();
  }
}
