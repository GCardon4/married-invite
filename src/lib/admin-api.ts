import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { assertSameOrigin, errorResponse, jsonResponse } from "@/lib/http";
import { getSessionStore, readSessionCookie } from "@/lib/session";

/** Convierte los parámetros de búsqueda en un objeto, omitiendo los vacíos (`status=`). */
export function queryToObject(url: string): Record<string, string> {
  const entries = [...new URL(url).searchParams.entries()].filter(([, value]) => value !== "");
  return Object.fromEntries(entries);
}

/**
 * Único punto de entrada de los endpoints administrativos: exige una sesión válida ANTES
 * de ejecutar cualquier lógica y, en las operaciones que modifican datos, que la solicitud
 * provenga del propio sitio. Un endpoint nuevo no debe responder sin pasar por aquí.
 */
export async function withAdmin(
  request: Request,
  options: { mutating: boolean },
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    if (!getSessionStore().validate(readSessionCookie(request))) throw new UnauthorizedError();
    if (options.mutating) assertSameOrigin(request);
    return await handler();
  } catch (error) {
    return adminErrorResponse(error);
  }
}

/**
 * Errores para el administrador: pueden ser más específicos que los públicos (campos
 * inválidos, conflictos), pero nunca incluyen rutas, secretos ni detalles internos.
 */
export function adminErrorResponse(error: unknown): Response {
  if (error instanceof UnauthorizedError) {
    return jsonResponse({ error: { code: error.code, message: error.message } }, { status: 401 });
  }
  if (error instanceof ValidationError) {
    return jsonResponse(
      { error: { code: error.code, message: error.message, issues: error.issues } },
      { status: 400 },
    );
  }
  if (error instanceof NotFoundError || error instanceof ConflictError) {
    return jsonResponse(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  // 403, 413, 415, 429 y 500 usan los mismos mensajes seguros que la API pública.
  return errorResponse(error);
}

/** Enlace completo de una invitación. Solo se calcula cuando se conoce el token en texto plano. */
export function buildInvitationLink(request: Request, token: string): string {
  return `${siteBase(request)}/invitacion/${token}`;
}

function siteBase(request: Request): string {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
    } catch {
      // APP_BASE_URL inválida: se usa el origen de la solicitud.
    }
  }

  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (host) {
    const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}
