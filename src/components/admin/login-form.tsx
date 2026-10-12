"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { adminRequest } from "@/lib/admin-client";

import { buttonPrimary, inputClass } from "./ui";

export function LoginForm() {
  const router = useRouter();
  const id = useId();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    const result = await adminRequest<{ ok: true }>("/api/admin/login", {
      method: "POST",
      body: { password },
    });

    if (result.ok) {
      setPassword("");
      router.replace("/admin/dashboard");
      router.refresh();
      return;
    }
    setPassword("");
    setError(result.message);
    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor={`${id}-password`} className="mb-1 block text-sm font-semibold">
          Contraseña
        </label>
        <input
          id={`${id}-password`}
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={error ? true : undefined}
          className={inputClass}
        />
      </div>

      {error && (
        <p id={`${id}-error`} role="alert" className="rounded-xl bg-error/10 p-3 text-sm font-medium text-error">
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting || password === ""} className={`${buttonPrimary} w-full`}>
        {submitting ? "Verificando…" : "Ingresar"}
      </button>
    </form>
  );
}
