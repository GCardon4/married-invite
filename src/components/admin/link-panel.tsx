"use client";

import { useId, useRef, useState } from "react";

import { buttonPrimary, buttonWhatsApp, focusRing, inputClass } from "./ui";

/**
 * Muestra el enlace de una invitación recién creada o regenerada. Solo se almacena el hash
 * del token, así que esta es la única oportunidad de copiarlo.
 */
export function LinkPanel({
  link,
  title,
  whatsappUrl,
}: {
  link: string;
  title: string;
  /** `string`: enlace de WhatsApp listo. `null`: el invitado no tiene un teléfono utilizable. `undefined`: no aplica. */
  whatsappUrl?: string | null;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setFeedback("¡Enlace copiado!");
    } catch {
      inputRef.current?.select();
      setFeedback("No pudimos copiarlo automáticamente: el enlace quedó seleccionado, copia con Ctrl+C.");
    }
  }

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-2xl border-[1.5px] border-tangerine/40 bg-peach/15 p-5">
      <h3 id={`${id}-title`} className="font-display text-xl font-semibold text-primary">
        {title}
      </h3>
      <p className="mt-1 text-sm">
        Cópialo ahora y envíalo al invitado: <strong>por seguridad no se puede volver a mostrar</strong>.
        Si lo pierdes, genera uno nuevo.
      </p>
      <label htmlFor={`${id}-link`} className="sr-only">
        Enlace de la invitación
      </label>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id={`${id}-link`}
          ref={inputRef}
          readOnly
          value={link}
          onFocus={(event) => event.currentTarget.select()}
          className={`${inputClass} font-mono text-sm`}
        />
        <button type="button" onClick={copy} className={`${buttonPrimary} shrink-0 ${focusRing}`}>
          Copiar enlace
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm font-semibold text-primary">
        {feedback}
      </p>

      {whatsappUrl && (
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={`${buttonWhatsApp} mt-3 w-full sm:w-auto`}>
          Enviar por WhatsApp
          <span className="sr-only"> (se abre en una pestaña nueva)</span>
        </a>
      )}
      {whatsappUrl === null && (
        <p className="mt-3 text-sm">
          Para enviarlo por WhatsApp, agrega a esta invitación un teléfono válido con código de país (por ejemplo{" "}
          <strong>+57 300 123 4567</strong>).
        </p>
      )}
    </section>
  );
}
