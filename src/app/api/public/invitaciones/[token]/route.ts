import { clientKey, enforceRateLimit, errorResponse, jsonResponse } from "@/lib/http";
import { getGuestService } from "@/lib/guest-service";
import { getPublicRateLimiters } from "@/lib/rate-limit";

/** Consulta la invitación asociada al token. Solo devuelve la proyección pública. */
export async function GET(request: Request, ctx: RouteContext<"/api/public/invitaciones/[token]">) {
  try {
    enforceRateLimit(getPublicRateLimiters().read, clientKey(request));
    const { token } = await ctx.params;
    const invitation = await getGuestService().getPublicInvitation(token);
    return jsonResponse({ invitation });
  } catch (error) {
    return errorResponse(error);
  }
}
