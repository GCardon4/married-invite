# Registro de cambios

## Colores de texto: títulos `#d3367b`, párrafos `#4a5a4d` — 2026-10-13

### Cambiado
- **Títulos y subtítulos** (encabezados, etiquetas, horas, nombres) siguen en el color principal `#d3367b`.
- **Párrafos y texto corriente** pasan a `#4a5a4d` (verde salvia): el color por defecto del `body` en `src/app/globals.css` es ahora `var(--ink)` en lugar de `var(--primary)`.
- El encabezado «Cuenta regresiva» lleva `text-primary` explícito, porque antes dependía del color heredado.
- `docs/DESIGN.md` actualizado. Contraste de `#4a5a4d` sobre la tarjeta y sobre el fondo de la página: cumple AA (4,5:1), con lo que el texto de párrafo ya no está limitado a ir sobre tarjetas.

## `public/images/main.jpg` como foto principal — 2026-10-15

### Cambiado
- La foto principal de la invitación es `public/images/main.jpg` (la de Katheryn y Edwin). Antes la página buscaba `hero.*`, así que esa foto no se estaba usando. `hero.*` sigue valiendo como alternativa; si existen ambas, gana `main`. Es también la portada del video, si lo hay.
- La foto se descargaba a **128 px** en el móvil para mostrarse a 144×214 (ampliada y borrosa): el tamaño solicitado se calculaba por el ancho, pero en un marco vertical manda el alto. Ahora pide el tamaño real (273 px para 278 de alto; en pantallas de alta densidad, hasta el máximo de la foto).
- En pantallas pequeñas el arco es un 30 % más ancho que la pantalla, de modo que el hueco —y la foto— pasan de 144×214 a 187×278 px y las flores siguen sangrando por los lados.

### Pruebas
- 3 pruebas nuevas (433 en total): `main` gana a `hero`, `hero` sigue valiendo, y en este repositorio `public/images/main.jpg` se descubre como foto principal.

### Notas
- `main.jpg` mide 640×640 px. En teléfonos de alta densidad (2–3×) se verá algo ampliada; con una versión de 900 px o más de lado quedaría más nítida. El código no necesita cambios para eso: basta reemplazar el archivo.
- La foto no se modificó.

## Garantía: los enlaces de invitación no caducan — 2026-10-15

### Verificado y protegido
- Un enlace de invitación **no tiene caducidad**: el modelo de datos no guarda ninguna fecha de vencimiento y abrir el enlace solo compara el hash del token con los guardados. Se comprobó con el reloj avanzado y reiniciando el servidor: sigue abriéndose y permitiendo responder a los 3 meses, a los 6, el día de la boda, 3 meses después de la boda, al año y a los 3 años.
- Solo deja de funcionar si el administrador **regenera** el enlace (incluido el botón WhatsApp sobre un invitado que ya tenía uno) o **elimina** la invitación.
- `tests/link-durability.test.ts` (10 pruebas, 430 en total) protege la garantía: si alguien añade una caducidad al modelo o al flujo del enlace, fallan.

### Documentado
- `docs/DATA_MODEL.md` §8 (Token): el enlace no caduca y cuándo se invalida.
- `docs/DEPLOYMENT.md`: lo que mantiene vivos los enlaces (volumen persistente y copias de seguridad) y la advertencia sobre regenerar.

### Decisión
- Se consideró añadir una fecha de vencimiento de 3 meses o más, y hacer que reenviar por WhatsApp no invalide el enlace anterior (requiere derivar el token de un secreto del servidor, un cambio de arquitectura). Se decidió **no** hacer ninguno: el requisito era la garantía de duración, que ya se cumplía.

## Texto y botón de WhatsApp en `#d3367b`, y nuevo mensaje — 2026-10-12

