import Link from "next/link";
import { Suspense } from "react";

import { AdminShell, PanelLoading } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/admin/status-badge";
import { buttonSecondary, cardClass } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin-page";
import { getGuestService } from "@/lib/guest-service";

export default function DashboardPage() {
  return (
    <AdminShell title="Resumen de invitaciones">
      <Suspense fallback={<PanelLoading />}>
        <DashboardContent />
      </Suspense>
    </AdminShell>
  );
}

async function DashboardContent() {
  await requireAdminPage();

  const service = getGuestService();
  const [stats, pending] = await Promise.all([
    service.getStatistics(),
    service.listGuests({ status: "pending", limit: 8 }),
  ]);

  const answered = stats.confirmedInvitations + stats.declinedInvitations;
  const answeredPercent = stats.totalInvitations === 0 ? 0 : Math.round((answered / stats.totalInvitations) * 100);

  return (
    <div className="space-y-8">
      <section aria-label="Invitaciones" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Invitaciones" value={stats.totalInvitations} />
        <Stat label="Pendientes" value={stats.pendingInvitations} tone="pending" />
        <Stat label="Confirmadas" value={stats.confirmedInvitations} tone="confirmed" />
        <Stat label="Rechazadas" value={stats.declinedInvitations} />
      </section>

      <section aria-label="Personas" className="grid gap-3 sm:grid-cols-2">
        <Stat
          label="Asistentes confirmados"
          value={stats.totalConfirmedGuests}
          note="Personas que ya confirmaron su asistencia"
          large
        />
        <Stat
          label="Cupos autorizados"
          value={stats.totalAllowedGuests}
          note="Personas invitadas en total; no equivale a asistentes confirmados"
          large
        />
      </section>

      <section aria-label="Avance de respuestas" className={cardClass}>
        <p className="text-sm font-semibold">
          {answered} de {stats.totalInvitations} invitaciones respondidas ({answeredPercent}%)
        </p>
        <div
          role="progressbar"
          aria-label="Invitaciones respondidas"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={answeredPercent}
          className="mt-3 h-3 overflow-hidden rounded-full bg-ink/10"
        >
          <div className="h-full bg-gradient-to-r from-plum to-tangerine" style={{ width: `${answeredPercent}%` }} />
        </div>
      </section>

      <section aria-labelledby="pendientes">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="pendientes" className="font-display text-2xl font-semibold text-plum">
            Pendientes de respuesta
          </h2>
          <Link href="/admin/invitados?status=pending" className={buttonSecondary}>
            Ver todos los pendientes
          </Link>
        </div>

        {pending.items.length === 0 ? (
          <p className={cardClass}>
            {stats.totalInvitations === 0
              ? "Aún no hay invitaciones. Crea la primera para empezar."
              : "¡No hay invitaciones pendientes! Todos respondieron."}
          </p>
        ) : (
          <ul className="space-y-2">
            {pending.items.map((guest) => (
              <li key={guest.id}>
                <Link
                  href={`/admin/invitados/${guest.id}`}
                  className={`${cardClass} flex items-center justify-between gap-3 py-3 hover:border-plum/30`}
                >
                  <span className="font-semibold">{guest.name}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-sm">Cupo: {guest.allowedGuests}</span>
                    <StatusBadge status={guest.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  tone,
  large,
}: {
  label: string;
  value: number;
  note?: string;
  tone?: "pending" | "confirmed";
  large?: boolean;
}) {
  const accent = tone === "pending" ? "text-[#a03b1e]" : tone === "confirmed" ? "text-[#2f3a31]" : "text-plum";
  return (
    <div className={cardClass}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</p>
      <p className={`mt-1 font-display font-semibold ${accent} ${large ? "text-5xl" : "text-4xl"}`}>{value}</p>
      {note && <p className="mt-1 text-xs opacity-80">{note}</p>}
    </div>
  );
}
