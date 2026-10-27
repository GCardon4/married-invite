// Prepara la imagen que WhatsApp y otras redes muestran al compartir el enlace. Uso: npm run prepare-og
//
// Lee public/images/main.jpg (NO la modifica) y escribe public/images/og/invitacion.jpg a 1200×630
// (proporción 1,91:1) y unos 100 KB: WhatsApp ignora las imágenes muy pesadas.
// Hay que volver a ejecutarlo si cambias main.jpg, y subir el resultado.
import { mkdir } from "node:fs/promises";

import sharp from "sharp";

const SRC = "public/images/main.jpg";
const OUT = "public/images/og/invitacion.jpg";

await mkdir("public/images/og", { recursive: true });
const info = await sharp(SRC)
  .resize(1200, 630, { fit: "cover", position: "attention" })
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile(OUT);
console.log(`${OUT}: ${info.width}x${info.height}, ${Math.round(info.size / 1024)} KB`);
