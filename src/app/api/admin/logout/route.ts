import { adminErrorResponse } from "@/lib/admin-api";
import { assertSameOrigin, jsonResponse } from "@/lib/http";
import {
  getSessionStore,
  readSessionCookie,
  serializeClearedSessionCookie,
} from "@/lib/session";

/** Invalida la sesión en el servidor y elimina la cookie. Es idempotente. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    getSessionStore().destroy(readSessionCookie(request));
    return jsonResponse(
      { ok: true },
      { headers: { "Set-Cookie": serializeClearedSessionCookie() } },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
