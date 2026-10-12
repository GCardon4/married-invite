"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { buttonDanger, buttonPrimary, buttonSecondary } from "./ui";

/** Diálogo modal nativo: gestiona el foco, `Esc` y el fondo inerte sin código adicional. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  busy = false,
  hideConfirm = false,
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  /** Para diálogos que solo informan (se muestra únicamente el botón de cerrar). */
  hideConfirm?: boolean;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-primary/10 bg-card p-6 text-primary shadow-xl backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      <h2 id={`${id}-title`} className="font-display text-2xl font-semibold text-primary">
        {title}
      </h2>
      <div className="mt-3 space-y-2 text-sm leading-6">{children}</div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={busy} className={buttonSecondary}>
          {cancelLabel}
        </button>
        {!hideConfirm && (
          <button type="button" onClick={onConfirm} disabled={busy} className={danger ? buttonDanger : buttonPrimary}>
            {busy ? "Procesando…" : confirmLabel}
          </button>
        )}
      </div>
    </dialog>
  );
}
