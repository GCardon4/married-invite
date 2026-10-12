import { readdir } from "node:fs/promises";
import path from "node:path";

import { EVENT } from "@/lib/event";

/**
 * Fotos y videos de los novios. Se descubren en `public/` con estas convenciones (docs/MEDIA.md):
 *
 *   public/images/hero.(jpg|jpeg|png|webp|avif)       foto principal, dentro del arco
 *   public/images/video-poster.(…)                    portada del video (opcional)
 *   public/images/galeria/*.(jpg|jpeg|png|webp|avif)  galería, por orden alfabético
 *   public/videos/invitacion.(mp4|webm)               video de los novios
 *
 * Si no hay archivos, la invitación usa su diseño floral sin fotos. Los medios son un adorno:
 * un fallo al leer la carpeta nunca debe impedir mostrar la invitación.
 */
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const VIDEO_TYPES: Record<string, string> = { ".mp4": "video/mp4", ".webm": "video/webm" };
const MAX_GALLERY = 12;

export interface GalleryImage {
  src: string;
  alt: string;
}

export interface InvitationMedia {
  hero: string | null;
  videoPoster: string | null;
  video: { sources: { src: string; type: string }[] } | null;
  gallery: GalleryImage[];
}

export const NO_MEDIA: InvitationMedia = { hero: null, videoPoster: null, video: null, gallery: [] };

async function filesIn(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }));
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    if (code !== "ENOENT" && code !== "ENOTDIR") console.error(`[media] ${String(code ?? "UNKNOWN")}`);
    return [];
  }
}

const extensionOf = (file: string) => path.extname(file).toLowerCase();
const baseOf = (file: string) => path.basename(file, path.extname(file)).toLowerCase();
const urlFor = (folder: string, file: string) => `/${folder}/${encodeURIComponent(file)}`;

function findImage(files: string[], base: string): string | null {
  const match = files.find((f) => IMAGE_EXTENSIONS.has(extensionOf(f)) && baseOf(f) === base);
  return match ?? null;
}

export async function discoverMedia(
  publicDir: string = path.join(process.cwd(), "public"),
): Promise<InvitationMedia> {
  const [images, gallery, videos] = await Promise.all([
    filesIn(path.join(publicDir, "images")),
    filesIn(path.join(publicDir, "images", "galeria")),
    filesIn(path.join(publicDir, "videos")),
  ]);

  const hero = findImage(images, "hero");
  const poster = findImage(images, "video-poster");

  const sources = videos
    .filter((f) => baseOf(f) === "invitacion" && extensionOf(f) in VIDEO_TYPES)
    .sort((a, b) => Number(extensionOf(b) === ".mp4") - Number(extensionOf(a) === ".mp4")) // mp4 primero (Safari)
    .map((f) => ({ src: urlFor("videos", f), type: VIDEO_TYPES[extensionOf(f)] }));

  return {
    hero: hero ? urlFor("images", hero) : null,
    videoPoster: poster ? urlFor("images", poster) : hero ? urlFor("images", hero) : null,
    video: sources.length > 0 ? { sources } : null,
    gallery: gallery
      .filter((f) => IMAGE_EXTENSIONS.has(extensionOf(f)))
      .slice(0, MAX_GALLERY)
      .map((f, i) => ({
        src: urlFor("images/galeria", f),
        alt: `Foto ${i + 1} de ${EVENT.partner1} y ${EVENT.partner2}`,
      })),
  };
}
