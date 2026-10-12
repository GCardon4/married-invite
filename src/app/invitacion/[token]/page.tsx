import type { Metadata } from "next";
import { Suspense } from "react";

import {
  InvalidInvitation,
  InvitationSkeleton,
} from "@/components/invitation/invalid-invitation";
import { InvitationView } from "@/components/invitation/invitation-view";
import { NotFoundError } from "@/lib/errors";
import { buildWhatsAppUrl } from "@/lib/event";
import { getGuestService } from "@/lib/guest-service";
import { discoverMedia } from "@/lib/media";
import type { PublicInvitation } from "@/types/guest";

// El token va en la URL: no se indexa ni se reenvía a sitios externos mediante `Referer`.
export const metadata: Metadata = {
  title: "Tu invitación · Katheryn & Edwin",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function InvitationPage(props: PageProps<"/invitacion/[token]">) {
  return (
    <Suspense fallback={<InvitationSkeleton />}>
      <InvitationContent params={props.params} />
    </Suspense>
  );
}

/** Lectura en el servidor, en cada solicitud: el contenido depende del token y no se cachea. */
async function InvitationContent({ params }: { params: PageProps<"/invitacion/[token]">["params"] }) {
  const { token } = await params;

  let invitation: PublicInvitation;
  try {
    invitation = await getGuestService().getPublicInvitation(token);
  } catch (error) {
    // Token mal formado o inexistente: mensaje claro, sin distinguir cuál de los dos.
    if (error instanceof NotFoundError) return <InvalidInvitation />;
    // Fallos de almacenamiento: los recoge error.tsx; no se muestra una invitación falsa.
    throw error;
  }

  // Fotos y videos son un adorno: si no hay archivos, la invitación se ve igual (con su diseño floral).
  const media = await discoverMedia();
  const whatsappUrl = buildWhatsAppUrl(process.env.WHATSAPP_NUMBER, invitation.name);

  return <InvitationView invitation={invitation} token={token} media={media} whatsappUrl={whatsappUrl} />;
}
