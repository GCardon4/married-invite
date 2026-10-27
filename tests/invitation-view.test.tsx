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

/** Imágenes decorativas (las flores): alt vacío. */
const decorativeImages = (html: string) => (html.match(/<img[^>]*>/g) ?? []).filter((tag) => tag.includes('alt=""'));
/** Imágenes de contenido (las fotos de los novios): con texto alternativo. */
const contentImages = (html: string) => (html.match(/<img[^>]*>/g) ?? []).filter((tag) => /\balt="[^"]+"/.test(tag));

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

  it("sin fotos ni videos muestra el arco floral con las iniciales y ninguna imagen de contenido", () => {
    const html = withMedia({});
    expect(contentImages(html)).toEqual([]);
    expect(html).toMatch(/>K<\/span>[\s\S]*>E<\/span>/); // iniciales de los novios en el hueco del arco
    expect(html).not.toContain("<video");
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

  it("con galería el slider incluye todas las fotos, cada una con texto alternativo", () => {
    const gallery = [1, 2, 3].map((n) => ({ src: `/images/galeria/${n}.jpg`, alt: `Foto ${n} de Katheryn y Edwin` }));
    const html = withMedia({ gallery });

    expect(html).toContain("Ver foto 1 de 3");
    for (const photo of gallery) expect(html).toContain(`alt="${photo.alt}"`);
    expect(contentImages(html)).toHaveLength(3);
    expect(html.match(/<img(?![^>]*\balt=)/g)).toBeNull(); // toda imagen declara su atributo alt
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

  it("las flores son imágenes decorativas: sin texto alternativo, ocultas a lectores de pantalla y sin clics", () => {
    const html = render(base);
    const flowers = decorativeImages(html);

    // Arco + 2 ramos de fondo + 2 divisores (4 imágenes) + flores sueltas (saludo, itinerario, confirmación).
    expect(flowers.length).toBeGreaterThanOrEqual(8);
    for (const tag of flowers) {
      expect(tag).toContain('aria-hidden="true"');
      expect(tag).toContain('alt=""');
      expect(tag).toContain("pointer-events-none");
      expect(tag).toContain('draggable="false"');
    }
    expect(html).toContain("pointer-events-none fixed inset-0");
  });

  it("usa las imágenes ligeras de public/images/flowers/web y no los originales de varios MB", () => {
    const html = render(base);
    // next/image sirve las imágenes por /_next/image?url=<ruta codificada>: se decodifica solo esa ruta.
    const urls = (html.match(/url=([^&"\s]+)/g) ?? []).map((m) => decodeURIComponent(m.slice(4)));

    for (const name of ["arch.webp", "flower-01.webp", "flower-02.webp", "flower-03.webp", "flower-04.webp"]) {
      expect(urls, name).toContain(`/images/flowers/web/${name}`);
    }
    expect(urls.some((url) => url.endsWith(".png"))).toBe(false);
    expect(urls.some((url) => url.includes("arch-flowers"))).toBe(false);
  });

  it("solo el arco se carga con prioridad; las demás flores se cargan de forma diferida", () => {
    const tags = decorativeImages(render(base));
    const arch = tags.find((tag) => decodeURIComponent(tag.match(/src="([^"]+)"/)?.[1] ?? "").includes("arch.webp"));

    expect(arch).toBeDefined();
    // Con `priority`, Next.js 16 quita `loading="lazy"` (carga inmediata) y precarga la imagen desde el <head>.
    expect(arch).not.toContain('loading="lazy"');
    const others = tags.filter((tag) => tag !== arch);
    expect(others.length).toBeGreaterThan(5);
    for (const tag of others) expect(tag, tag).toContain('loading="lazy"');
  });

  it("los nombres solo se anuncian una vez: el texto del arco y el de debajo se excluyen por tamaño de pantalla", () => {
    const html = render(base);
    expect(html.match(/<h1\b/g)).toHaveLength(2);
    expect(html).toContain("hidden lg:block"); // dentro del arco, solo en pantallas grandes
    expect(html).toContain("lg:hidden"); // debajo del arco, en el resto
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
