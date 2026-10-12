import { withAdmin } from "@/lib/admin-api";
import { getGuestService } from "@/lib/guest-service";
import { jsonResponse, readJsonBody } from "@/lib/http";

export function GET(request: Request, ctx: RouteContext<"/api/admin/invitados/[id]">) {
  return withAdmin(request, { mutating: false }, async () => {
    const { id } = await ctx.params;
    return jsonResponse({ guest: await getGuestService().getGuest(id) });
  });
}

/** Actualización parcial: nombre, contacto y cupo. El estado y el token no se modifican aquí. */
export function PATCH(request: Request, ctx: RouteContext<"/api/admin/invitados/[id]">) {
  return withAdmin(request, { mutating: true }, async () => {
    const { id } = await ctx.params;
    const guest = await getGuestService().updateGuest(id, await readJsonBody(request));
    return jsonResponse({ guest });
  });
}

export function DELETE(request: Request, ctx: RouteContext<"/api/admin/invitados/[id]">) {
  return withAdmin(request, { mutating: true }, async () => {
    const { id } = await ctx.params;
    await getGuestService().deleteGuest(id);
    return jsonResponse({ ok: true });
  });
}
