import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildInvitationMessage,
  buildInvitationWhatsAppUrl,
  defaultCountryCode,
  normalizeWhatsAppNumber,
  whatsAppDisplayNumber,
} from "@/lib/whatsapp";

afterEach(() => vi.unstubAllEnvs());

describe("normalizeWhatsAppNumber", () => {
  it.each([
    ["con prefijo + y espacios", "+57 300 123 4567", "573001234567"],
    ["con prefijo + y guiones", "+57-300-123-4567", "573001234567"],
    ["con paréntesis", "+57 (300) 123 4567", "573001234567"],
    ["con prefijo 00", "0057 300 123 4567", "573001234567"],
    ["10 dígitos sin prefijo (se añade el código por defecto)", "300 123 4567", "573001234567"],
    ["10 dígitos pegados", "3001234567", "573001234567"],
    ["fijo de 10 dígitos", "(601) 234 5678", "576012345678"],
    ["ya trae el código del país", "573001234567", "573001234567"],
    ["otro país con prefijo +", "+1 415 555 2671", "14155552671"],
    ["con puntos", "300.123.4567", "573001234567"],
    ["con espacios al inicio y al final", "  +57 300 123 4567  ", "573001234567"],
  ])("%s", (_name, input, expected) => {
    expect(normalizeWhatsAppNumber(input, "57")).toBe(expected);
  });

  it.each([
    ["vacío", ""],
    ["solo espacios", "   "],
    ["null", null],
    ["undefined", undefined],
    ["demasiado corto", "300123"],
    ["con letras", "tres cero cero"],
    ["con extensión", "3001234567 ext 5"],
    ["con una URL", "https://evil.example/?x=1"],
    ["con una barra o caracteres de URL", "300/123?4567"],
    ["9 dígitos (¿falta un dígito?)", "300123456"],
    ["11 dígitos que no empiezan por el código del país (ambiguo)", "13001234567"],
    ["prefijo + que empieza por 0", "+0 300 123 4567"],
    ["demasiados dígitos", "+5730012345678901"],
    ["solo el signo +", "+"],
  ])("rechaza %s (no adivina el número)", (_name, input) => {
    expect(normalizeWhatsAppNumber(input as string | null | undefined, "57")).toBeNull();
  });

  it("el resultado son solo dígitos: no se puede inyectar nada en la URL", () => {
    for (const input of ["+57 300 123 4567", "3001234567", "0057 3001234567"]) {
      expect(normalizeWhatsAppNumber(input, "57")).toMatch(/^\d{8,15}$/);
    }
  });

  it("usa el código de país configurado", () => {
    expect(normalizeWhatsAppNumber("3001234567", "52")).toBe("523001234567");
    expect(normalizeWhatsAppNumber("523001234567", "52")).toBe("523001234567");
    expect(normalizeWhatsAppNumber("573001234567", "52")).toBeNull();
  });
});

describe("defaultCountryCode", () => {
  it("es Colombia (57) si no hay configuración o es inválida", () => {
    expect(defaultCountryCode(undefined)).toBe("57");
    for (const invalid of ["", "abc", "0", "+", "5732", "-57", "57x", "052"]) {
      expect(defaultCountryCode(invalid), JSON.stringify(invalid)).toBe("57");
    }
    // Un valor válido distinto se respeta (no es el mismo resultado que el de arriba por casualidad).
    expect(defaultCountryCode(" 34 ")).toBe("34");
  });

  it("acepta un código de 1 a 3 dígitos, con o sin +", () => {
    expect(defaultCountryCode("52")).toBe("52");
    expect(defaultCountryCode("+34")).toBe("34");
    expect(defaultCountryCode("1")).toBe("1");
    expect(defaultCountryCode("593")).toBe("593");
  });

  it("lee WHATSAPP_DEFAULT_COUNTRY_CODE del entorno", () => {
    vi.stubEnv("WHATSAPP_DEFAULT_COUNTRY_CODE", "52");
    expect(defaultCountryCode()).toBe("52");
    expect(normalizeWhatsAppNumber("3001234567")).toBe("523001234567");
  });
});

describe("whatsAppDisplayNumber", () => {
  it("muestra el número con + o null", () => {
    expect(whatsAppDisplayNumber("300 123 4567", "57")).toBe("+573001234567");
    expect(whatsAppDisplayNumber("no es un número", "57")).toBeNull();
    expect(whatsAppDisplayNumber(null, "57")).toBeNull();
  });
});

describe("buildInvitationMessage / buildInvitationWhatsAppUrl", () => {
  const link = "https://boda.example.com/invitacion/ABCdef123_-";

  it("el mensaje saluda por el nombre, informa del evento e incluye el enlace", () => {
    const message = buildInvitationMessage("Familia Pérez", link);
    expect(message).toContain("¡Hola, Familia Pérez!");
    expect(message).toContain("Katheryn y Edwin");
    expect(message).toContain("viernes 8 de enero de 2027");
    expect(message.endsWith(link)).toBe(true);
  });

  it("la URL abre WhatsApp con el número normalizado y el mensaje codificado", () => {
    const url = buildInvitationWhatsAppUrl({ name: "Ana", phone: "+57 300 123 4567" }, link, "57")!;
    const parsed = new URL(url);

    expect(parsed.origin).toBe("https://wa.me");
    expect(parsed.pathname).toBe("/573001234567");
    expect([...parsed.searchParams.keys()]).toEqual(["text"]);
    expect(parsed.searchParams.get("text")).toBe(buildInvitationMessage("Ana", link));
    expect(url).not.toContain(" ");
    expect(url).not.toContain("\n");
  });

  it("sin teléfono utilizable no genera enlace", () => {
    expect(buildInvitationWhatsAppUrl({ name: "Ana", phone: null }, link, "57")).toBeNull();
    expect(buildInvitationWhatsAppUrl({ name: "Ana", phone: "abc" }, link, "57")).toBeNull();
  });

  it("un nombre con caracteres especiales no puede alterar la URL ni añadir parámetros", () => {
    const evil = 'Ana&phone=999&text=hola #<script>alert(1)</script>%0A?x=1';
    const url = buildInvitationWhatsAppUrl({ name: evil, phone: "3001234567" }, link, "57")!;
    const parsed = new URL(url);

    expect(parsed.hostname).toBe("wa.me");
    expect(parsed.pathname).toBe("/573001234567");
    expect([...parsed.searchParams.keys()]).toEqual(["text"]);
    expect(parsed.hash).toBe("");
    expect(parsed.searchParams.get("text")).toContain(evil);
  });

  it("los enlaces con caracteres especiales se conservan intactos", () => {
    const tricky = "https://boda.example.com/invitacion/a_b-c?x=1&y=2";
    const url = buildInvitationWhatsAppUrl({ name: "Ana", phone: "3001234567" }, tricky, "57")!;
    expect(new URL(url).searchParams.get("text")).toContain(tricky);
  });
});
