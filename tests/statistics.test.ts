import { describe, expect, it } from "vitest";

import { computeStatistics } from "@/lib/statistics";

describe("computeStatistics", () => {
  it("sin invitaciones todo es cero", () => {
    expect(computeStatistics([])).toEqual({
      totalInvitations: 0,
      pendingInvitations: 0,
      confirmedInvitations: 0,
      declinedInvitations: 0,
      totalConfirmedGuests: 0,
      totalAllowedGuests: 0,
    });
  });

  it("cuenta por estado y distingue asistentes confirmados de cupos autorizados", () => {
    const stats = computeStatistics([
      { status: "confirmed", allowedGuests: 4, confirmedGuests: 3 },
      { status: "confirmed", allowedGuests: 2, confirmedGuests: 2 },
      { status: "declined", allowedGuests: 5, confirmedGuests: 0 },
      { status: "pending", allowedGuests: 1, confirmedGuests: 0 },
      { status: "pending", allowedGuests: 2, confirmedGuests: 0 },
    ]);

    expect(stats).toEqual({
      totalInvitations: 5,
      pendingInvitations: 2,
      confirmedInvitations: 2,
      declinedInvitations: 1,
      totalConfirmedGuests: 5,
      totalAllowedGuests: 14,
    });
    expect(stats.pendingInvitations + stats.confirmedInvitations + stats.declinedInvitations).toBe(
      stats.totalInvitations,
    );
  });
});
