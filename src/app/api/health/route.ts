import { getGuestService } from "@/lib/guest-service";
import { jsonResponse } from "@/lib/http";

/**
 * Sonda de salud para Docker/Coolify. Comprueba que el archivo de datos se puede leer y es
 * válido (volumen montado, permisos, JSON íntegro), de modo que un despliegue que no pueda
 * usar los datos no reemplace a la versión que sí funciona. Solo responde «ok» o «error»:
 * no devuelve datos, rutas ni detalles (el motivo queda en los registros del servidor).
 */
export async function GET() {
  try {
    await getGuestService().getStatistics(); // lee y valida el archivo completo
    return jsonResponse({ status: "ok" });
  } catch {
    return jsonResponse({ status: "error" }, { status: 503 });
  }
}