### Cambiado
- **Todo el texto va en el color principal `#d3367b`** (antes gris verdoso, burdeos o tonos distintos): párrafos, títulos, nombres, etiquetas y los bordes de los botones de contorno. El color por defecto de la página es el principal. Los colores de estado (confirmada, pendiente, error) se conservan porque comunican significado.
- **El botón de WhatsApp del panel es del color principal**, igual que el resto de acciones destacadas.
- **Mensaje de WhatsApp** (texto acordado): «Hola {nombre}, queremos hacerte oficialmente la invitación a nuestra boda, haz clic en el enlace para que veas tu invitación: {enlace con el token}». Va en una sola línea con el enlace al final, dentro de `https://wa.me/<número>?text=…`.
- Se eliminó el token `primary-deep` (burdeos), que ya no se usa.
- Los textos secundarios que usaban opacidad (`opacity-80`) ya no la usan: con el color principal, atenuarlos los dejaría por debajo del contraste AA.
- Nombres y fecha de la portada sobre una base suave de tarjeta, y nombres algo menores en pantallas pequeñas para que quepan en una línea.

### Contraste (medido, WCAG)
| Texto `#d3367b` sobre… | Contraste | AA texto normal (4,5) |
|---|---|---|
| Tarjeta crema `#fffdfa` | 4,51:1 | Cumple, por muy poco |
| Blanco | 4,58:1 | Cumple |
| Fondo de la página `#faf7f5` | 4,30:1 | **No cumple** |
| Zonas rosadas del fondo | 3,6–4,0:1 | **No cumple** (sí para texto grande, 3:1) |

Por eso el texto pequeño va siempre sobre una tarjeta o una base translúcida. Si quieres más margen en cualquier texto, el tono `#b02a68` (`primary-strong`) da 6,1:1.

### Pruebas
- 4 pruebas nuevas (420 en total): mensaje exacto, una sola línea, texto por defecto en el color principal, ausencia de colores de texto anteriores y botón de WhatsApp del color principal. Una prueba documenta el límite de contraste sobre el fondo de la página.

### Sin verificar
- El panel de administración autenticado con el texto en magenta (tablas y formularios). Solo se comprobó la pantalla de inicio de sesión y el botón de WhatsApp por pruebas.

## Nuevo diseño: color principal `#d3367b` y flores de `public/images/flowers` — 2026-10-12

### Cambiado
- **Color principal `#d3367b`** (magenta) en toda la aplicación, invitación y panel. Los tokens `plum` y `fuchsia` pasan a `primary`, con `primary-strong` (`#b02a68`, hover y texto pequeño) y `primary-deep` (`#841544`, nombres). El texto blanco sobre el principal cumple AA (4,6:1) y el texto pequeño usa el tono fuerte (6:1 o más). `docs/DESIGN.md` actualizado.
- **La decoración usa tus imágenes** en lugar de las flores dibujadas con SVG, que se eliminaron. `arch-flowers` abre la página como arco principal y encierra la foto de los novios (o su monograma) con los nombres debajo; en pantallas grandes los nombres van dentro del arco. Los 4 ramos sueltos adornan las esquinas del fondo y los bordes del saludo, el itinerario y la confirmación.
- En escritorio el arco ocupa todo el ancho para que las flores sangren por los bordes de la pantalla en vez de cortarse en seco; por encima de 1600 px los extremos se difuminan.

### Agregado
- `npm run prepare-flowers` (`scripts/prepare-flowers.mjs`): genera en `public/images/flowers/web/` versiones `.webp` con transparencia. El arco original tenía **fondo blanco real** y pesaba 4,7 MB; la versión web pesa ~0,5 MB y el optimizador entrega ~60 KB a un móvil. El recorte quita el halo blanco de los bordes y conserva los pétalos claros. **No modifica los originales.**
- `sharp` como dependencia de desarrollo (antes solo llegaba de forma indirecta con Next.js).
- 24 pruebas nuevas (416 en total): existencia, transparencia, peso y proporciones de las imágenes; color principal y contrastes WCAG; decoración oculta a lectores de pantalla; solo el arco se carga con prioridad.

