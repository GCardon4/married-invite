import type { AdminGuest } from "@/types/guest";

export interface FieldIssue {
  path: string;
  message: string;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; issues: FieldIssue[] };

export interface GuestWithLink {
  guest: AdminGuest;
  token: string;
  link: string;
  /** Enlace de WhatsApp listo para enviar, o `null` si el teléfono del invitado no es utilizable. */
  whatsappUrl: string | null;
}

const NETWORK_MESSAGE =
  "No pudimos conectarnos con el servidor. Revisa tu conexión: el cambio no se guardó.";
const GENERIC_MESSAGE = "Ocurrió un problema. Inténtalo de nuevo; si persiste, revisa los registros del servidor.";
const SESSION_EXPIRED_MESSAGE = "Tu sesión expiró. Vuelve a iniciar sesión.";

/**
 * Llama a la API administrativa. Nunca lanza: devuelve un mensaje claro. El servidor es quien
 * decide los permisos; esto solo presenta los resultados.
 */
export async function adminRequest<T>(
  path: string,
  init: { method: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown },
  fetchImpl: typeof fetch = fetch,
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetchImpl(path, {
      method: init.method,
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, message: NETWORK_MESSAGE, issues: [] };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Cuerpo vacío o que no es JSON: se trata por el código de estado.
  }

  if (response.ok) return { ok: true, data: payload as T };

  const error = (payload as { error?: { message?: unknown; issues?: unknown } } | null)?.error;
  const message =
    response.status === 401
      ? SESSION_EXPIRED_MESSAGE
      : typeof error?.message === "string" && error.message
        ? error.message
        : GENERIC_MESSAGE;
  const issues = Array.isArray(error?.issues) ? (error.issues as FieldIssue[]) : [];
  return { ok: false, status: response.status, message, issues };
}

/** Si la sesión venció, lleva al inicio de sesión con la navegación que se le pase (p. ej. `router.replace`). */
export function redirectIfUnauthorized(result: ApiResult<unknown>, navigate: (path: string) => void): void {
  if (!result.ok && result.status === 401) navigate("/admin/login");
}
