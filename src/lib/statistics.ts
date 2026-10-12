import type { Guest, GuestStatistics } from "@/types/guest";

/**
 * Estadísticas calculadas sobre los registros actuales (DATA_MODEL §12). No se guardan:
 * así nunca pueden desincronizarse de los invitados.
 */
export function computeStatistics(guests: readonly Pick<Guest, "status" | "allowedGuests" | "confirmedGuests">[]): GuestStatistics {
  const stats: GuestStatistics = {
    totalInvitations: guests.length,
    pendingInvitations: 0,
    confirmedInvitations: 0,
    declinedInvitations: 0,
    totalConfirmedGuests: 0,
    totalAllowedGuests: 0,
  };

  for (const guest of guests) {
    stats.totalAllowedGuests += guest.allowedGuests;
    if (guest.status === "pending") stats.pendingInvitations += 1;
    else if (guest.status === "declined") stats.declinedInvitations += 1;
    else {
      stats.confirmedInvitations += 1;
      stats.totalConfirmedGuests += guest.confirmedGuests;
    }
  }
  return stats;
}