### Corregido
- **Bloqueo de archivo en Windows.** Al crear `guests.json.lock` justo después de que otro proceso lo borrara, Windows devolvía `EPERM`/`EACCES`/`EBUSY` (el archivo queda «pendiente de eliminar») en lugar de `EEXIST`, y la operación fallaba como un error de almacenamiento. Aparecía solo bajo carga (una prueba falló 2 de 5 corridas). Ahora es contención transitoria: se reintenta hasta 1 s, y un permiso realmente denegado sigue fallando con su código. También se reintenta soltar el bloqueo. No afecta a Linux/Docker. 5 pruebas de regresión, que fallan sin la corrección.
- Legibilidad: la flor de la confirmación tapaba texto y el pie se perdía sobre las flores del fondo.

### Notas
- Tu servidor `npm run dev` debe **reiniciarse**: su compilador de Tailwind conserva los nombres de color anteriores y mostraría el texto en gris y los bordes en negro hasta entonces. Con `npm run build` los colores salen correctos.
- Los originales de `public/images/flowers/*.png` (~8 MB) siguen siendo públicos y viajan en la imagen de Docker aunque la página no los use (ver `docs/MEDIA.md`).

### Sin verificar
- El comportamiento en la imagen de Docker real (sí se comprobó que `sharp` queda dentro del servidor `standalone` y sirve las flores).
- El panel autenticado con el nuevo color (se comprobó la pantalla de inicio de sesión y los contrastes; no se recorrió con una sesión iniciada).

## Enviar invitaciones por WhatsApp desde el panel — 2026-10-12

### Agregado
- Botón **WhatsApp** en el dashboard (pendientes de respuesta), en el listado de invitados y en el detalle de cada invitado. Abre WhatsApp con el mensaje y el enlace personal listos para enviar al teléfono guardado, sin copiar nada.
- Al crear una invitación y al regenerar su enlace, el panel del enlace incluye «Enviar por WhatsApp». Sin teléfono utilizable, explica qué falta.
- `src/lib/whatsapp.ts`: normalización del teléfono (prefijo `+`/`00`, 10 dígitos con código por defecto, código ya incluido) y mensaje. Es conservadora: ante cualquier duda (letras, extensiones, longitudes ambiguas) no genera enlace en vez de adivinar.
- `POST /api/admin/invitados` y `POST /api/admin/invitados/[id]/enlace` devuelven `whatsappUrl` (o `null`).
- Variable opcional `WHATSAPP_DEFAULT_COUNTRY_CODE` (por defecto `57`).
- 55 pruebas nuevas (392 en total): normalización de teléfonos, URL y mensaje (con nombres maliciosos), respuestas de la API y la interfaz.

### Decisiones
- El enlace de una invitación existente **no se puede recuperar** (solo se guarda su hash, por seguridad). Por eso, enviar desde el dashboard o el listado **genera un enlace nuevo** y el anterior deja de funcionar; el botón pide confirmación y lo explica. No se cambió el modelo de datos.
- No se envía nada automáticamente: el administrador abre WhatsApp y pulsa enviar. La ventana se abre con un clic en el último paso para que el navegador no la bloquee.

### Sin verificar
- La interfaz del botón en un navegador con una sesión de administrador iniciada (las pruebas la renderizan, pero no se recorrió el flujo completo).
- Cómo se abre `wa.me` en el teléfono o escritorio del administrador (depende de que tenga WhatsApp instalado o WhatsApp Web).

## Primer despliegue en Coolify — 2026-10-12

### Observado en el primer despliegue (`logs/errorDeploy.log`)
- La imagen **se construye correctamente en Coolify**. El contenedor nuevo no arrancó porque `ADMIN_PASSWORD_HASH` no llegó como variable de entorno en tiempo de ejecución; el entrypoint lo detectó, el contenedor se marcó «unhealthy» y Coolify **conservó el contenedor anterior**. Es el comportamiento previsto de la comprobación de arranque y del *rolling update*.
- Se confirmó que Coolify usa el `HEALTHCHECK` del Dockerfile. Su aviso sobre `curl`/`wget` es genérico y no aplica (la sonda usa `node`).

