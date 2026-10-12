"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { adminRequest, redirectIfUnauthorized, type GuestWithLink } from "@/lib/admin-client";

import { ConfirmDialog } from "./confirm-dialog";
import { LinkPanel } from "./link-panel";
import { buttonWhatsApp } from "./ui";

type Step = "closed" | "confirm" | "working" | "ready";

function ChatIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.7-5.4A8.4 8.4 0 1 1 21 11.5z" />
    </svg>
  );
}

/**
 * Envía la invitación por WhatsApp desde el panel. El enlace de una invitación existente no se
 * puede recuperar (solo se guarda su huella), así que se genera uno nuevo y el anterior deja de
 * funcionar: por eso pide confirmación. WhatsApp se abre con un clic en el último paso para que el
 * navegador no bloquee la ventana por abrirse tras una petición.
 */
export function WhatsAppSendButton({
  guestId,
  guestName,
  phoneDisplay,
  compact = false,
}: {
  guestId: string;
  guestName: string;
  /** Número internacional que se usará (p. ej. `+573001234567`), o `null` si el teléfono no es utilizable. */
  phoneDisplay: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("closed");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GuestWithLink | null>(null);

  if (!phoneDisplay) {
    return (
      <Link
        href={`/admin/invitados/${guestId}`}
        title="Falta un teléfono válido con código de país"
        className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
      >
        Agregar teléfono
      </Link>
    );
  }

  async function generate() {
    setStep("working");
    setError(null);
    const response = await adminRequest<GuestWithLink>(`/api/admin/invitados/${encodeURIComponent(guestId)}/enlace`, {
      method: "POST",
    });

    if (!response.ok) {
      redirectIfUnauthorized(response, router.replace);
      setError(response.message);
      setStep("confirm");
      return;
    }
    if (!response.data.whatsappUrl) {
      setError("No se pudo preparar el mensaje de WhatsApp: revisa el teléfono de la invitación.");
      setStep("confirm");
      return;
    }
    setResult(response.data);
    setStep("ready");
  }

  function close() {
    if (step === "working") return;
    const wasReady = step === "ready";
    setStep("closed");
    setResult(null);
    setError(null);
    if (wasReady) router.refresh(); // el enlace nuevo ya está activo: actualiza «modificada», etc.
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setStep("confirm")}
        className={compact ? `${buttonWhatsApp} px-3 py-2` : buttonWhatsApp}
        aria-label={`Enviar la invitación de ${guestName} por WhatsApp`}
      >
        <ChatIcon />
        WhatsApp
      </button>

      <ConfirmDialog
        open={step === "confirm" || step === "working"}
        title="¿Enviar por WhatsApp?"
        confirmLabel="Preparar mensaje"
        busy={step === "working"}
        onConfirm={generate}
        onCancel={close}
      >
        <p>
          Vas a enviar la invitación de <strong>{guestName}</strong> al número <strong>{phoneDisplay}</strong>.
        </p>
        <p>
          Se generará un <strong>enlace nuevo</strong>: si ya le habías enviado uno a esta persona, dejará de
          funcionar. Su respuesta, si ya respondió, se conserva.
        </p>
        {error && (
          <p role="alert" className="rounded-xl bg-error/10 p-3 font-medium text-error">
            {error}
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={step === "ready"}
        title="Invitación lista"
        confirmLabel=""
        hideConfirm
        cancelLabel="Cerrar"
        onConfirm={close}
        onCancel={close}
      >
        {result && (
          <>
            <p>
              Pulsa el botón para abrir WhatsApp con el mensaje listo para <strong>{guestName}</strong>. Tú decides
              cuándo enviarlo desde WhatsApp.
            </p>
            <LinkPanel link={result.link} title="Enlace de la invitación" whatsappUrl={result.whatsappUrl} />
          </>
        )}
      </ConfirmDialog>
    </>
  );
}

