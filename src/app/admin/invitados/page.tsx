import Link from "next/link";
import { Suspense } from "react";

import { AdminShell, PanelLoading } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/admin/status-badge";
import { buttonPrimary, buttonSecondary, cardClass, inputClass } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin-page";
import { ValidationError } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { getGuestService, type GuestListResult } from "@/lib/guest-service";
import { whatsAppDisplayNumber } from "@/lib/whatsapp";
import { WhatsAppSendButton } from "@/components/admin/whatsapp-send-button";

const PAGE_SIZE = 25;

type SearchParams = Record<string, string | string[] | undefined>;

export default function GuestsPage(props: PageProps<"/admin/invitados">) {
  return (
    <AdminShell title="Invitados">
      <Suspense fallback={<PanelLoading />}>
        <GuestsContent searchParams={props.searchParams} />
      </Suspense>
    </AdminShell>
  );
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

async function GuestsContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage();

  const params = await searchParams;
  const query = { search: first(params.search), status: first(params.status), page: first(params.page) };

  let result: GuestListResult | null = null;
  let invalid = false;
  try {
    // Los parámetros vacíos (p. ej. «Todos» en el filtro) se omiten; el servicio valida el resto.
    result = await getGuestService().listGuests(
      Object.fromEntries(Object.entries({ ...query, limit: String(PAGE_SIZE) }).filter(([, v]) => v !== "")),
    );
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
    invalid = true;
  }

  const filtering = query.search !== "" || query.status !== "";

  return (
    <div className="space-y-5">
      <form method="GET" className={`${cardClass} grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end`}>
        <div>
          <label htmlFor="search" className="mb-1 block text-sm font-semibold">
            Buscar por nombre, correo o teléfono
          </label>
          <input id="search" name="search" defaultValue={query.search} maxLength={120} className={inputClass} />
        </div>
        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-semibold">
            Estado
          </label>
          <select id="status" name="status" defaultValue={query.status} className={inputClass}>
            <option value="">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="confirmed">Confirmadas</option>
            <option value="declined">Rechazadas</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className={buttonPrimary}>
            Filtrar
          </button>
          {filtering && (
            <Link href="/admin/invitados" className={buttonSecondary}>
              Limpiar
            </Link>
          )}
        </div>
      </form>

      {invalid || !result ? (
        <p role="alert" className="rounded-xl bg-error/10 p-3 text-sm font-medium text-error">
          Los filtros no son válidos. <Link href="/admin/invitados" className="underline">Quitar filtros</Link>
        </p>
      ) : (
        <GuestTable result={result} query={query} filtering={filtering} />
      )}
    </div>
  );
}

function GuestTable({
  result,
  query,
  filtering,
}: {
  result: GuestListResult;
  query: { search: string; status: string };
  filtering: boolean;
}) {
  const pages = Math.max(1, Math.ceil(result.total / result.limit));
  const href = (page: number) => {
    const qs = new URLSearchParams();
    if (query.search) qs.set("search", query.search);
    if (query.status) qs.set("status", query.status);
    if (page > 1) qs.set("page", String(page));
    const text = qs.toString();
    return `/admin/invitados${text ? `?${text}` : ""}`;
  };

  if (result.items.length === 0) {
    return (
      <p className={cardClass}>
        {filtering ? "Ninguna invitación coincide con la búsqueda." : "Aún no hay invitaciones. "}
        {!filtering && (
          <Link href="/admin/invitados/nuevo" className="font-semibold text-primary underline">
            Crea la primera
          </Link>
        )}
      </p>
    );
  }

  return (
    <section aria-label="Listado de invitados">
      <p className="mb-2 text-sm" role="status">
        {result.total} {result.total === 1 ? "invitación" : "invitaciones"}
        {filtering ? " encontradas" : ""}
      </p>
      <div className="overflow-x-auto rounded-2xl border border-primary/10 bg-card">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <caption className="sr-only">Invitaciones y su estado de respuesta</caption>
          <thead className="border-b border-ink/10 text-xs uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-4 py-3">Invitado</th>
              <th scope="col" className="px-4 py-3">Contacto</th>
              <th scope="col" className="px-4 py-3">Estado</th>
              <th scope="col" className="px-4 py-3">Asistentes / cupo</th>
              <th scope="col" className="px-4 py-3">Respondió</th>
              <th scope="col" className="px-4 py-3">Enviar invitación</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((guest) => (
              <tr key={guest.id} className="border-b border-ink/10 last:border-0 odd:bg-canvas hover:bg-peach/10">
                <th scope="row" className="px-4 py-3 font-semibold">
                  <Link href={`/admin/invitados/${guest.id}`} className="text-primary underline-offset-2 hover:underline">
                    {guest.name}
                  </Link>
                </th>
                <td className="px-4 py-3">
                  {guest.email ?? guest.phone ? (
                    <>
                      {guest.email && <span className="block">{guest.email}</span>}
                      {guest.phone && <span className="block">{guest.phone}</span>}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3"><StatusBadge status={guest.status} /></td>
                <td className="px-4 py-3">{guest.confirmedGuests} / {guest.allowedGuests}</td>
                <td className="px-4 py-3">{formatDateTime(guest.respondedAt)}</td>
                <td className="px-4 py-3">
                  <WhatsAppSendButton
                    guestId={guest.id}
                    guestName={guest.name}
                    phoneDisplay={whatsAppDisplayNumber(guest.phone)}
                    compact
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="Paginación" className="mt-4 flex items-center justify-between gap-2 text-sm">
          {result.page > 1 ? (
            <Link href={href(result.page - 1)} className={buttonSecondary}>Anterior</Link>
          ) : (
            <span />
          )}
          <span>Página {result.page} de {pages}</span>
          {result.page < pages ? (
            <Link href={href(result.page + 1)} className={buttonSecondary}>Siguiente</Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}