### Cambiado
- `docker-entrypoint.sh` informa **todos** los problemas de configuración de una vez (antes se detenía en el primero), para no gastar un despliegue por cada variable que falte.
- `docs/DEPLOYMENT.md`: lista rápida de variables para Coolify y este síntoma en «Si algo falla».

## Alertas de secretos en GitHub — 2026-10-12

### Cambiado
- Las pruebas (`tests/admin-auth.test.ts`, `tests/admin-routes.test.ts`) ya no contienen contraseñas ni hashes escritos en el código: se generan al ejecutarlas. Eran valores falsos, pero los escáneres de secretos los confundían con credenciales. No se añadió `tests/` a `.gitignore`: ignorar no quita lo ya subido y ocultaría las pruebas.
- `.gitignore`: se excluyen también claves y credenciales (`*.key`, `*.p12`, `*.pfx`, `id_rsa*`, `id_ed25519*`, `*.secret`, `credentials*.json`, `service-account*.json`, `secrets/`).

## Página raíz eliminada e invitación de prueba — 2026-10-12

### Eliminado
- `src/app/page.tsx`: la página de plantilla de `create-next-app` (con enlaces a Vercel). Ahora `/` responde 404 hasta que se defina una página de bienvenida (`docs/REQUIREMENTS.md` §2.1). Las invitaciones se abren solo con su enlace personal.

### Agregado (solo en tu equipo, nada va a Git)
- `.env.local` (ignorado por Git) con una configuración de desarrollo: `APP_BASE_URL`, `DATA_FILE_PATH`, un `SESSION_SECRET` aleatorio y el hash Argon2id de una contraseña de administrador aleatoria.
- Una invitación de prueba para «Gustavo Cardona» (cupo 4), creada por el flujo real de la aplicación (`POST /api/admin/invitados`). Está en `data/guests.json`, que Git ignora. Solo se guarda el hash de su enlace.

## Rediseño de la invitación pública — 2026-10-12

### Cambiado
- `/invitacion/[token]` rediseñada según `docs/DESIGN.md` y `ideas/invitaci_n_de_matrimonio`: saludo personalizado («¡Hola, {nombre}!») con el pase del invitado, portada en arco con guirnalda de flores, nombres y fecha, cuenta regresiva, itinerario, cómo llegar, video y galería, y la confirmación de asistencia, con una barra fija para responder desde el teléfono.
- La pantalla de enlace no disponible y la de carga comparten el fondo floral.

### Agregado
- **Decoración floral** (`src/components/invitation/flora.tsx`): ilustración SVG propia con la paleta del proyecto. Ramos en las cuatro esquinas del fondo (fijos mientras se desplaza), pétalos que caen despacio, guirnalda alrededor del arco, divisores y ramitas en las tarjetas. Decorativa (`aria-hidden`) y sin animación con «reducir movimiento».
- **Fotos y videos** (`src/lib/media.ts`, `docs/MEDIA.md`): se descubren en `public/images/hero.*`, `public/images/galeria/` y `public/videos/invitacion.mp4`. Sin archivos, la invitación usa el arco con las iniciales. Cualquier problema al leer las carpetas se ignora para no impedir mostrar la invitación. Las fotos pasan por el optimizador de Next.js; el video no se reproduce solo.
- Cuenta regresiva hasta la eucaristía (8 de enero de 2027, 3:00 p. m. de Bogotá), sin desajuste de hidratación y con un resumen estable para lectores de pantalla.
- Botón opcional de WhatsApp (`WHATSAPP_NUMBER`): solo aparece con un número válido de 8 a 15 dígitos.
- Sección opcional «Código de vestimenta» (`EVENT.dressCode`), vacía mientras `docs/ABOUT.md` no lo defina.
- Caché de un día para `/images` y `/videos`.
- Carpetas `public/images/galeria/` y `public/videos/` (con `.gitkeep`).
- 32 pruebas nuevas (337 en total) para la vista, los medios, la cuenta regresiva y el enlace de WhatsApp.

