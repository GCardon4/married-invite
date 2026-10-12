## Fotos y videos de la invitación

La invitación pública busca tus archivos en `public/` y los muestra sola. No hay que tocar código ni configurar nada: si una carpeta está vacía, esa parte simplemente no aparece y la invitación se ve igual, con su diseño floral.

## Dónde poner cada archivo

| Archivo | Qué es | Dónde se ve |
|---|---|---|
| `public/images/hero.jpg` | Foto principal de los novios | Dentro del arco de flores, en la portada |
| `public/images/galeria/*.jpg` | Fotos de la galería (hasta 12, en orden alfabético) | Sección «Nuestra celebración» |
| `public/videos/invitacion.mp4` | Video de los novios | Sección «Nuestra historia», con controles |
| `public/images/video-poster.jpg` | Portada del video (opcional) | Antes de pulsar «play». Si no existe, usa `hero` |

- **Formatos de imagen:** `.jpg`, `.jpeg`, `.png`, `.webp` y `.avif`. Los nombres no distinguen mayúsculas.
- **Formatos de video:** `.mp4` (el que reproducen todos los teléfonos) y, opcionalmente, `.webm` con el mismo nombre.
- Para ordenar la galería usa números: `foto-1.jpg`, `foto-2.jpg`, … `foto-10.jpg` (el 10 va después del 9).
- Cualquier otro archivo de esas carpetas (`.gif`, `.svg`, `.txt`, `.mov`, los que empiezan por punto) se ignora.

## Cómo prepararlos

Tus invitados abrirán el enlace desde WhatsApp, casi siempre con datos móviles. Archivos pesados hacen que la invitación tarde en abrirse.

| Archivo | Recomendación |
|---|---|
| Foto principal | Vertical (proporción 4:5), unos 900 × 1125 px, menos de 400 KB |
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

## Otros datos de la invitación

- **Datos del evento** (fecha, lugares, mapa): `src/lib/event.ts`.
- **Código de vestimenta:** se muestra una sección si completas `dressCode` en `src/lib/event.ts`. Hoy está vacío porque `docs/ABOUT.md` no lo define.
- **Botón de WhatsApp:** aparece si defines la variable `WHATSAPP_NUMBER` (código de país y solo dígitos, p. ej. `573001234567`). Sin ella, el botón no se muestra.
