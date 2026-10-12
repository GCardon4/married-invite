"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { adminRequest, redirectIfUnauthorized, type GuestWithLink } from "@/lib/admin-client";
import type { AdminGuest } from "@/types/guest";

import { ConfirmDialog } from "./confirm-dialog";
import { LinkPanel } from "./link-panel";
import { buttonDanger, buttonSecondary, cardClass } from "./ui";

type Pending = "regenerate" | "delete" | null;

export function GuestActions({ guest }: { guest: AdminGuest }) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const base = `/api/admin/invitados/${encodeURIComponent(guest.id)}`;

  function close() {
    if (!busy) setPending(null);
  }

  async function regenerate() {
    setBusy(true);
    setError(null);
    const result = await adminRequest<GuestWithLink>(`${base}/enlace`, { method: "POST" });
    setBusy(false);
    setPending(null);

    if (!result.ok) {
      redirectIfUnauthorized(result, router.replace);
      setError(result.message);
      return;
    }
    setLink(result.data.link);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const result = await adminRequest<{ ok: true }>(base, { method: "DELETE" });

    if (!result.ok) {
      setBusy(false);
      setPending(null);
      redirectIfUnauthorized(result, router.replace);
      setError(result.message);
      return;
    }
    router.replace("/admin/invitados");
    router.refresh();
  }

  return (
    <section aria-labelledby="enlace-titulo" className={`${cardClass} space-y-4`}>
      <h2 id="enlace-titulo" className="font-display text-2xl font-semibold text-plum">
        Enlace y eliminación
      </h2>
      <p className="text-sm">
        Por seguridad solo se guarda una huella del enlace, así que no se puede volver a mostrar. Para obtener uno
        que puedas copiar, regenéralo: el enlace anterior dejará de funcionar de inmediato.
      </p>

      {link && <LinkPanel link={link} title="Nuevo enlace de la invitación" />}

      {error && (
        <p role="alert" className="rounded-xl bg-error/10 p-3 text-sm font-medium text-error">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setPending("regenerate")} className={buttonSecondary}>
          Regenerar enlace
        </button>
        <button type="button" onClick={() => setPending("delete")} className={buttonDanger}>
          Eliminar invitación
        </button>
      </div>

      <ConfirmDialog
        open={pending === "regenerate"}
        title="¿Regenerar el enlace?"
        confirmLabel="Regenerar enlace"
        busy={busy}
        onConfirm={regenerate}
        onCancel={close}
      >
        <p>
          El enlace actual de <strong>{guest.name}</strong> dejará de funcionar de inmediato. La respuesta ya
          registrada se conserva.
        </p>
        <p>Tendrás que enviar el nuevo enlace al invitado.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={pending === "delete"}
        title="¿Eliminar esta invitación?"
        confirmLabel="Eliminar definitivamente"
        danger
        busy={busy}
        onConfirm={remove}
        onCancel={close}
      >
        <p>
          Se eliminará la invitación de <strong>{guest.name}</strong>, junto con su respuesta, y su enlace dejará de
          funcionar.
        </p>
        <p className="font-semibold">Esta acción no se puede deshacer.</p>
      </ConfirmDialog>
    </section>
  );
}
