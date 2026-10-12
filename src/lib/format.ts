import type { GuestStatus } from "@/types/guest";

const formatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

/** Fecha ISO 8601 → texto en hora de Colombia. `null` se muestra como guion. */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : formatter.format(date);
}

export const STATUS_LABEL: Record<GuestStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  declined: "Rechazada",
};
