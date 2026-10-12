import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as publicGet } from "@/app/api/public/invitaciones/[token]/route";
import { POST as publicPost } from "@/app/api/public/invitaciones/[token]/respuesta/route";
import { NotFoundError } from "@/lib/errors";
import { FileGuestRepository } from "@/lib/guest-repository";
import { GuestService } from "@/lib/guest-service";
import { resetPublicRateLimiters } from "@/lib/rate-limit";
import { guestSchema } from "@/lib/validations";

import { makeGuest, newDataFile } from "./helpers";

/**
 * Garantía: el enlace de una invitación NO caduca. Solo deja de funcionar si el administrador lo
 * regenera o elimina la invitación. El tiempo no interviene al abrirlo ni al responder.
 */
const DAY = 86_400_000;
const START = new Date("2026-10-15T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(START);
  resetPublicRateLimiters();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const travel = (days: number) => vi.setSystemTime(new Date(START.getTime() + days * DAY));

describe("los enlaces de invitación no caducan", () => {
  it.each([
    ["3 meses", 90],
    ["6 meses", 180],
    ["la fecha de la boda (8 de enero de 2027)", 85],
    ["3 meses después de la boda", 85 + 90],
    ["1 año", 365],
    ["3 años", 1095],
  ])("sigue abriéndose y permite responder después de %s", async (_name, days) => {
    const file = await newDataFile();
    const created = await new GuestService(new FileGuestRepository(file)).createGuest({
      name: "Familia Pérez",
      allowedGuests: 3,
    });

    travel(days);
    // Una instancia nueva sobre el mismo archivo equivale a haber reiniciado el servidor.
    const service = new GuestService(new FileGuestRepository(file));

    expect(await service.getPublicInvitation(created.token)).toMatchObject({ name: "Familia Pérez", status: "pending" });
    expect(await service.submitResponse(created.token, { status: "confirmed", confirmedGuests: 2 })).toMatchObject({
      status: "confirmed",
      confirmedGuests: 2,
    });
    // Y se puede cambiar de opinión más adelante.
    expect(await service.submitResponse(created.token, { status: "declined", confirmedGuests: 0 })).toMatchObject({
      status: "declined",
    });
  });

  it("por la API pública, 6 meses después, igual que el primer día", async () => {
    const file = await newDataFile();
    vi.stubEnv("DATA_FILE_PATH", file);
    const { token } = await new GuestService(new FileGuestRepository(file)).createGuest({ name: "Ana", allowedGuests: 2 });
    const ctx = { params: Promise.resolve({ token }) } as never;

    travel(180);

    expect((await publicGet(new Request(`http://localhost:3000/api/public/invitaciones/${token}`), ctx)).status).toBe(200);
    const answered = await publicPost(
      new Request(`http://localhost:3000/api/public/invitaciones/${token}/respuesta`, {
        method: "POST",
        headers: { origin: "http://localhost:3000", "content-type": "application/json" },
        body: JSON.stringify({ status: "confirmed", confirmedGuests: 2 }),
      }),
      ctx,
    );
    expect(answered.status).toBe(200);
  });

  it("la invitación no guarda ninguna fecha de vencimiento: el modelo no tiene ese campo", () => {
    const guest = makeGuest();
    expect(Object.keys(guest).filter((key) => /expir|venc|valid|ttl/i.test(key))).toEqual([]);
    // El esquema es estricto: un campo de caducidad no podría colarse en el archivo.
    expect(guestSchema.safeParse({ ...guest, expiresAt: "2026-12-01T00:00:00.000Z" }).success).toBe(false);
  });

  it("las únicas formas de invalidar un enlace son regenerarlo o eliminar la invitación", async () => {
    const service = new GuestService(new FileGuestRepository(await newDataFile()));
    const a = await service.createGuest({ name: "A", allowedGuests: 1 });
    const b = await service.createGuest({ name: "B", allowedGuests: 1 });

    travel(400);
    await expect(service.getPublicInvitation(a.token)).resolves.toBeDefined();
    await expect(service.getPublicInvitation(b.token)).resolves.toBeDefined();

    const regenerated = await service.regenerateToken(a.guest.id);
    await expect(service.getPublicInvitation(a.token)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.getPublicInvitation(regenerated.token)).resolves.toBeDefined();

    await service.deleteGuest(b.guest.id);
    await expect(service.getPublicInvitation(b.token)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("consultar o responder no modifica ni acorta el enlace (sigue siendo el mismo token meses después)", async () => {
    const file = await newDataFile();
    const service = new GuestService(new FileGuestRepository(file));
    const { token } = await service.createGuest({ name: "Ana", allowedGuests: 2 });

    for (const days of [1, 10, 40, 95, 200]) {
      travel(days);
      await service.getPublicInvitation(token);
      await service.submitResponse(token, { status: "confirmed", confirmedGuests: 1 });
    }
    expect(await service.getPublicInvitation(token)).toMatchObject({ status: "confirmed" });
  });
});
