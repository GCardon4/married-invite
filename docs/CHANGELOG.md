# Registro de cambios

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
