import { buildInvitationLink, queryToObject, withAdmin } from "@/lib/admin-api";
import { getGuestService } from "@/lib/guest-service";
import { jsonResponse, readJsonBody } from "@/lib/http";
import { buildInvitationWhatsAppUrl } from "@/lib/whatsapp";

/** Lista y busca invitaciones: `search`, `status`, `page` y `limit`. */
export function GET(request: Request) {
  return withAdmin(request, { mutating: false }, async () => {
    const result = await getGuestService().listGuests(queryToObject(request.url));
    return jsonResponse(result);
  });
}

/** Crea una invitación. El enlace con el token en claro solo se devuelve en esta respuesta. */
export function POST(request: Request) {
  return withAdmin(request, { mutating: true }, async () => {
    const { guest, token } = await getGuestService().createGuest(await readJsonBody(request));
    const link = buildInvitationLink(request, token);
    return jsonResponse(
      { guest, token, link, whatsappUrl: buildInvitationWhatsAppUrl(guest, link) },
      { status: 201 },
    );
  });
}