### Verificado en un navegador real
Móvil (390 px) y escritorio (1280 px), con y sin fotos de prueba, que luego se eliminaron: sin desbordamiento horizontal, sin errores de consola, fotos con texto alternativo y cuenta regresiva en marcha. En esa revisión se corrigieron flores del arco recortadas por el SVG, una ramita que tapaba texto de la tarjeta de saludo y títulos de sección ilegibles sobre los ramos del fondo.

### No incluido (a propósito)
- Mesa asignada, nombres de acompañantes y restricciones alimentarias del mockup: no existen en `docs/DATA_MODEL.md`.
- Ciudad del evento, código de vestimenta y número de WhatsApp: no están en `docs/ABOUT.md`, así que no se inventaron.
- Mapa incrustado de Google (se usa un botón que abre Google Maps): evita cargar contenido de terceros.
- La página `/` sigue siendo la plantilla de Next.js.

### Sin verificar
- La reproducción del video: no había un archivo de video para probar (solo se comprobó el marcado).
- La imagen de Docker con las fotos (ver `docs/DEPLOYMENT.md` §9).

## Auditoría y despliegue en Coolify — 2026-10-12

Informe completo en `docs/AUDITORIA.md`.

### Corregido
- **Pérdida de escrituras entre procesos (alta).** Con dos procesos sobre el mismo archivo (el solape de un *rolling update* de Coolify) se perdía la mitad de las escrituras: 40 actualizaciones dejaban 21 y 60 creaciones dejaban 30. Ahora cada modificación toma un bloqueo de archivo (`<archivo>.lock`) de corta duración que caduca si el proceso muere. 9 pruebas nuevas.
- **Panel incrustable en un `<iframe>` ajeno (media).** Cabeceras de seguridad en todas las rutas (`X-Frame-Options`, `frame-ancestors`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS).

### Agregado
- `Dockerfile` (varias etapas, Node 24 Alpine, salida `standalone`, usuario sin privilegios, `tini`), `docker-entrypoint.sh`, `.dockerignore` y `.gitattributes`.
- El entrypoint falla pronto, sin imprimir valores, si faltan `ADMIN_PASSWORD_HASH` o `SESSION_SECRET`, si el hash tiene un formato inválido o si no se puede escribir en el volumen. Advierte si `/app/data` no es un volumen montado o si `APP_BASE_URL` no usa HTTPS.
- `GET /api/health`: comprueba que el archivo de datos se puede leer y es válido. La usa el `HEALTHCHECK` del Dockerfile.
- `docs/DEPLOYMENT.md` (configuración de Coolify, verificación, copias de seguridad, restauración y problemas frecuentes) y `docs/AUDITORIA.md`.
- 21 pruebas nuevas (305 en total): bloqueo entre procesos, sonda de salud, cabeceras, y que el Dockerfile no incorpore secretos ni datos.

### Cambiado
- `next.config.ts`: `output: "standalone"` y `headers()`. No cambia el stack.

### Sin verificar
- La imagen de Docker no se ha construido ni ejecutado (Docker Desktop estaba apagado). Ver `docs/DEPLOYMENT.md` §9.

## Autenticación y panel administrativo — 2026-10-12

