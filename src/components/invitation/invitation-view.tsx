import Image from "next/image";
import type { ReactNode } from "react";

import { EVENT } from "@/lib/event";
import { NO_MEDIA, type InvitationMedia } from "@/lib/media";
import { peopleLabel } from "@/lib/rsvp";
import type { PublicInvitation } from "@/types/guest";

import { Countdown } from "./countdown";
import { ArchWreath, CardSprig, FloralBackdrop, FloralDivider } from "./flora";
import { RsvpForm } from "./rsvp-form";

const CARD =
  "relative rounded-3xl border border-plum/10 bg-card/95 shadow-[0_12px_32px_-6px_rgba(74,90,77,0.12),0_4px_12px_-2px_rgba(163,48,91,0.06)]";

const BUTTON_OUTLINE =
  "inline-flex items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-ink px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-ink/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum";

function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mx-auto mb-3 w-fit rounded-full bg-card/80 px-6 py-1 text-center font-display text-3xl font-semibold text-plum backdrop-blur-sm">
      {children}
    </h2>
  );
}

const icon = { "aria-hidden": true, className: "size-6", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24" } as const;

function ChurchIcon() {
  return (
    <svg {...icon}>
      <path d="M12 2v5M9.5 4.5h5M6 22V12l6-5 6 5v10M3 22h18M10 22v-5a2 2 0 0 1 4 0v5" />
    </svg>
  );
}

function ToastIcon() {
  return (
    <svg {...icon}>
      <path d="M8 3h5l-1 8a3 3 0 0 1-3 2.6A3 3 0 0 1 6 11L5 3zM9 14v7M6 21h6M16 3h4l-.8 6a2.4 2.4 0 0 1-2.4 2.1M17.6 11v10M15 21h5" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg {...icon}>
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
    </svg>
  );
}

function EventCard({
  icon: Icon,
  title,
  time,
  place,
  detail,
}: {
  icon: () => ReactNode;
  title: string;
  time: string;
  place: string;
  detail: string;
}) {
  return (
    <li className={`${CARD} flex items-start gap-4 p-5`}>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-peach/30 text-plum">
        <Icon />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-tangerine-text">{time}</p>
        <h3 className="font-display text-xl font-semibold text-plum">{title}</h3>
        <p className="mt-1 font-semibold">{place}</p>
        <p className="text-sm">{detail}</p>
      </div>
    </li>
  );
}

function HeroArch({ hero }: { hero: string | null }) {
  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-[22rem] sm:max-w-sm">
      {/* Marco en arco; la guirnalda va encima y lo rodea. */}
      <div className="absolute inset-x-[8%] bottom-[5%] top-[9%] overflow-hidden rounded-b-3xl rounded-t-[999px] bg-gradient-to-b from-peach/40 via-card to-blush/70 shadow-[0_16px_40px_-8px_rgba(74,90,77,0.25)] ring-[1.5px] ring-[#e0b674]/55">
        {hero ? (
          <Image
            src={hero}
            alt={`${EVENT.partner1} y ${EVENT.partner2}`}
            fill
            priority
            sizes="(max-width: 640px) 80vw, 320px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 pt-10 text-center">
            <p className="font-display text-6xl font-semibold leading-none text-plum" aria-hidden="true">
              {EVENT.partner1[0]}
            </p>
            <p className="font-display text-3xl italic text-tangerine-text" aria-hidden="true">
              &amp;
            </p>
            <p className="font-display text-6xl font-semibold leading-none text-plum" aria-hidden="true">
              {EVENT.partner2[0]}
            </p>
          </div>
        )}
      </div>
      <ArchWreath className="pointer-events-none absolute inset-0 z-10 h-full w-full" />
    </div>
  );
}

