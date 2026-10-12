import {
  assertSameOrigin,
  clientKey,
  enforceRateLimit,
  errorResponse,
  jsonResponse,
  readJsonBody,
} from "@/lib/http";
import { getGuestService } from "@/lib/guest-service";
import { getPublicRateLimiters } from "@/lib/rate-limit";
import { hashToken } from "@/lib/token";

/**
 * Registra o actualiza la respuesta del invitado. El estado y el número de
 * asistentes se validan en el servidor contra el cupo almacenado.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/public/invitaciones/[token]/respuesta">,
) {
  try {
    const limiters = getPublicRateLimiters();
    enforceRateLimit(limiters.write, clientKey(request));
    assertSameOrigin(request);

    const { token } = await ctx.params;
    enforceRateLimit(limiters.writePerToken, hashToken(token));

    const body = await readJsonBody(request);
    const invitation = await getGuestService().submitResponse(token, body);
    return jsonResponse({ invitation });
  } catch (error) {
    return errorResponse(error);
  }
}
