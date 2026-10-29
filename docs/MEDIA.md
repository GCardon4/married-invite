## Fotos y videos de la invitación

La invitación pública busca tus archivos en `public/` y los muestra sola. No hay que tocar código ni configurar nada: si una carpeta está vacía, esa parte simplemente no aparece y la invitación se ve igual, con su diseño floral.

## Dónde poner cada archivo

| Archivo | Qué es | Dónde se ve |
|---|---|---|
| `public/images/main.jpg` | **Foto principal de los novios** (la que usa el proyecto) | Dentro del arco de flores, en la portada. `hero.*` también vale; si existen ambas, gana `main` |
| `public/images/galeria/*.jpg` | Fotos de la galería (hasta 12, en orden alfabético) | Presentación de fotos con fundido dentro del arco de la portada, después de la foto principal |
| `public/videos/invitacion.mp4` | Video de los novios | Sección «Nuestra historia», con controles |
| `public/images/video-poster.jpg` | Portada del video (opcional) | Antes de pulsar «play». Si no existe, usa la foto principal |

- **Formatos de imagen:** `.jpg`, `.jpeg`, `.png`, `.webp` y `.avif`. Los nombres no distinguen mayúsculas.
- **Formatos de video:** `.mp4` (el que reproducen todos los teléfonos) y, opcionalmente, `.webm` con el mismo nombre.
- Para ordenar la galería usa números: `foto-1.jpg`, `foto-2.jpg`, … `foto-10.jpg` (el 10 va después del 9).
- Cualquier otro archivo de esas carpetas (`.gif`, `.svg`, `.txt`, `.mov`, los que empiezan por punto) se ignora.

## Cómo prepararlos

Tus invitados abrirán el enlace desde WhatsApp, casi siempre con datos móviles. Archivos pesados hacen que la invitación tarde en abrirse.

| Archivo | Recomendación |
|---|---|
| Foto principal | La foto actual (`main.jpg`, 640 × 640) funciona, pero se ve ampliada en pantallas de alta densidad: con 900 px o más de lado se ve más nítida. Se recorta en forma de arco (más alta que ancha), así que deja a las personas hacia el centro. Menos de 400 KB |
| Fotos de galería | Hasta 1600 px de lado, menos de 300 KB cada una |
| Video | 1080p o menos, 30–60 s, menos de 15 MB |

Next.js redimensiona y comprime las fotos al servirlas, pero parte de tu archivo original. El video se sirve tal cual.

