import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";

import { buildGuestWorkbook, exportFileName } from "@/lib/guest-export";
import type { AdminGuest } from "@/types/guest";

const guest = (overrides: Partial<AdminGuest>): AdminGuest => ({
  id: "guest_0123456789abcdef",
  name: "Familia Pérez",
  email: "perez@example.com",
  phone: "+57 300 111 2222",
  allowedGuests: 3,
  confirmedGuests: 0,
  status: "pending",
  createdAt: "2026-10-01T12:00:00.000Z",
  updatedAt: "2026-10-01T12:00:00.000Z",
  respondedAt: null,
  ...overrides,
});

async function sheetText(guests: AdminGuest[]): Promise<string> {
  const files = unzipSync(new Uint8Array(await buildGuestWorkbook(guests)));
  return Object.entries(files)
    .filter(([name]) => name.startsWith("xl/") && name.endsWith(".xml"))
    .map(([, data]) => strFromU8(data))
    .join("\n");
}

describe("exportación a Excel", () => {
  it("genera un .xlsx con nombre, cupo, estado y fecha de cada invitación", async () => {
    const xml = await sheetText([
      guest({}),
      guest({ name: "Ana", allowedGuests: 2, confirmedGuests: 2, status: "confirmed", respondedAt: "2026-10-20T15:00:00.000Z" }),
    ]);

    for (const text of ["Nombre", "Cantidad de invitados", "Estado", "Fecha de respuesta", "Familia Pérez", "Ana", "Pendiente", "Confirmada", "Sin respuesta"]) {
      expect(xml).toContain(text);
    }
    expect(xml).toContain("20/10/2026"); // fecha de respuesta, en hora de Colombia
  });

  it("no incluye teléfono, correo ni datos de acceso", async () => {
    const xml = await sheetText([guest({})]);
    expect(xml).not.toContain("perez@example.com");
    expect(xml).not.toContain("300 111");
  });

  it("un nombre con forma de fórmula no se guarda como fórmula", async () => {
    const xml = await sheetText([guest({ name: "=HYPERLINK(\"http://x\")" })]);
    expect(xml).not.toContain("<f>");
  });

  it("el archivo lleva la fecha de hoy en hora de Colombia", () => {
    expect(exportFileName(new Date("2026-10-27T03:00:00.000Z"))).toBe("invitados-2026-10-26.xlsx");
  });
});
