"use client";

import { useId, useRef, useState } from "react";

import { buttonPrimary, focusRing, inputClass } from "./ui";

/**
 * Muestra el enlace de una invitación recién creada o regenerada. Solo se almacena el hash
 * del token, así que esta es la única oportunidad de copiarlo.
 */
export function LinkPanel({ link, title }: { link: string; title: string }) {
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
      <h3 id={`${id}-title`} className="font-display text-xl font-semibold text-plum">
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
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm font-semibold text-plum">
        {feedback}
      </p>
    </section>
  );
}