### Agregado
- **Autenticación del administrador único** (`src/lib/auth.ts`, `src/lib/session.ts`): contraseña verificada con Argon2id (`@node-rs/argon2`), sesiones en el servidor con cookie firmada (`HttpOnly`, `SameSite=Strict`, y `Secure` + `__Host-` en producción), vencimiento absoluto de 8 h e inactividad de 2 h, y cierre de sesión que invalida de verdad. Diseño completo en `docs/ARCHITECTURE.md` §6.3.
- **API administrativa** (`/api/admin/...`): `login`, `logout`, listar y buscar, crear, consultar, actualizar y eliminar invitados, y `POST /api/admin/invitados/[id]/enlace` para regenerar el enlace. Todas pasan por `withAdmin` (`src/lib/admin-api.ts`): sesión antes que cualquier lógica y, al modificar datos, `Origin` del propio sitio y `Content-Type` JSON.
- **Panel privado**: `/admin/login`, `/admin/dashboard` (seis estadísticas del modelo de datos, avance de respuestas y pendientes), `/admin/invitados` (búsqueda, filtro por estado y paginación), `/admin/invitados/nuevo` y `/admin/invitados/[id]` (edición, respuesta registrada, regenerar enlace y eliminar con confirmación). Con panel de enlace y botón de copiar.
- `src/lib/statistics.ts` y `GuestService.getStatistics()`.
- `npm run hash-password`: genera `ADMIN_PASSWORD_HASH` sin eco de la contraseña, en formato `base64:` para que `.env` no interprete los `$`.
- Límites de intentos de inicio de sesión: 10 por cliente y 100 en total cada 15 minutos.
- 140 pruebas nuevas (284 en total): inicio y cierre de sesión, firma, vencimiento y rotación del secreto, los 6 endpoints sin sesión (sin cookie, falsa, de otra clave, cerrada y vencida), una guardia estructural que lee el código de las rutas, CRUD completo, CSRF, límites y ausencia de fugas.

### Cambiado
- Los errores 500 (público y administrativo) devuelven el código genérico `SERVER_ERROR` en vez del interno (`DATA_CORRUPTION`, `PERSISTENCE`, `CONFIGURATION`).
- Los mensajes de validación de Zod están en español (`z.locales.es()`).
- `SessionStore` y `RateLimiter` leen el reloj en cada llamada (antes capturaban `Date.now`).

### Fuera de este alcance (a propósito)
- Los campos del mockup `ideas/agregar_o_editar_invitado` que no existen en `docs/DATA_MODEL.md` (mesa, notas dietéticas, WhatsApp, edición manual del estado de la respuesta). Requieren cambiar el modelo y su documentación primero.
- Recuperación de contraseña y varios administradores (fuera del alcance inicial).

### Notas y limitaciones
- Las sesiones están en memoria: reiniciar el servidor, por ejemplo al desplegar, obliga a iniciar sesión de nuevo. Solo es válido con una instancia de Node.js.
- Una página administrativa sin sesión responde `200` con la redirección dentro del contenido transmitido, sin ningún dato. La API responde `401`.
- `docs/SECURITY.md` sigue truncado (termina en §5.1, «Se recomienda»). Los controles aplicados se basan en lo legible de ese documento, en REQUIREMENTS y en ARCHITECTURE. No se modificó, porque es un documento en curso.

## Flujo público de invitaciones — 2026-10-12

### Agregado
- `GET /api/public/invitaciones/[token]` y `POST /api/public/invitaciones/[token]/respuesta`. Contrato y medidas de seguridad en `docs/ARCHITECTURE.md` §6.1.
- Página `/invitacion/[token]`, con la invitación del evento (datos de `docs/ABOUT.md` en `src/lib/event.ts`), el formulario de confirmación o rechazo y el número de asistentes dentro del cupo, y los estados de carga, éxito y error. También `error.tsx` y la pantalla de enlace no disponible.
- `src/lib/http.ts` (respuestas JSON sin caché, errores públicos sin detalles internos, lectura acotada del cuerpo, comprobación de `Origin`) y `src/lib/rate-limit.ts` (límites por cliente y por invitación).
- Errores `403`, `413`, `415` y `429` en `src/lib/errors.ts`, y los textos para el invitado en `src/lib/public-messages.ts` y `src/lib/rsvp.ts`.
- 58 pruebas nuevas (144 en total): rutas HTTP, seguridad de origen y tipo de contenido, límites de uso, cupo, ausencia de fuga de datos, errores de servidor, lógica del cliente y renderizado.

### Cambiado
- El mensaje al superar el cupo indica el máximo (`Tu invitación admite hasta N personas.`).
- `layout.tsx` y `globals.css`: idioma `es`, fuentes Playfair Display y Plus Jakarta Sans, y la paleta de `docs/DESIGN.md`. Se eliminó el cambio automático a tema oscuro de la plantilla, porque el sistema de diseño solo define tema claro.

