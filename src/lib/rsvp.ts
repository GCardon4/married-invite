import { PUBLIC_MESSAGES } from "@/lib/public-messages";
import type { GuestResponseInput, PublicInvitation } from "@/types/guest";

export function peopleLabel(count: number): string {
  return `${count} ${count === 1 ? "persona" : "personas"}`;
}

/** Mensaje que ve el invitado una vez registrada (o consultada) su respuesta. */
export function registeredMessage(invitation: PublicInvitation): { title: string; body: string } {
  switch (invitation.status) {
    case "confirmed":
      return {
        title: "¡Asistencia confirmada!",
        body: `Gracias, ${invitation.name}. Registramos tu asistencia para ${peopleLabel(invitation.confirmedGuests)}. ¡Nos hará muy felices compartir este día contigo!`,
      };
    case "declined":
      return {
        title: "Respuesta registrada",
        body: `Gracias por avisarnos, ${invitation.name}. Lamentamos que no puedas acompañarnos y agradecemos tus buenos deseos.`,
      };
    default:
      return {
        title: "Aún no has respondido",
        body: "Cuéntanos si podrás acompañarnos.",
      };
  }
}

export type SubmitResult =
  | { ok: true; invitation: PublicInvitation }
  | { ok: false; message: string };

function isPublicInvitation(value: unknown): value is PublicInvitation {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === "string" &&
    typeof v.allowedGuests === "number" &&
    typeof v.confirmedGuests === "number" &&
    (v.status === "pending" || v.status === "confirmed" || v.status === "declined")
  );
}

/**
 * Envía la respuesta al servidor. Nunca lanza: devuelve un mensaje claro y deja
 * explícito que, si falla, la respuesta NO quedó registrada.
 */
export async function submitRsvp(
  token: string,
  input: GuestResponseInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitResult> {
  let response: Response;
  try {
    response = await fetchImpl(
      `/api/public/invitaciones/${encodeURIComponent(token)}/respuesta`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        cache: "no-store",
      },
    );
  } catch {
    return { ok: false, message: PUBLIC_MESSAGES.network };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, message: PUBLIC_MESSAGES.server };
  }

  const body = (payload ?? {}) as { invitation?: unknown; error?: { message?: unknown } };
  if (response.ok && isPublicInvitation(body.invitation)) {
    return { ok: true, invitation: body.invitation };
  }

  const message = body.error?.message;
  return {
    ok: false,
    message: typeof message === "string" && message ? message : PUBLIC_MESSAGES.server,
  };
}
