import { describe, expect, it, vi } from "vitest";

import { PUBLIC_MESSAGES } from "@/lib/public-messages";
import { peopleLabel, registeredMessage, submitRsvp } from "@/lib/rsvp";
import type { PublicInvitation } from "@/types/guest";

const invitation = (overrides: Partial<PublicInvitation> = {}): PublicInvitation => ({
  name: "Familia Pérez",
  allowedGuests: 3,
  confirmedGuests: 0,
  status: "pending",
  ...overrides,
});

describe("mensajes para el invitado", () => {
  it("singular y plural", () => {
    expect(peopleLabel(1)).toBe("1 persona");
    expect(peopleLabel(3)).toBe("3 personas");
  });

  it("confirmación: agradece e indica cuántas personas quedaron registradas", () => {
    const message = registeredMessage(invitation({ status: "confirmed", confirmedGuests: 2 }));
    expect(message.title).toBe("¡Asistencia confirmada!");
    expect(message.body).toContain("Familia Pérez");
    expect(message.body).toContain("2 personas");
  });

  it("rechazo: respuesta amable sin cifras de asistentes", () => {
    const message = registeredMessage(invitation({ status: "declined" }));
    expect(message.title).toBe("Respuesta registrada");
    expect(message.body).toContain("Lamentamos");
    expect(message.body).not.toMatch(/\d/);
  });

  it("pendiente: invita a responder", () => {
    expect(registeredMessage(invitation()).title).toBe("Aún no has respondido");
  });
});

describe("submitRsvp", () => {
  const input = { status: "confirmed", confirmedGuests: 2 } as const;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  it("envía JSON al endpoint con el token codificado y devuelve la invitación", async () => {
    const result = invitation({ status: "confirmed", confirmedGuests: 2 });
    const fetchMock = vi.fn().mockResolvedValue(json({ invitation: result }));

    const outcome = await submitRsvp("tok/en", input, fetchMock);

    expect(outcome).toEqual({ ok: true, invitation: result });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/public/invitaciones/tok%2Fen/respuesta");
    expect(init).toMatchObject({ method: "POST", headers: { "Content-Type": "application/json" } });
    expect(JSON.parse(init.body)).toEqual(input);
  });

  it("muestra el mensaje del servidor cuando rechaza la respuesta (p. ej. cupo)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(json({ error: { code: "VALIDATION", message: "Tu invitación admite hasta 2 personas." } }, 400));

    expect(await submitRsvp("t", input, fetchMock)).toEqual({
      ok: false,
      message: "Tu invitación admite hasta 2 personas.",
    });
  });

  it("sin conexión: dice claramente que la respuesta no se registró", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const outcome = await submitRsvp("t", input, fetchMock);

    expect(outcome).toEqual({ ok: false, message: PUBLIC_MESSAGES.network });
    expect(PUBLIC_MESSAGES.network).toContain("no se registró");
  });

  it("respuesta que no es JSON → mensaje genérico", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("<html>502</html>", { status: 502 }));
    expect(await submitRsvp("t", input, fetchMock)).toEqual({ ok: false, message: PUBLIC_MESSAGES.server });
  });

  it("un 200 con un cuerpo inesperado no se toma como éxito", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ invitation: { name: 5 } }));
    expect(await submitRsvp("t", input, fetchMock)).toEqual({ ok: false, message: PUBLIC_MESSAGES.server });
  });
});
