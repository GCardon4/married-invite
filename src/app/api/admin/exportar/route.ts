import { withAdmin } from "@/lib/admin-api";
import { buildGuestWorkbook, EXPORT_CONTENT_TYPE, exportFileName } from "@/lib/guest-export";
import { getGuestService } from "@/lib/guest-service";

/** Descarga las invitaciones en Excel. Solo lectura, pero exige sesión de administrador. */
export function GET(request: Request) {
  return withAdmin(request, { mutating: false }, async () => {
    const file = await buildGuestWorkbook(await getGuestService().listAllGuests());
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": EXPORT_CONTENT_TYPE,
        "Content-Disposition": `attachment; filename="${exportFileName()}"`,
        // Datos personales: nunca deben guardarse en cachés.
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  });
}
