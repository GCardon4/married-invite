import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LinkPanel } from "@/components/admin/link-panel";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime } from "@/lib/format";

describe("StatusBadge", () => {
  it.each([
    ["pending", "Pendiente"],
    ["confirmed", "Confirmada"],
    ["declined", "Rechazada"],
  ] as const)("%s se comunica con texto, no solo con color", (status, label) => {
    expect(renderToStaticMarkup(<StatusBadge status={status} />)).toContain(label);
  });
});

describe("LinkPanel", () => {
  it("muestra el enlace, el botón de copiar y avisa que no se podrá volver a ver", () => {
    const html = renderToStaticMarkup(
      <LinkPanel link="https://boda.example.com/invitacion/abc" title="Enlace de la invitación" />,
    );
    expect(html).toContain('value="https://boda.example.com/invitacion/abc"');
    expect(html).toContain("readOnly");
    expect(html).toContain("Copiar enlace");
    expect(html).toContain("no se puede volver a mostrar");
  });
});

describe("formatDateTime", () => {
  it("muestra la hora de Colombia y un guion cuando no hay fecha", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("no-es-fecha")).toBe("—");
    // 2026-10-05T18:30Z son las 13:30 en Bogotá (UTC-5).
    expect(formatDateTime("2026-10-05T18:30:00.000Z")).toMatch(/1:30/);
  });
});
