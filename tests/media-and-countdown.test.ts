import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { timeLeft } from "@/lib/countdown";
import { buildWhatsAppUrl, EVENT } from "@/lib/event";
import { discoverMedia, NO_MEDIA } from "@/lib/media";

import { makeTempDir } from "./helpers";

afterEach(() => vi.restoreAllMocks());

async function publicDir(files: string[]): Promise<string> {
  const dir = await makeTempDir();
  for (const file of files) {
    const target = path.join(dir, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, "x");
  }
  return dir;
}

describe("discoverMedia", () => {
  it("sin carpetas devuelve la invitación sin fotos (diseño floral)", async () => {
    expect(await discoverMedia(await makeTempDir())).toEqual(NO_MEDIA);
  });

  it("con las carpetas vacías (solo .gitkeep) tampoco hay medios", async () => {
    const dir = await publicDir(["images/.gitkeep", "images/galeria/.gitkeep", "videos/.gitkeep"]);
    expect(await discoverMedia(dir)).toEqual(NO_MEDIA);
  });

  it("la foto principal es main.* (la que usa el proyecto) y también sirve de portada del video", async () => {
    const media = await discoverMedia(await publicDir(["images/main.jpg", "videos/invitacion.mp4"]));
    expect(media.hero).toBe("/images/main.jpg");
    expect(media.videoPoster).toBe("/images/main.jpg");
  });

  it("si existen main.* y hero.*, gana main; hero.* sigue valiendo si no hay main", async () => {
    expect((await discoverMedia(await publicDir(["images/hero.png", "images/main.webp"]))).hero).toBe("/images/main.webp");
    expect((await discoverMedia(await publicDir(["images/hero.png"]))).hero).toBe("/images/hero.png");
  });

  it("en este repositorio, la foto principal es public/images/main.jpg y se descubre", async () => {
    const media = await discoverMedia(path.resolve(__dirname, "../public"));
    expect(media.hero).toBe("/images/main.jpg");
  });

  it("encuentra la foto principal, el video y su portada", async () => {
    const dir = await publicDir(["images/hero.jpg", "images/video-poster.webp", "videos/invitacion.mp4", "videos/invitacion.webm"]);
    const media = await discoverMedia(dir);

    expect(media.hero).toBe("/images/hero.jpg");
    expect(media.videoPoster).toBe("/images/video-poster.webp");
    // mp4 primero: es lo que reproduce Safari.
    expect(media.video?.sources).toEqual([
      { src: "/videos/invitacion.mp4", type: "video/mp4" },
      { src: "/videos/invitacion.webm", type: "video/webm" },
    ]);
  });

  it("usa la foto principal como portada del video si no hay otra", async () => {
    const dir = await publicDir(["images/hero.png", "videos/invitacion.mp4"]);
    expect((await discoverMedia(dir)).videoPoster).toBe("/images/hero.png");
  });

  it("no distingue mayúsculas en nombre ni extensión", async () => {
    const dir = await publicDir(["images/HERO.JPG", "videos/Invitacion.MP4"]);
    const media = await discoverMedia(dir);
    expect(media.hero).toBe("/images/HERO.JPG");
    expect(media.video?.sources[0].src).toBe("/videos/Invitacion.MP4");
  });

  it("ordena la galería por número (2 antes que 10), limita a 12 y escribe un texto alternativo", async () => {
    const files = Array.from({ length: 15 }, (_, i) => `images/galeria/foto-${i + 1}.jpg`);
    const media = await discoverMedia(await publicDir(files));

    expect(media.gallery).toHaveLength(12);
    expect(media.gallery.slice(0, 3).map((g) => g.src)).toEqual([
      "/images/galeria/foto-1.jpg",
      "/images/galeria/foto-2.jpg",
      "/images/galeria/foto-3.jpg",
    ]);
    expect(media.gallery[9].src).toBe("/images/galeria/foto-10.jpg");
    expect(media.gallery[0].alt).toBe("Foto 1 de Katheryn y Edwin");
  });

  it("ignora archivos que no son imágenes o videos admitidos y los ocultos", async () => {
    const dir = await publicDir([
      "images/hero.gif",
      "images/hero.svg",
      "images/notas.txt",
      "images/galeria/script.js",
      "images/galeria/.oculta.jpg",
      "images/galeria/ok.jpg",
      "videos/invitacion.mov",
      "videos/otro.mp4",
    ]);
    const media = await discoverMedia(dir);

    expect(media.hero).toBeNull();
    expect(media.video).toBeNull();
    expect(media.gallery.map((g) => g.src)).toEqual(["/images/galeria/ok.jpg"]);
  });

  it("codifica los nombres con espacios y caracteres especiales", async () => {
    const media = await discoverMedia(await publicDir(["images/galeria/boda # 1 ñ.jpg"]));
    expect(media.gallery[0].src).toBe("/images/galeria/boda%20%23%201%20%C3%B1.jpg");
  });

  it("un error de lectura no rompe la invitación y solo registra el código", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    // Un archivo donde se espera una carpeta provoca ENOTDIR (tratado como «sin medios»).
    const dir = await publicDir(["images"]);
    expect(await discoverMedia(dir)).toEqual(NO_MEDIA);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("timeLeft", () => {
  const target = Date.parse("2027-01-08T15:00:00-05:00");

  it("descompone el tiempo restante", () => {
    const now = target - (88 * 86_400 + 3 * 3_600 + 28 * 60 + 47) * 1000;
    expect(timeLeft(target, now)).toEqual({ days: 88, hours: 3, minutes: 28, seconds: 47, done: false });
  });

  it("a un segundo de la boda no ha terminado, y en el instante exacto sí", () => {
    expect(timeLeft(target, target - 1000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 1, done: false });
    expect(timeLeft(target, target).done).toBe(true);
    expect(timeLeft(target, target + 60_000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true });
  });

  it("una fecha inválida se trata como terminada, sin NaN", () => {
    expect(timeLeft(Number.NaN, Date.now()).done).toBe(true);
  });

  it("la boda es el 8 de enero de 2027 a las 3:00 p. m. de Bogotá (20:00 UTC)", () => {
    expect(new Date(EVENT.startsAtIso).toISOString()).toBe("2027-01-08T20:00:00.000Z");
  });
});

describe("buildWhatsAppUrl", () => {
  it("construye el enlace con el mensaje codificado", () => {
    const url = buildWhatsAppUrl("+57 300 123-4567", "Familia Pérez & Co")!;
    expect(url.startsWith("https://wa.me/573001234567?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toContain("Familia Pérez & Co");
    expect(url).not.toContain(" ");
  });

  it.each([[undefined], [""], ["abc"], ["123"], ["1".repeat(16)], ["57300123456x"], ["https://evil.example/?"], ["573001234567/../x"]])(
    "un número inválido (%s) no genera enlace",
    (value) => {
      expect(buildWhatsAppUrl(value, "Ana")).toBeNull();
    },
  );
});
