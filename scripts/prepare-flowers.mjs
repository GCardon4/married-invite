// Prepara las flores de la invitación para la web. Uso: npm run prepare-flowers
//
// Lee los originales de public/images/flowers/ (NO los modifica) y escribe versiones ligeras con
// transparencia en public/images/flowers/web/:
//   - arch-flowers.png (fondo blanco, 4,7 MB)  →  arch.webp (fondo transparente, ~0,5 MB)
//   - flower-01..04.png                         →  flower-01..04.webp (recortadas, ≤ 720 px)
//
// Hay que volver a ejecutarlo si cambias un original, y subir los .webp resultantes.
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const SRC = "public/images/flowers";
const OUT = path.join(SRC, "web");

// El fondo del arco es blanco. Por debajo de LO un píxel es flor (opaco); por encima de HI es
// fondo (transparente); entre ambos se difumina el borde. Los pétalos claros (rosa pálido) quedan
// por debajo de LO, así que no se vuelven transparentes.
const LO = 234;
const HI = 250;

async function keyOutWhite(file, width) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);

  for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const min = Math.min(r, g, b);
    const alpha = min >= HI ? 0 : min <= LO ? 1 : (HI - min) / (HI - LO);
    if (alpha === 0) continue; // píxel transparente: queda en 0,0,0,0

    // Quita el halo blanco que dejaría el borde mezclado con el fondo: c = (c − 255·(1−α)) / α
    const unmix = (c) => Math.max(0, Math.min(255, Math.round((c - 255 * (1 - alpha)) / alpha)));
    out[o] = unmix(r);
    out[o + 1] = unmix(g);
    out[o + 2] = unmix(b);
    out[o + 3] = Math.round(alpha * 255);
  }

  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82, alphaQuality: 92, effort: 5 });
}

async function report(label, file) {
  const { size } = await stat(file);
  const { width, height } = await sharp(file).metadata();
  console.log(`${label.padEnd(14)} ${String(width).padStart(5)} × ${String(height).padEnd(5)} ${(size / 1024).toFixed(0).padStart(5)} KB`);
}

await mkdir(OUT, { recursive: true });

const archSource = path.join(SRC, "arch-flowers.png");
await (await keyOutWhite(archSource, 2000)).toFile(path.join(OUT, "arch.webp"));
await report("arch.webp", path.join(OUT, "arch.webp"));

const flowers = (await readdir(SRC)).filter((f) => /^flower-\d+\.png$/i.test(f)).sort();
for (const file of flowers) {
  const target = path.join(OUT, file.replace(/\.png$/i, ".webp"));
  await sharp(path.join(SRC, file))
    .ensureAlpha()
    .trim() // quita el margen transparente: el tamaño en pantalla es el de la flor, no el del lienzo
    .resize({ width: 720, withoutEnlargement: true })
    .webp({ quality: 84, alphaQuality: 92, effort: 5 })
    .toFile(target);
  await report(path.basename(target), target);
}
