import { adminErrorResponse } from "@/lib/admin-api";
import { verifyAdminPassword } from "@/lib/auth";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import {
  assertSameOrigin,
  clientKey,
  enforceRateLimit,
  jsonResponse,
  readJsonBody,
} from "@/lib/http";
import { getAdminRateLimiters } from "@/lib/rate-limit";
import { getSessionStore, serializeSessionCookie } from "@/lib/session";
import { loginInputSchema } from "@/lib/validations";

/** Los errores de autenticación son genéricos: no indican qué falló ni cómo está configurado el sistema. */
const INVALID_CREDENTIALS = "Contraseña incorrecta.";

export async function POST(request: Request) {
  try {
    const limiters = getAdminRateLimiters();
    enforceRateLimit(limiters.loginPerClient, clientKey(request));
    enforceRateLimit(limiters.loginGlobal, "all");
    assertSameOrigin(request);

    const parsed = loginInputSchema.safeParse(await readJsonBody(request, 1024));
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message);

    if (!(await verifyAdminPassword(parsed.data.password))) {
      throw new UnauthorizedError(INVALID_CREDENTIALS);
    }

    const { cookieValue, maxAgeSeconds } = getSessionStore().create();
    return jsonResponse(
      { ok: true },
      { headers: { "Set-Cookie": serializeSessionCookie(cookieValue, maxAgeSeconds) } },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
