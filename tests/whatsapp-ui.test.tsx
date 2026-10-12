import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LinkPanel } from "@/components/admin/link-panel";
import { WhatsAppSendButton } from "@/components/admin/whatsapp-send-button";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));

describe("LinkPanel con WhatsApp", () => {
  const link = "https://boda.example.com/invitacion/abc";

  it("con un enlace de WhatsApp muestra el botón, que se abre en pestaña nueva y sin enviar el origen", () => {
    const html = renderToStaticMarkup(<LinkPanel link={link} title="Enlace" whatsappUrl="https://wa.me/573001234567?text=hola" />);

    expect(html).toContain("Enviar por WhatsApp");
    expect(html).toContain('href="https://wa.me/573001234567?text=hola"');
    expect(html).toMatch(/target="_blank"[^>]*rel="noopener noreferrer"/);
    expect(html).toContain("Copiar enlace"); // copiar sigue disponible
  });

  it("sin teléfono utilizable (null) explica qué falta, en lugar de un botón roto", () => {
    const html = renderToStaticMarkup(<LinkPanel link={link} title="Enlace" whatsappUrl={null} />);

    expect(html).not.toContain("wa.me");
    expect(html).not.toContain("Enviar por WhatsApp");
    expect(html).toContain("teléfono válido con código de país");
  });

  it("si la función no aplica (undefined) no muestra nada de WhatsApp", () => {
    const html = renderToStaticMarkup(<LinkPanel link={link} title="Enlace" />);
    expect(html).not.toContain("WhatsApp");
    expect(html).not.toContain("teléfono válido");
  });
});

describe("WhatsAppSendButton", () => {
  it("con teléfono utilizable muestra el botón y, en el diálogo, el número y el aviso del enlace nuevo", () => {
    const html = renderToStaticMarkup(
      <WhatsAppSendButton guestId="guest_abc123" guestName="Familia Pérez" phoneDisplay="+573001234567" />,
    );

    expect(html).toContain('aria-label="Enviar la invitación de Familia Pérez por WhatsApp"');
    expect(html).toContain("+573001234567");
    expect(html).toContain("enlace nuevo");
    expect(html).toContain("dejará de");
    expect(html).toContain("Preparar mensaje");
  });

  it("sin teléfono utilizable no ofrece enviar: lleva a editar la invitación", () => {
    const html = renderToStaticMarkup(
      <WhatsAppSendButton guestId="guest_abc123" guestName="Familia Pérez" phoneDisplay={null} />,
    );

    expect(html).toContain("Agregar teléfono");
    expect(html).toContain('href="/admin/invitados/guest_abc123"');
    expect(html).not.toContain("Preparar mensaje");
    expect(html).not.toContain("<dialog");
  });

  it("escapa el nombre del invitado en el diálogo", () => {
    const html = renderToStaticMarkup(
      <WhatsAppSendButton guestId="guest_abc123" guestName={"<img src=x onerror=alert(1)>"} phoneDisplay="+573001234567" />,
    );
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("el diálogo de «lista» solo ofrece cerrar (el envío lo hace el botón de WhatsApp del panel)", () => {
    const html = renderToStaticMarkup(
      <WhatsAppSendButton guestId="guest_abc123" guestName="Ana" phoneDisplay="+573001234567" />,
    );
    expect(html).toContain("Invitación lista");
    expect(html).toContain("Cerrar");
  });
});
