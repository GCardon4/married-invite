import { buildInvitationLink, withAdmin } from "@/lib/admin-api";
import { getGuestService } from "@/lib/guest-service";
import { jsonResponse } from "@/lib/http";

/**
 * Regenera el enlace: el anterior deja de funcionar de inmediato y el nuevo
 * se devuelve una sola vez, porque solo se almacena su hash.
 */
export function POST(request: Request, ctx: RouteContext<"/api/admin/invitados/[id]/enlace">) {
  return withAdmin(request, { mutating: true }, async () => {
    const { id } = await ctx.params;
    const { guest, token } = await getGuestService().regenerateToken(id);
    return jsonResponse({ guest, token, link: buildInvitationLink(request, token) });
  });
}