export function InvitationView({
  invitation,
  token,
  media = NO_MEDIA,
  whatsappUrl = null,
}: {
  invitation: PublicInvitation;
  token: string;
  media?: InvitationMedia;
  whatsappUrl?: string | null;
}) {
  const pending = invitation.status === "pending";
  const passLabel = invitation.allowedGuests > 1 ? `Pase para ${peopleLabel(invitation.allowedGuests)}` : "Pase individual";

  return (
    <div className="relative isolate flex min-h-screen flex-1 flex-col">
      <FloralBackdrop />

      <header className="flex items-center justify-center gap-3 px-4 pt-6">
        <span className="h-px w-10 bg-gradient-to-r from-transparent to-plum/40" aria-hidden="true" />
        <span className="font-display text-lg font-semibold tracking-wide text-plum">{EVENT.monogram}</span>
        <span className="h-px w-10 bg-gradient-to-l from-transparent to-plum/40" aria-hidden="true" />
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-10 px-4 pb-32 pt-6">
        {/* Saludo personal */}
        <section aria-labelledby="saludo" className={`${CARD} overflow-hidden px-7 pb-12 pt-8 text-center`}>
          <CardSprig className="pointer-events-none absolute -left-2 -top-2 w-20 opacity-90" />
          <CardSprig className="pointer-events-none absolute -bottom-2 -right-2 w-20 rotate-180 opacity-90" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-plum/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-plum">
            <span aria-hidden="true">♥</span> {passLabel}
          </span>
          <h2 id="saludo" className="mt-3 font-display text-3xl font-semibold leading-tight text-plum-deep">
            ¡Hola, <span className="break-words">{invitation.name}</span>!
          </h2>
          <p className="mx-auto mt-3 max-w-sm leading-7">
            Tenemos el inmenso honor y la alegría de invitarte a celebrar nuestro amor y nuestra unión.
          </p>
          <p className="mt-2 text-sm">
            Tu invitación es válida para hasta <strong>{peopleLabel(invitation.allowedGuests)}</strong>.
          </p>
        </section>

        {/* Portada */}
        <section aria-label="Los novios" className="text-center">
          <HeroArch hero={media.hero} />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-fuchsia">Nos casamos</p>
          <h1 className="mt-2 font-display text-[2.5rem] font-semibold leading-tight tracking-tight text-plum-deep sm:text-6xl">
            {EVENT.partner1} <span className="font-normal italic text-tangerine-text">&amp;</span> {EVENT.partner2}
          </h1>
          <p className="mt-3 font-semibold">{EVENT.dateLabel}</p>
          <p className="text-sm">{EVENT.timeZoneLabel}</p>
        </section>

        <FloralDivider className="mx-auto -my-4 h-auto w-full max-w-xs" />

        {/* Cuenta regresiva */}
        <section aria-labelledby="cuenta" className={`${CARD} p-5`}>
          <h2 id="cuenta" className="mb-3 text-center text-xs font-semibold uppercase tracking-wider">
            Faltan para el gran día
          </h2>
          <Countdown targetIso={EVENT.startsAtIso} />
        </section>

        {/* Itinerario */}
        <section aria-labelledby="itinerario">
          <SectionTitle id="itinerario">Itinerario del día</SectionTitle>
          <ul className="space-y-3">
            <EventCard icon={ChurchIcon} {...EVENT.ceremony} />
            <EventCard icon={ToastIcon} {...EVENT.reception} />
          </ul>
        </section>

        {/* Cómo llegar */}
        <section aria-labelledby="llegar" className={`${CARD} overflow-hidden`}>
          <div className="relative h-36 bg-gradient-to-br from-peach/30 via-card to-blush/60" aria-hidden="true">
            <svg viewBox="0 0 400 144" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
              <g fill="none" stroke="#4a5a4d" strokeOpacity={0.18} strokeWidth={6} strokeLinecap="round">
                <path d="M-10 100 C 90 70 150 130 250 90 S 360 40 420 70" />
                <path d="M60 -10 C 90 40 70 80 130 150" />
                <path d="M250 -10 C 240 40 280 80 270 150" />
              </g>
              <g fill="#a3305b" fillOpacity={0.9}>
                <path d="M200 38 c-16 0 -28 12 -28 27 c0 22 28 44 28 44 s28 -22 28 -44 c0 -15 -12 -27 -28 -27 z" />
              </g>
              <circle cx="200" cy="65" r="9" fill="#fffdfa" />
            </svg>
          </div>
          <div className="p-6 text-center">
            <h2 id="llegar" className="flex items-center justify-center gap-2 font-display text-2xl font-semibold text-plum">
              <span className="text-tangerine-text">
                <PinIcon />
              </span>
              ¿Cómo llegar?
            </h2>
            <p className="mt-2 font-semibold">{EVENT.reception.place}</p>
            <p className="text-sm">Lugar de la recepción</p>
            <a
              href={EVENT.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${BUTTON_OUTLINE} mt-4 w-full sm:w-auto`}
            >
              Abrir en Google Maps
              <span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          </div>
        </section>

        {/* Video (solo si hay archivo en public/videos) */}
        {media.video && (
          <section aria-labelledby="video">
            <SectionTitle id="video">Nuestra historia</SectionTitle>
            <div className={`${CARD} overflow-hidden p-2`}>
              <video
                controls
                playsInline
                preload="metadata"
                poster={media.videoPoster ?? undefined}
                className="aspect-video w-full rounded-2xl bg-ink/10"
              >
                {media.video.sources.map((source) => (
                  <source key={source.src} src={source.src} type={source.type} />
                ))}
                Tu navegador no puede reproducir este video.
              </video>
            </div>
          </section>
        )}

        {/* Galería (solo si hay fotos en public/images/galeria) */}
        {media.gallery.length > 0 && (
          <section aria-labelledby="galeria">
            <SectionTitle id="galeria">Nuestra celebración</SectionTitle>
            <ul className="grid grid-cols-2 gap-3">
              {media.gallery.map((photo, index) => (
                <li
                  key={photo.src}
                  className={`relative overflow-hidden rounded-2xl shadow-md ring-1 ring-plum/10 ${
                    index === 0 && media.gallery.length > 2 ? "col-span-2 aspect-[16/10]" : "aspect-[4/5]"
                  }`}
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(max-width: 640px) 50vw, 280px"
                    className="object-cover"
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Código de vestimenta (solo si está definido en EVENT.dressCode) */}
        {EVENT.dressCode && (
          <section aria-labelledby="vestimenta" className={`${CARD} p-6 text-center`}>
            <h2 id="vestimenta" className="font-display text-2xl font-semibold text-plum">
              Código de vestimenta
            </h2>
            <p className="mt-2 leading-7">{EVENT.dressCode}</p>
          </section>
        )}

        <FloralDivider className="mx-auto -my-4 h-auto w-full max-w-xs" />

        {/* Confirmación */}
        <div id="rsvp" className="scroll-mt-6">
          <RsvpForm token={token} initial={invitation} />
        </div>

        <footer className="text-center">
          <p className="font-display text-xl italic text-plum">Con cariño,</p>
          <p className="font-display text-2xl font-semibold text-plum-deep">
            {EVENT.partner1} &amp; {EVENT.partner2}
          </p>
        </footer>
      </main>

      {/* Acciones siempre a mano en el teléfono */}
      <nav
        aria-label="Acciones rápidas"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-plum/10 bg-card/90 px-4 py-3 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-xl gap-2">
          <a
            href="#rsvp"
            className="flex-1 rounded-[10px] bg-plum px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-fuchsia focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum"
          >
            {pending ? "Confirmar mi asistencia" : "Ver o cambiar mi respuesta"}
          </a>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${BUTTON_OUTLINE} shrink-0`}
            >
              WhatsApp
              <span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          )}
        </div>
      </nav>
    </div>
  );
}