### Fuera de este alcance (a propósito)
- El mockup de `ideas/` incluye nombres de acompañantes, restricciones alimentarias y dedicatoria, que no existen en `docs/DATA_MODEL.md`. No se implementaron: requieren cambiar el modelo y su documentación.
- Cuenta regresiva, galería y paleta de vestimenta (sin datos definidos), y botón de WhatsApp.

### Notas
- Una invitación inválida responde `200` con el mensaje «Enlace no disponible» y no `404`, porque el contenido se transmite después de enviar la cabecera. La API sí responde `404`.

## Repositorio y servicio de invitados — 2026-10-12

### Agregado
- `src/lib/guest-repository.ts`: interfaz `GuestRepository` y `FileGuestRepository` (JSON), con cola de operaciones, validación del archivo al leer y antes de escribir, escritura temporal con `fsync` y reemplazo con `rename`, e inicialización segura. Ver `docs/DATA_MODEL.md` §13.
- `src/lib/guest-service.ts`: crear, listar y buscar, consultar, actualizar, eliminar y regenerar token; consultar y responder la invitación por token. El cupo se verifica dentro de la operación atómica del repositorio, y ninguna salida incluye `tokenHash`.
- `src/lib/errors.ts` y `src/lib/token.ts` (los módulos que necesita el servicio): errores con mensajes seguros para el cliente, y generación de tokens (32 bytes aleatorios en base64url) con hash SHA-256 hexadecimal.
- Tipo `AdminGuest` (`Guest` sin `tokenHash`).
- Vitest, con `npm test`, `vitest.config.mts` y 86 pruebas en `tests/` sobre archivos reales en directorios temporales.

### Cambiado
- `@types/node` pasó de `^20` a `^24` (Vitest 5 lo exige y coincide con Node 24).

### Pendiente
- Endpoints, interfaz, autenticación y sesiones, y estadísticas.
- No hay pruebas con varios procesos: la serialización es local al proceso.

## Base del proyecto — 2026-10-12

### Agregado
- Dependencia `zod`.
- `src/types/guest.ts`: `GuestStatus`, `Guest`, `GuestDatabase`, `PublicInvitation`, `GuestResponseInput` y `GuestStatistics`, según `DATA_MODEL.md`.
- `src/lib/validations.ts`: esquemas Zod del registro persistido (con reglas cruzadas de estado), del archivo raíz (unicidad de `id` y `tokenHash`), de la creación y actualización administrativa, de la consulta de listado, de la respuesta pública, del identificador y del token público.
- Estructura de carpetas de `ARCHITECTURE.md` §4, con `.gitkeep` en los directorios vacíos. Los módulos `auth`, `session`, `token`, `guest-repository`, `guest-service`, `statistics` y `errors` son marcadores vacíos.
- `.env.example` con `APP_BASE_URL`, `DATA_FILE_PATH`, `ADMIN_PASSWORD_HASH` y `SESSION_SECRET`.
- Script `npm run typecheck`.

### Cambiado
- El código se movió de `app/` a `src/app/`, y el alias `@/*` apunta ahora a `./src/*`.
- `.gitignore`: se permite versionar `.env.example`, y se excluyen `data/*` (salvo `.gitkeep`), `*.bak` y `*.tmp`.
- `README.md`: se eliminó la referencia a Prisma + SQLite, que contradecía `AGENTS.md`, y se documentaron scripts, estado y variables.
- `docs/DATA_MODEL.md` §8: se documentaron las decisiones de validación (formato de `id` y `tokenHash`, normalización de contactos, entradas estrictas).

### Eliminado
- `app/data/guests.json`: archivo de ejemplo con datos ficticios que estaba versionado, con un campo `fullName` que no coincidía con el modelo (`name`). Los datos no pertenecen a `app/` ni a Git. Sigue en el historial de Git.

### Pendiente
- Interfaz, autenticación y sesiones, repositorio JSON, servicio de invitados, tokens, estadísticas, endpoints y pruebas.
- `docs/DEPLOYMENT.md`, que aparece en la estructura pero aún no existe.
