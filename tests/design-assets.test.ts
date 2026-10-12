import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..");
const WEB = path.join(ROOT, "public/images/flowers/web");

describe("imágenes de flores para la web", () => {
  const files = ["arch.webp", "flower-01.webp", "flower-02.webp", "flower-03.webp", "flower-04.webp"];

  it.each(files)("%s existe, tiene transparencia y pesa poco", async (file) => {
    const target = path.join(WEB, file);
    const { size } = await stat(target);
    const meta = await sharp(target).metadata();

    expect(meta.format).toBe("webp");
    expect(meta.hasAlpha).toBe(true);
    // Presupuesto: el arco es lo más grande; cada flor suelta, mucho menos (los originales pesaban hasta 4,7 MB).
    expect(size).toBeLessThan(file === "arch.webp" ? 700 * 1024 : 150 * 1024);
  });

  it("el arco tiene el fondo realmente transparente (no un rectángulo blanco)", async () => {
    const { data, info } = await sharp(path.join(WEB, "arch.webp")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] === 0) transparent++;

    expect(transparent / (info.width * info.height)).toBeGreaterThan(0.5);
    // El centro del lienzo (la zona abierta del arco) es transparente.
    const alphaAt = (x: number, y: number) => data[(y * info.width + x) * 4 + 3];
    expect(alphaAt(Math.round(info.width * 0.5), Math.round(info.height * 0.5))).toBe(0);
  });

  it("las dimensiones coinciden con las que declara el componente (evita saltos de diseño)", async () => {
    const { FLOWERS } = await import("@/components/invitation/flora");
    const sizes = {
      arch: "arch.webp",
      one: "flower-01.webp",
      two: "flower-02.webp",
      three: "flower-03.webp",
      four: "flower-04.webp",
    } as const;

    for (const [name, file] of Object.entries(sizes)) {
      const meta = await sharp(path.join(WEB, file)).metadata();
      const declared = FLOWERS[name as keyof typeof FLOWERS];
      expect({ name, width: meta.width, height: meta.height }).toEqual({
        name,
        width: declared.width,
        height: declared.height,
      });
    }
  });

  it("los originales siguen intactos (el script nunca los modifica)", async () => {
    const entries = await readdir(path.join(ROOT, "public/images/flowers"));
    for (const original of ["arch-flowers.png", "flower-01.png", "flower-02.png", "flower-03.png", "flower-04.png"]) {
      expect(entries, original).toContain(original);
    }
  });
});

describe("color principal #d3367b", () => {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  it("está definido como token y el resto del diseño depende de él", async () => {
    const css = await readFile(path.join(ROOT, "src/app/globals.css"), "utf8");
    expect(css).toMatch(/--primary:\s*#d3367b;/i);
    expect(css).toContain("--color-primary: var(--primary);");
    expect(css).toContain("--color-primary-strong: var(--primary-strong);");
  });

  it("no quedan restos de los nombres de color anteriores (plum, fuchsia) en el código", async () => {
    const offenders: string[] = [];
    const walk = async (dir: string) => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        else if (/\.(tsx?|css)$/.test(entry.name) && /\b(plum|fuchsia)\b|-(plum|fuchsia)\b/.test(await readFile(full, "utf8"))) {
          offenders.push(path.relative(ROOT, full));
        }
      }
    };
    await walk(path.join(ROOT, "src"));
    expect(offenders).toEqual([]);
  });

  it("el texto blanco sobre el color principal (botones) cumple el contraste AA (4,5:1)", () => {
    expect(contrast("#ffffff", "#d3367b")).toBeGreaterThanOrEqual(4.5);
  });

  it("el texto pequeño con el tono «strong» sobre la tarjeta crema cumple AA con margen", () => {
    expect(contrast("#b02a68", "#fffdfa")).toBeGreaterThanOrEqual(6);
    expect(contrast("#ffffff", "#b02a68")).toBeGreaterThanOrEqual(6); // hover de botones
  });

  it("el texto en el color principal sobre la tarjeta crema cumple AA (4,5:1)", () => {
    expect(contrast("#d3367b", "#fffdfa")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#d3367b", "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it("sobre el fondo de la página no llega a AA (por eso el texto pequeño va sobre tarjetas): el límite se documenta aquí", () => {
    // Si alguien cambia el fondo o el color y esto deja de ser cierto, hay que revisar dónde se apoya el texto.
    const onCanvas = contrast("#d3367b", "#faf7f5");
    expect(onCanvas).toBeGreaterThan(3); // vale para texto grande y de interfaz
    expect(onCanvas).toBeLessThan(4.5);
  });

  it("el texto por defecto de la página es el color principal", async () => {
    const css = await readFile(path.join(ROOT, "src/app/globals.css"), "utf8");
    expect(css).toMatch(/body\s*\{[^}]*color:\s*var\(--primary\)/);
  });

  it("ya no se usan el gris verdoso ni el burdeos como color de texto", async () => {
    const offenders: string[] = [];
    const walk = async (dir: string) => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        else if (/\.(tsx?|css)$/.test(entry.name) && /text-ink|primary-deep|text-primary-strong/.test(await readFile(full, "utf8"))) {
          offenders.push(path.relative(ROOT, full));
        }
      }
    };
    await walk(path.join(ROOT, "src"));
    expect(offenders).toEqual([]);
  });

  it("el botón de WhatsApp del panel es del color principal", async () => {
    const { buttonWhatsApp, buttonPrimary } = await import("@/components/admin/ui");
    expect(buttonWhatsApp).toContain("bg-primary");
    expect(buttonWhatsApp).toContain("text-white");
    expect(buttonWhatsApp).toContain("hover:bg-primary-strong");
    expect(buttonWhatsApp).not.toMatch(/#[0-9a-f]{6}/i); // sin colores sueltos: usa los tokens
    expect(buttonPrimary).toContain("bg-primary");
  });
});