Para comprimir un video con [ffmpeg](https://ffmpeg.org/) (H.264 + AAC, listo para reproducirse antes de descargarlo entero):

```bash
ffmpeg -i original.mov -vf "scale=-2:1080" -c:v libx264 -crf 26 -preset slow \
  -c:a aac -b:a 128k -movflags +faststart public/videos/invitacion.mp4
```

El video **no se reproduce solo**: el invitado pulsa «play». Así no gasta sus datos sin querer y respeta a quien tiene reducido el movimiento.

## Cuándo aparecen

Las carpetas se leen en cada visita, pero los archivos de `public/` se incluyen al construir la imagen de Docker. En producción, para publicar fotos o videos nuevos hay que **volver a desplegar**. Para probarlos antes en local:

```bash
npm run build && npm run start   # o: node .next/standalone/server.js
```

## Cosas a tener en cuenta

- **Todo lo que está en `public/` es público.** Cualquiera que conozca la dirección (por ejemplo `/images/hero.jpg`) puede verlo, sin necesitar el enlace de la invitación. Sube solo lo que quieras mostrar.
- **El tamaño cuenta en Git.** Los archivos de `public/` se guardan en el repositorio. Mantén cada uno por debajo de unos 10–15 MB, o comprímelos antes. Si el video fuera mucho más grande, conviene usar [Git LFS](https://git-lfs.com/) o alojarlo aparte.
- **Texto alternativo.** Las fotos de la galería llevan «Foto N de Katheryn y Edwin». No describen lo que aparece en cada foto; si lo necesitas, hay que ampliar el sistema.
- **Sin subtítulos.** Si el video tiene voz y quieres accesibilidad completa, habría que añadir un archivo de subtítulos.

## Flores de la decoración

Las flores de la invitación están en `public/images/flowers/`:

| Original | Uso |
|---|---|
| `arch-flowers.png` | Arco principal, en la parte superior de la invitación |
| `flower-01.png` a `flower-04.png` | Ramos sueltos en las esquinas del fondo y los bordes de las secciones |

Los originales no se muestran tal cual: el arco tiene **fondo blanco real** (sin transparencia) y pesa 4,7 MB. Para la web, `npm run prepare-flowers` genera en `public/images/flowers/web/` versiones `.webp` con fondo transparente y mucho más ligeras (el arco, ~0,5 MB; cada flor, 50–100 KB). **Es lo que usa la página.** El script no modifica tus originales.

Si cambias o agregas una flor:

1. Reemplaza el archivo original en `public/images/flowers/` (mismo nombre).
2. Ejecuta `npm run prepare-flowers`.
3. Sube también los `.webp` nuevos de `public/images/flowers/web/`.

Para que el recorte del arco salga limpio, el fondo del original debe ser blanco puro. Las flores sueltas deben tener ya su fondo transparente. Si cambian las proporciones, actualiza los tamaños de `FLOWERS` en `src/components/invitation/flora.tsx` (una prueba avisa si no coinciden).

Los originales siguen siendo públicos (`/images/flowers/arch-flowers.png`) aunque la página no los use, y viajan dentro de la imagen de Docker (~8 MB). Si no los necesitas en el sitio, puedes guardarlos fuera de `public/` (por ejemplo en una carpeta `assets-src/`) y apuntar `scripts/prepare-flowers.mjs` a ella.

## Otros datos de la invitación

- **Datos del evento** (fecha, lugares, mapa): `src/lib/event.ts`.
- **Código de vestimenta:** se muestra una sección si completas `dressCode` en `src/lib/event.ts`. Hoy está vacío porque `docs/ABOUT.md` no lo define.
- **Botón de WhatsApp:** aparece si defines la variable `WHATSAPP_NUMBER` (código de país y solo dígitos, p. ej. `573001234567`). Sin ella, el botón no se muestra.
- **Música de fondo:** `public/audio/music_romantic.mp3` se reproduce en bucle al 50 % de volumen (`src/components/invitation/background-music.tsx`). Arranca sola y con sonido; solo el invitado la silencia, con un botón fijo abajo a la izquierda. Si el navegador bloquea el autoplay con sonido, arranca en silencio y suena con el primer toque o tecla del invitado. Para cambiar la canción, reemplaza el archivo (mismo nombre) o ajusta `MUSIC_SRC`. El archivo (MP3, ~2 MB) es corto para que cargue rápido en móvil; el bucle lo repite sin pausa.
- **Vista previa al compartir (WhatsApp):** el enlace de cada invitación incluye etiquetas Open Graph (`src/app/invitacion/[token]/page.tsx`) con título y descripción genéricos (sin el nombre del invitado) y la imagen `public/images/og/invitacion.jpg`, de 1200×630 y ~115 KB. Se genera desde `public/images/main.jpg` con `npm run prepare-og`; ejecútalo y sube el resultado si cambias esa foto. Requiere `APP_BASE_URL` con la URL pública (https) para que la imagen tenga dirección absoluta. La URL de la imagen lleva un identificador de su contenido (`?v=…`), así que cuando cambias la imagen y despliegas, WhatsApp la trata como nueva. Los enlaces que ya se enviaron conservan la vista previa que WhatsApp guardó para ese enlace; los enlaces nuevos (o regenerados) salen con la imagen actual.
