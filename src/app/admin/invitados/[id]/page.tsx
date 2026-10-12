import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AdminShell, PanelLoading } from "@/components/admin/admin-shell";
import { GuestActions } from "@/components/admin/guest-actions";
import { GuestForm } from "@/components/admin/guest-form";
import { StatusBadge } from "@/components/admin/status-badge";
import { buttonSecondary, cardClass } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin-page";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { getGuestService } from "@/lib/guest-service";
import { whatsAppDisplayNumber } from "@/lib/whatsapp";
import type { AdminGuest } from "@/types/guest";

export default function GuestDetailPage(props: PageProps<"/admin/invitados/[id]">) {
  return (
    <AdminShell title="Invitación">
      <Suspense fallback={<PanelLoading />}>
        <GuestDetailContent params={props.params} />
      </Suspense>
    </AdminShell>
  );
}

async function GuestDetailContent({ params }: { params: PageProps<"/admin/invitados/[id]">["params"] }) {
  await requireAdminPage();
  const { id } = await params;

  let guest: AdminGuest;
  try {
    guest = await getGuestService().getGuest(id);
  } catch (error) {
    // Id inexistente o mal formado: misma pantalla. Los fallos de almacenamiento llegan al error boundary.
    if (error instanceof NotFoundError || error instanceof ValidationError) notFound();
    throw error;
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/invitados" className={`${buttonSecondary} inline-block`}>
        ← Volver al listado
      </Link>

      <section aria-labelledby="respuesta" className={cardClass}>
        <h2 id="respuesta" className="font-display text-2xl font-semibold text-primary">
          {guest.name}
        </h2>
        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Item label="Estado"><StatusBadge status={guest.status} /></Item>
          <Item label="Asistentes confirmados">
            {guest.confirmedGuests} de {guest.allowedGuests} autorizados
          </Item>
          <Item label="Respondió">{formatDateTime(guest.respondedAt)}</Item>
          <Item label="Creada">{formatDateTime(guest.createdAt)}</Item>
          <Item label="Última modificación">{formatDateTime(guest.updatedAt)}</Item>
        </dl>
      </section>

      <section aria-labelledby="editar">
        <h2 id="editar" className="mb-3 font-display text-2xl font-semibold text-primary">
          Datos de la invitación
        </h2>
        <GuestForm guest={guest} />
      </section>

      <GuestActions guest={guest} phoneDisplay={whatsAppDisplayNumber(guest.phone)} />
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
