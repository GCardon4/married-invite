export type GuestStatus = "pending" | "confirmed" | "declined";

export interface Guest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;

  allowedGuests: number;
  confirmedGuests: number;
  status: GuestStatus;

  tokenHash: string;

  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
}

export interface GuestDatabase {
  schemaVersion: 1;
  guests: Guest[];
}

/** Vista administrativa de un invitado: nunca incluye `tokenHash`. */
export type AdminGuest = Omit<Guest, "tokenHash">;

/**
 * Proyección pública y deliberadamente limitada de una invitación.
 * Nunca se debe devolver el objeto `Guest` completo a un invitado.
 */
export interface PublicInvitation {
  name: string;
  allowedGuests: number;
  confirmedGuests: number;
  status: GuestStatus;
}

export interface GuestResponseInput {
  status: "confirmed" | "declined";
  confirmedGuests: number;
}

/** Estadísticas calculadas sobre los registros actuales (DATA_MODEL §12). */
export interface GuestStatistics {
  totalInvitations: number;
  pendingInvitations: number;
  confirmedInvitations: number;
  declinedInvitations: number;
  totalConfirmedGuests: number;
  totalAllowedGuests: number;
}
