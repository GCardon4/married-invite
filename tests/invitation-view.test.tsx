import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InvalidInvitation } from "@/components/invitation/invalid-invitation";
import { InvitationView } from "@/components/invitation/invitation-view";
import { PUBLIC_MESSAGES } from "@/lib/public-messages";
import type { PublicInvitation } from "@/types/guest";

const base: PublicInvitation = {
  name: "Familia Pérez",
  allowedGuests: 3,
  confirmedGuests: 0,
  status: "pending",
};

const render = (invitation: PublicInvitation) =>
  renderToStaticMarkup(<InvitationView invitation={invitation} token={"t".repeat(43)} />);

describe("InvitationView", () => {
  it("pendiente: muestra el nombre, el cupo y el formulario de respuesta", () => {
    const html = render(base);
    expect(html).toContain("Familia Pérez");
    expect(html).toContain("hasta <strong>3 personas</strong>");
    expect(html).toContain("¿Nos acompañas?");
    expect(html).toContain("Enviar mi respuesta");
    expect(html).toContain("Katheryn");
    expect(html).toContain("Edwin");
  });

  it("confirmada: muestra la confirmación y permite cambiar la respuesta", () => {
    const html = render({ ...base, status: "confirmed", confirmedGuests: 2 });
    expect(html).toContain("¡Asistencia confirmada!");
    expect(html).toContain("2 personas");
    expect(html).toContain("Cambiar mi respuesta");
    expect(html).not.toContain("Enviar mi respuesta");
  });

  it("rechazada: muestra el mensaje de respuesta registrada", () => {
    const html = render({ ...base, status: "declined" });
    expect(html).toContain("Respuesta registrada");
    expect(html).toContain("Cambiar mi respuesta");
  });

  it("escapa el nombre: no inyecta HTML", () => {
    const html = render({ ...base, name: '<script>alert("x")</script>' });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("no incluye hashes, identificadores ni el token en el HTML", () => {
    const html = render(base);
    expect(html).not.toContain("tokenHash");
    expect(html).not.toContain("guest_");
    expect(html).not.toContain("t".repeat(43));
  });

  it("abre el mapa en una pestaña nueva sin enviar el origen", () => {
    const html = render(base);
    expect(html).toMatch(/target="_blank"[^>]*rel="noopener noreferrer"/);
  });
});

describe("InvalidInvitation", () => {
  it("explica con claridad qué ocurrió y qué hacer", () => {
    const html = renderToStaticMarkup(<InvalidInvitation />);
    expect(html).toContain("Enlace no disponible");
    expect(html).toContain(PUBLIC_MESSAGES.invalidLink);
  });
});

describe("InvitationView: saludo, medios y decoración floral", () => {
  const withMedia = (media: Partial<import("@/lib/media").InvitationMedia>, whatsappUrl: string | null = null) =>
    renderToStaticMarkup(
      <InvitationView
        invitation={base}
        token={"t".repeat(43)}
        media={{ hero: null, videoPoster: null, video: null, gallery: [], ...media }}
        whatsappUrl={whatsappUrl}
      />,
    );

  it("saluda al invitado por su nombre y muestra su pase", () => {
    const html = render(base);
    expect(html).toContain("¡Hola,");
    expect(html).toContain("Familia Pérez");
    expect(html).toContain("Pase para 3 personas");
    expect(render({ ...base, allowedGuests: 1 })).toContain("Pase individual");
  });

  it("muestra la información completa del evento", () => {
    const html = render(base);
    for (const text of [
      "Viernes 8 de enero de 2027",
      "Eucaristía",
      "Iglesia San Antonio",
      "3:00 p.m.",
      "Recepción",
      "Ángeles Eventos",
      "5:30 p.m.",
      "Abrir en Google Maps",
      "Faltan para el gran día",
    ]) {
      expect(html, text).toContain(text);
    }
  });

  it("sin fotos ni videos usa el arco floral con las iniciales, sin imágenes rotas", () => {
    const html = withMedia({});
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<video");
    expect(html).not.toContain("Nuestra celebración");
    expect(html).not.toContain("Nuestra historia");
  });

  it("con foto principal la muestra con texto alternativo", () => {
    const html = withMedia({ hero: "/images/hero.jpg" });
    expect(html).toContain("<img");
    expect(html).toContain('alt="Katheryn y Edwin"');
    expect(html).toContain("hero.jpg");
  });

  it("con video muestra el reproductor con controles y su portada", () => {
    const html = withMedia({
      video: { sources: [{ src: "/videos/invitacion.mp4", type: "video/mp4" }] },
      videoPoster: "/images/hero.jpg",
    });
    expect(html).toContain("Nuestra historia");
    expect(html).toContain("<video");
    expect(html).toContain("controls");
    expect(html).toContain('preload="metadata"');
    expect(html).toContain("playsInline");
    expect(html).not.toMatch(/<video[^>]*autoplay/i);
    expect(html).toContain('src="/videos/invitacion.mp4"');
  });

  it("con galería muestra todas las fotos, cada una con texto alternativo", () => {
    const gallery = [1, 2, 3].map((n) => ({ src: `/images/galeria/${n}.jpg`, alt: `Foto ${n} de Katheryn y Edwin` }));
    const html = withMedia({ gallery });

    expect(html).toContain("Nuestra celebración");
    for (const photo of gallery) expect(html).toContain(`alt="${photo.alt}"`);
    expect((html.match(/<img/g) ?? []).length).toBe(3);
    expect(html.match(/<img(?![^>]*\balt=)/g)).toBeNull();
  });

  it("el botón de WhatsApp solo aparece si hay enlace configurado", () => {
    expect(withMedia({})).not.toContain("WhatsApp");
    const html = withMedia({}, "https://wa.me/573001234567?text=hola");
    expect(html).toContain("WhatsApp");
    expect(html).toContain("https://wa.me/573001234567?text=hola");
  });

  it("el botón fijo cambia según haya respondido o no", () => {
    expect(render(base)).toContain("Confirmar mi asistencia");
    expect(render({ ...base, status: "confirmed", confirmedGuests: 2 })).toContain("Ver o cambiar mi respuesta");
  });

  it("las flores son decorativas: ocultas a lectores de pantalla y sin foco", () => {
    const html = render(base);
    const svgs = html.match(/<svg[^>]*>/g) ?? [];
    const decorative = svgs.filter((tag) => tag.includes('viewBox="0 0 320 320"') || tag.includes('viewBox="0 0 400 500"') || tag.includes('viewBox="0 0 320 44"') || tag.includes('viewBox="0 0 120 120"'));

    expect(decorative.length).toBeGreaterThanOrEqual(7); // 4 ramos + 2 ramitas + guirnalda + 2 divisores
    for (const tag of decorative) {
      expect(tag).toContain('aria-hidden="true"');
      expect(tag).toContain('focusable="false"');
    }
    expect(html).toContain("pointer-events-none fixed inset-0");
  });

  it("incluye pétalos animados y el contenido se escapa también con medios", () => {
    const html = renderToStaticMarkup(
      <InvitationView
        invitation={{ ...base, name: "<img src=x onerror=alert(1)>" }}
        token={"t".repeat(43)}
        media={{ hero: "/images/hero.jpg", videoPoster: null, video: null, gallery: [] }}
      />,
    );
    expect(html).toContain('class="petal"');
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
});
