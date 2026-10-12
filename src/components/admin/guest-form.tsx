"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import {
  adminRequest,
  redirectIfUnauthorized,
  type FieldIssue,
  type GuestWithLink,
} from "@/lib/admin-client";
import type { AdminGuest } from "@/types/guest";

import { LinkPanel } from "./link-panel";
import { buttonPrimary, buttonSecondary, cardClass, inputClass } from "./ui";

type Values = { name: string; email: string; phone: string; allowedGuests: string };

const EMPTY: Values = { name: "", email: "", phone: "", allowedGuests: "2" };

function fromGuest(guest: AdminGuest): Values {
  return {
    name: guest.name,
    email: guest.email ?? "",
    phone: guest.phone ?? "",
    allowedGuests: String(guest.allowedGuests),
  };
}

function fieldError(issues: FieldIssue[], field: keyof Values): string | undefined {
  return issues.find((issue) => issue.path === field)?.message;
}

export function GuestForm({ guest }: { guest?: AdminGuest }) {
  const router = useRouter();
  const id = useId();
  const editing = guest !== undefined;

  const [values, setValues] = useState<Values>(guest ? fromGuest(guest) : EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const [saved, setSaved] = useState(false);
  const [created, setCreated] = useState<GuestWithLink | null>(null);

  const set = (field: keyof Values) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setSaved(false);
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    setIssues([]);
    setSaved(false);

    // El servidor valida y normaliza todo; aquí solo se arma el cuerpo.
    const body = {
      name: values.name,
      email: values.email,
      phone: values.phone,
      allowedGuests: values.allowedGuests === "" ? undefined : Number(values.allowedGuests),
    };

    const result = editing
      ? await adminRequest<{ guest: AdminGuest }>(`/api/admin/invitados/${encodeURIComponent(guest.id)}`, {
          method: "PATCH",
          body,
        })
      : await adminRequest<GuestWithLink>("/api/admin/invitados", { method: "POST", body });
    setSubmitting(false);

    if (!result.ok) {
      redirectIfUnauthorized(result, router.replace);
      setError(result.message);
      setIssues(result.issues);
      return;
    }

    if (editing) {
      setSaved(true);
      router.refresh();
    } else {
      setCreated(result.data as GuestWithLink);
    }
  }

  if (created) {
    return (
      <div className="space-y-4">
        <p role="status" className="rounded-xl bg-ink/10 p-3 text-sm font-semibold">
          Invitación creada para {created.guest.name}.
        </p>
        <LinkPanel link={created.link} title="Enlace de la invitación" />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonPrimary}
            onClick={() => {
              setCreated(null);
              setValues(EMPTY);
            }}
          >
            Crear otra invitación
          </button>
          <Link href={`/admin/invitados/${created.guest.id}`} className={buttonSecondary}>
            Ver invitado
          </Link>
          <Link href="/admin/invitados" className={buttonSecondary}>
            Volver al listado
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className={`${cardClass} space-y-4`}>
      <Field id={`${id}-name`} label="Nombre del invitado o familia" required error={fieldError(issues, "name")}>
        <input
          id={`${id}-name`}
          value={values.name}
          onChange={set("name")}
          maxLength={120}
          required
          autoComplete="off"
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-email`} label="Correo electrónico (opcional)" error={fieldError(issues, "email")}>
          <input
            id={`${id}-email`}
            type="email"
            value={values.email}
            onChange={set("email")}
            autoComplete="off"
            className={inputClass}
          />
        </Field>
        <Field id={`${id}-phone`} label="Teléfono (opcional)" error={fieldError(issues, "phone")}>
          <input
            id={`${id}-phone`}
            type="tel"
            value={values.phone}
            onChange={set("phone")}
            maxLength={30}
            autoComplete="off"
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        id={`${id}-allowed`}
        label="Cupo autorizado (personas, incluido el invitado)"
        required
        error={fieldError(issues, "allowedGuests")}
        hint={
          guest && guest.confirmedGuests > 0
            ? `Ya hay ${guest.confirmedGuests} asistentes confirmados: el cupo no puede ser menor.`
            : undefined
        }
      >
        <input
          id={`${id}-allowed`}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={values.allowedGuests}
          onChange={set("allowedGuests")}
          required
          className={`${inputClass} sm:max-w-40`}
        />
      </Field>

      {error && (
        <p role="alert" className="rounded-xl bg-error/10 p-3 text-sm font-medium text-error">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="rounded-xl bg-ink/10 p-3 text-sm font-semibold">
          Cambios guardados.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={submitting} className={buttonPrimary}>
          {submitting ? "Guardando…" : editing ? "Guardar cambios" : "Crear invitación"}
        </button>
        {!editing && (
          <Link href="/admin/invitados" className={buttonSecondary}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs opacity-80">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-sm font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}
