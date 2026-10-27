import writeXlsxFile from "write-excel-file/node";

import { formatDateTime, STATUS_LABEL } from "@/lib/format";
import type { AdminGuest } from "@/types/guest";

export const EXPORT_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const HEADERS = ["Nombre", "Cantidad de invitados", "Asistentes confirmados", "Estado", "Fecha de respuesta"];

/**
 * Libro de Excel con una fila por invitación. No incluye teléfono, correo ni token: solo lo que
 * el panel necesita para llevar la cuenta. Todo va como texto o número tipados (nunca como
 * fórmula), así que un nombre como «=SUMA(…)» se muestra literal. La fecha va en hora de Colombia.
 */
export async function buildGuestWorkbook(guests: AdminGuest[]): Promise<Buffer> {
  const rows = [
    HEADERS.map((value) => ({ value, fontWeight: "bold" as const })),
    ...guests.map((guest) => [
      { type: String, value: guest.name },
      { type: Number, value: guest.allowedGuests },
      { type: Number, value: guest.confirmedGuests },
      { type: String, value: STATUS_LABEL[guest.status] },
      { type: String, value: guest.respondedAt ? formatDateTime(guest.respondedAt) : "Sin respuesta" },
    ]),
  ];

  return writeXlsxFile(rows, {
    sheet: "Invitados",
    columns: [{ width: 34 }, { width: 22 }, { width: 24 }, { width: 14 }, { width: 24 }],
    stickyRowsCount: 1,
  }).toBuffer();
}

/** Nombre del archivo con la fecha de hoy en hora de Colombia: `invitados-2026-10-26.xlsx`. */
export function exportFileName(now: Date = new Date()): string {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(now);
  return `invitados-${day}.xlsx`;
}
