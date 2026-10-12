"use client";

import { useId, useState, type FormEvent } from "react";

import { peopleLabel, registeredMessage, submitRsvp } from "@/lib/rsvp";
import type { PublicInvitation } from "@/types/guest";

type Choice = "confirmed" | "declined";

const OPTIONS: { value: Choice; title: string; hint: string }[] = [
  { value: "confirmed", title: "¡Sí, con mucho gusto asistiré!", hint: "Será un honor contar contigo." },
  { value: "declined", title: "Lamentablemente no podré", hint: "Nos acompañarás con tus buenos deseos." },
];

export function RsvpForm({ token, initial }: { token: string; initial: PublicInvitation }) {
  const groupId = useId();
  const [invitation, setInvitation] = useState(initial);
  const [editing, setEditing] = useState(initial.status === "pending");
  const [choice, setChoice] = useState<Choice | null>(
    initial.status === "pending" ? null : initial.status,
  );
  const [count, setCount] = useState(initial.status === "confirmed" ? initial.confirmedGuests : 1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const max = invitation.allowedGuests;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (!choice) {
      setError("Elige una de las dos opciones para continuar.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await submitRsvp(token, {
      status: choice,
      confirmedGuests: choice === "confirmed" ? count : 0,
    });
    setSubmitting(false);

    if (result.ok) {
      setInvitation(result.invitation);
      setEditing(false);
    } else {
      setError(result.message);
    }
  }

  if (!editing) {
    const message = registeredMessage(invitation);
    return (
      <section
        aria-labelledby={`${groupId}-title`}
        className="rounded-3xl border border-plum/10 bg-card p-6 text-center shadow-[0_8px_24px_-4px_rgba(74,90,77,0.08)]"
      >
        <div role="status" aria-live="polite">
          <h2 id={`${groupId}-title`} className="font-display text-2xl font-semibold text-plum">
            {message.title}
          </h2>
          <p className="mt-3 leading-7">{message.body}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setChoice(invitation.status === "pending" ? null : invitation.status);
            setCount(invitation.status === "confirmed" ? invitation.confirmedGuests : 1);
            setError(null);
            setEditing(true);
          }}
          className="mt-5 rounded-[10px] border-[1.5px] border-ink px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-ink/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum"
        >
          Cambiar mi respuesta
        </button>
      </section>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-labelledby={`${groupId}-title`}
      className="rounded-3xl border border-plum/10 bg-card p-6 shadow-[0_8px_24px_-4px_rgba(74,90,77,0.08)]"
    >
      <h2 id={`${groupId}-title`} className="font-display text-2xl font-semibold text-plum">
        ¿Nos acompañas?
      </h2>
      <p className="mt-1 text-sm">
        Tu invitación es válida para hasta <strong>{peopleLabel(max)}</strong>.
      </p>

      <fieldset className="mt-5 space-y-3" disabled={submitting}>
        <legend className="sr-only">Tu respuesta</legend>
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`block cursor-pointer rounded-2xl border-[1.5px] p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-plum ${
              choice === option.value ? "border-plum bg-plum/5" : "border-ink/25 hover:border-plum/50"
            }`}
          >
            <input
              type="radio"
              name={`${groupId}-choice`}
              value={option.value}
              checked={choice === option.value}
              onChange={() => {
                setChoice(option.value);
                setError(null);
              }}
              className="sr-only"
            />
            <span className="block font-semibold">{option.title}</span>
            <span className="block text-sm opacity-80">{option.hint}</span>
          </label>
        ))}
      </fieldset>

      {choice === "confirmed" && (
        <div className="mt-5 rounded-2xl bg-canvas p-4">
          <p id={`${groupId}-count`} className="font-semibold">
            ¿Cuántas personas asistirán?
          </p>
          {max === 1 ? (
            <p className="mt-1 text-sm">Asistirá 1 persona.</p>
          ) : (
            <div className="mt-3 flex items-center gap-4" role="group" aria-labelledby={`${groupId}-count`}>
              <button
                type="button"
                aria-label="Una persona menos"
                disabled={submitting || count <= 1}
                onClick={() => setCount((c) => Math.max(1, c - 1))}
                className="size-11 rounded-full border-[1.5px] border-ink text-xl leading-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum"
              >
                −
              </button>
              <output aria-live="polite" className="min-w-24 text-center text-lg font-semibold">
                {peopleLabel(count)}
              </output>
              <button
                type="button"
                aria-label="Una persona más"
                disabled={submitting || count >= max}
                onClick={() => setCount((c) => Math.min(max, c + 1))}
                className="size-11 rounded-full border-[1.5px] border-ink text-xl leading-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum"
              >
                +
              </button>
            </div>
          )}
          <p className="mt-2 text-xs opacity-80">Incluye a quien responde. Máximo {peopleLabel(max)}.</p>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-error/10 p-3 text-sm font-medium text-error">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-[10px] bg-plum px-6 py-3 font-semibold text-white transition-colors hover:bg-fuchsia disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum"
      >
        {submitting ? "Enviando…" : "Enviar mi respuesta"}
      </button>
    </form>
  );
}
