## Arquitectura del sistema de invitaciones digitales

**Versión:** 1.0  
**Framework:** Next.js App Router  
**Lenguaje:** TypeScript  
**Persistencia:** JSON local  
**Despliegue:** Coolify sobre VPS  
**Runtime:** Node.js

---

## 1. Objetivo

Definir la arquitectura técnica de la aplicación, sus componentes, rutas, flujo de datos, límites de seguridad y decisiones de implementación.

La aplicación permitirá administrar aproximadamente 150–200 invitados mediante un panel privado y ofrecerá una página de invitación individual a través de un enlace único.

## 2. Principios arquitectónicos

La aplicación debe seguir estos principios:

1. Separar la interfaz de usuario de la lógica de negocio y del almacenamiento.
2. Ejecutar las operaciones sensibles exclusivamente en el servidor.
3. Centralizar las validaciones y reglas de negocio.
4. Evitar el acceso directo al sistema de archivos desde los componentes visuales.
5. Mantener el almacenamiento detrás de un repositorio reemplazable.
6. No utilizar el navegador como fuente de verdad de los invitados.
7. Minimizar la exposición pública de información personal.
8. Mantener una sola instancia de Node.js mientras se utilice JSON local.
9. Conservar los datos mediante un volumen persistente de Coolify.

## 3. Arquitectura general

La aplicación se organiza en cuatro capas principales:

### 3.1. Presentación

Responsable de renderizar las páginas y gestionar la interacción del usuario.

Incluye:

- Invitación pública.
- Formulario de respuesta.
- Inicio de sesión administrativo.
- Dashboard.
- Listado y formularios de invitados.
- Componentes reutilizables.

### 3.2. API y control de acceso

Responsable de recibir las solicitudes HTTP, validar parámetros, comprobar la autenticación y devolver respuestas.

Incluye:

- Route Handlers de Next.js.
- Validación de entradas con Zod.
- Verificación de sesión administrativa.
- Control de acceso a invitaciones mediante token.
- Manejo uniforme de errores.

### 3.3. Lógica de negocio

Responsable de aplicar las reglas funcionales independientemente de la interfaz.

Incluye:

- Creación y actualización de invitados.
- Confirmación o rechazo de asistencia.
- Validación de cupos.
- Generación y regeneración de tokens.
- Cálculo de estadísticas.
- Eliminación de invitaciones.

### 3.4. Persistencia

Responsable de leer y escribir los datos almacenados en JSON.

Incluye:

- Repositorio de invitados.
- Lectura y validación del archivo.
- Serialización de operaciones de escritura.
- Escritura temporal y reemplazo controlado.
- Gestión de errores de persistencia.

## 4. Estructura de carpetas

```text
project/
├── docs/
│   ├── REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── SECURITY.md
│   └── DEPLOYMENT.md
├── data/
│   └── .gitkeep
├── public/
│   ├── images/
│   └── fonts/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── invitacion/
│   │   │   └── [token]/
│   │   │       └── page.tsx
│   │   ├── admin/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   └── invitados/
│   │   │       ├── page.tsx
│   │   │       ├── nuevo/
│   │   │       │   └── page.tsx
│   │   │       └── [id]/
│   │   │           └── page.tsx
│   │   └── api/
│   │       ├── public/
│   │       │   └── invitaciones/
│   │       │       └── [token]/
│   │       │           ├── route.ts
│   │       │           └── respuesta/
│   │       │               └── route.ts
│   │       └── admin/
│   │           ├── login/
│   │           │   └── route.ts
│   │           ├── logout/
│   │           │   └── route.ts
│   │           └── invitados/
│   │               ├── route.ts
│   │               └── [id]/
│   │                   └── route.ts
│   ├── components/
│   │   ├── invitation/
│   │   └── admin/
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── session.ts
│   │   ├── token.ts
│   │   ├── validations.ts
│   │   ├── guest-repository.ts
│   │   ├── guest-service.ts
│   │   ├── statistics.ts
│   │   └── errors.ts
│   └── types/
│       └── guest.ts
├── tests/
├── .env.example
├── .gitignore
├── AGENTS.md
├── Dockerfile
├── package.json
└── README.md
```

La carpeta `data/` del repositorio es únicamente una referencia para desarrollo. En producción, el archivo real debe ubicarse en el volumen persistente configurado en Coolify.

## 5. Rutas de navegación

| Ruta | Acceso | Función |
|---|---|---|
| `/` | Público | Página de bienvenida |
| `/invitacion/[token]` | Público | Invitación individual |
| `/admin/login` | Público | Inicio de sesión |
| `/admin/dashboard` | Administrador | Estadísticas |
| `/admin/invitados` | Administrador | Listado de invitados |
| `/admin/invitados/nuevo` | Administrador | Crear invitación |
| `/admin/invitados/[id]` | Administrador | Consultar o editar invitación |

La protección de rutas administrativas debe comprobarse en el servidor. Ocultar enlaces en la interfaz no constituye un control de acceso.

## 6. Endpoints de la API

### 6.1. API pública

| Método | Endpoint | Función |
|---|---|---|
| `GET` | `/api/public/invitaciones/[token]` | Consultar invitación |
| `POST` | `/api/public/invitaciones/[token]/respuesta` | Confirmar o rechazar asistencia |

La respuesta pública debe contener únicamente los datos necesarios para mostrar la invitación, como el nombre visible, el cupo autorizado, el estado y el número de asistentes confirmados.

No debe incluir identificadores internos innecesarios, hashes de tokens, datos de otros invitados ni información administrativa.

#### Contrato implementado

`GET /api/public/invitaciones/[token]` → `200 { "invitation": { name, allowedGuests, confirmedGuests, status } }`

`POST /api/public/invitaciones/[token]/respuesta` con `Content-Type: application/json` y cuerpo `{ "status": "confirmed" | "declined", "confirmedGuests": number }` → `200 { "invitation": {…} }` con la proyección actualizada.

Los errores tienen la forma `{ "error": { "code", "message" } }`, con un `message` en español apto para mostrarse al invitado:

| Código HTTP | Cuándo |
|---|---|
| `400` | Cuerpo inválido, estado `pending`, campos desconocidos, o más asistentes que el cupo (`Tu invitación admite hasta N personas.`) |
| `403` | Falta la cabecera `Origin` o no coincide con el sitio |
| `404` | Token mal formado o inexistente. Ambos casos dan exactamente la misma respuesta |
| `413` / `415` | Cuerpo mayor de 2 KB / `Content-Type` distinto de `application/json` |
| `429` | Límite de uso superado, con `Retry-After` |
| `500` | Fallo de almacenamiento o error inesperado. El mensaje es genérico y aclara que la respuesta no se registró |

Medidas aplicadas:

- **Cupo:** se valida en `guest-service.ts` contra el registro almacenado, dentro de la operación atómica del repositorio. Nunca se usa un valor enviado por el navegador.
- **Respuestas:** llevan `Cache-Control: no-store`, `Referrer-Policy: no-referrer` y `X-Robots-Tag: noindex, nofollow`.
- **CSRF:** `POST` exige `Origin` del propio sitio (la URL de la petición, `X-Forwarded-Host` o `APP_BASE_URL`) y `Content-Type: application/json`.
- **Límites de uso** (en memoria, válidos para una sola instancia): 120 consultas/min y 20 envíos/min por cliente, y 10 envíos/min por invitación. El cliente se identifica por la última entrada de `X-Forwarded-For`, la que añade el proxy.
- **Registros:** solo se registra el tipo de error, nunca tokens, cookies ni contenido de los datos.

#### Página pública

`/invitacion/[token]` se renderiza en el servidor con el servicio (nunca accede al JSON directamente). Con `cacheComponents`, la estructura se prerenderiza y el contenido que depende del token se transmite en cada petición dentro de `<Suspense>`, con `Cache-Control: private, no-store`. Un token inválido muestra «Enlace no disponible» con el mismo mensaje en todos los casos, y un fallo de almacenamiento muestra `error.tsx` en vez de una invitación falsa. La página se marca `noindex` y `referrer: no-referrer`.

**Diseño.** Sigue `docs/DESIGN.md` y el ejemplo de `ideas/invitaci_n_de_matrimonio`: saludo con el nombre del invitado y su pase, portada en arco con la foto de los novios, cuenta regresiva, itinerario, cómo llegar, video y galería (si existen), y la confirmación. La decoración floral usa las imágenes de `public/images/flowers/` (`flora.tsx`): el arco `arch-flowers` abre la página y encierra la foto de los novios (y, en pantallas grandes, sus nombres); cuatro ramos sueltos adornan las esquinas del fondo y los bordes de las secciones, junto con pétalos que caen. Se sirven versiones ligeras con transparencia generadas por `npm run prepare-flowers` (el arco pasa de 4,7 MB a ~0,5 MB y el optimizador de Next.js entrega ~60 KB a un móvil). Son decorativas: `alt` vacío, ocultas a lectores de pantalla y con animaciones desactivadas bajo «reducir movimiento». El color principal es `#d3367b` (tokens `primary`, `primary-strong` y `primary-deep` en `globals.css`). Las fotos y el video se descubren en `public/` (`media.ts`, ver `docs/MEDIA.md`); sin archivos, la página usa el arco con las iniciales. La lectura de esas carpetas no afecta a la regla de persistencia: nunca toca el archivo de invitados.

### 6.2. API administrativa

| Método | Endpoint | Función |
|---|---|---|
| `POST` | `/api/admin/login` | Iniciar sesión |
| `POST` | `/api/admin/logout` | Cerrar sesión |
| `GET` | `/api/admin/invitados` | Listar y buscar |
| `POST` | `/api/admin/invitados` | Crear invitación |
| `GET` | `/api/admin/invitados/[id]` | Consultar invitación |
| `PATCH` | `/api/admin/invitados/[id]` | Actualizar invitación |
| `DELETE` | `/api/admin/invitados/[id]` | Eliminar invitación |
| `POST` | `/api/admin/invitados/[id]/enlace` | Regenerar el enlace (devuelve el nuevo una sola vez) |

Todos los endpoints administrativos deben verificar la sesión y validar las entradas recibidas.

El listado puede aceptar parámetros como `search`, `status`, `page` y `limit`. Para el volumen previsto, la paginación es opcional, pero resulta útil para mantener una API consistente.

### 6.3. Autenticación y panel administrativo

**Credenciales.** `ADMIN_PASSWORD_HASH` contiene un hash Argon2id (`@node-rs/argon2`). Se genera con `npm run hash-password`, que pide la contraseña sin eco y entrega el valor codificado como `base64:…`, porque el hash contiene `$` y los archivos `.env` lo interpretarían como variable. Si el hash falta, no es Argon2id o está truncado, el inicio de sesión falla con un 500 genérico y el motivo se registra (nunca el valor).

**Sesiones.** Se guardan en el servidor (en memoria). La cookie solo lleva un identificador aleatorio de 256 bits firmado con HMAC-SHA256 usando `SESSION_SECRET` (mínimo 32 caracteres). Duran 8 h como máximo y vencen tras 2 h de inactividad. Cerrar sesión la elimina en el servidor, y un reinicio del proceso cierra todas (solo hay un administrador). Cambiar `SESSION_SECRET` también las invalida. Se aceptan hasta 20 a la vez.

**Cookie.** `HttpOnly`, `SameSite=Strict`, `Path=/` y 8 h de duración. En producción es además `Secure` y se llama `__Host-admin_session` (el navegador impide así que otro subdominio la sobrescriba).

**Control de acceso.**

- Todo endpoint administrativo pasa por `withAdmin` (`src/lib/admin-api.ts`), que exige una sesión válida antes de ejecutar cualquier lógica y, en las operaciones que modifican datos, que `Origin` sea el propio sitio. `login` y `logout` son las únicas rutas que no lo usan, y ambas comprueban el origen.
- Una prueba lee el código de `src/app/api/admin/` y falla si aparece una ruta nueva o un manejador sin `withAdmin`.
- Cada página administrativa llama a `requireAdminPage()` antes de leer datos. No se confía en el layout, porque no se vuelve a ejecutar al navegar. Sin sesión, la página no contiene ningún dato y redirige a `/admin/login`.
- Como el contenido se transmite por partes, la redirección de una página sin sesión viaja dentro de la respuesta (código HTTP `200`), no como un `307` previo. La API sí responde `401`.

**Inicio de sesión.** `POST /api/admin/login` con `{ "password" }`. Límite de 10 intentos por cliente y 100 en total cada 15 minutos (`429` con `Retry-After`). Con el límite global, un atacante podría bloquear temporalmente nuevos inicios de sesión; una sesión ya abierta no se ve afectada. Los errores son genéricos (`Contraseña incorrecta.`).

**CSRF.** `SameSite=Strict`, comprobación de `Origin` y `Content-Type: application/json` en todo lo que modifica datos.

**Envío por WhatsApp.** `POST /api/admin/invitados` y `POST /api/admin/invitados/[id]/enlace` devuelven además `whatsappUrl`: un enlace `https://wa.me/<número>?text=<mensaje>` armado en el servidor con el teléfono de la invitación (o `null` si no es utilizable) y el mensaje con el enlace personal. El panel lo ofrece al crear, al regenerar, y desde el dashboard, el listado y el detalle de cada invitado. Como el enlace de una invitación existente no se puede recuperar, enviar desde esas pantallas **genera un enlace nuevo** (el anterior deja de funcionar) y pide confirmación. No se envía nada automáticamente: el administrador abre WhatsApp y decide enviar. El destino es siempre `wa.me` con el número normalizado en dígitos, y el nombre y el enlace van codificados en un único parámetro `text`.

**Enlaces.** Solo se guarda el hash del token, así que el enlace completo se entrega únicamente al crear o regenerar. Se construye con `APP_BASE_URL` (o el dominio de la solicitud si no está definida). Para obtener uno copiable de una invitación existente hay que regenerarlo, lo que invalida el anterior (la interfaz pide confirmación).

**Errores para el administrador.** Pueden indicar los campos inválidos (`issues`) y conflictos (`409`, p. ej. un cupo menor que los asistentes ya confirmados). Los fallos internos siguen siendo genéricos (`SERVER_ERROR`) y no revelan rutas ni el estado del archivo.

**Páginas.** `/admin/login`, `/admin/dashboard` (estadísticas y pendientes), `/admin/invitados` (búsqueda, filtro por estado y paginación por parámetros de la URL, resueltos en el servidor), `/admin/invitados/nuevo` y `/admin/invitados/[id]` (datos, respuesta, edición, regenerar enlace y eliminar). Todas llevan `noindex`.

### 6.4. Sonda de salud

`GET /api/health` responde `200 {"status":"ok"}` si la aplicación puede leer y validar el archivo de datos, y `503 {"status":"error"}` si no. No devuelve datos, rutas ni causas (el motivo queda en los registros) y no modifica nada. La usa el `HEALTHCHECK` del `Dockerfile`: con *rolling update*, Coolify no retira la versión anterior hasta que la nueva pase la sonda, de modo que un despliegue que no pueda usar los datos no reemplaza a uno que sí.

## 7. Flujo de datos

### 7.1. Creación de una invitación

1. El administrador completa el formulario.
2. La interfaz envía una solicitud `POST`.
3. El servidor verifica la sesión.
4. Zod valida los datos recibidos.
5. El servicio de invitados aplica las reglas de negocio.
6. El sistema genera un token criptográficamente seguro.
7. Se calcula y almacena el hash del token.
8. El repositorio guarda el nuevo registro en JSON.
9. La API devuelve los datos administrativos y el enlace generado.
10. La interfaz permite copiar el enlace.

El token original solo debe devolverse al administrador durante la creación o regeneración. No debe persistirse en texto plano.

### 7.2. Respuesta del invitado

1. El invitado abre `/invitacion/[token]`.
2. El servidor recibe el token y calcula su hash.
3. El servicio busca una invitación cuyo `tokenHash` coincida.
4. Si no existe, se muestra una página de enlace inválido o expirado.
5. Si existe, se presenta la información pública autorizada.
6. El invitado selecciona confirmar o rechazar.
7. La API valida la respuesta y el cupo.
8. El servicio actualiza el estado y la fecha de respuesta.
9. El repositorio persiste el cambio.
10. La interfaz muestra el resultado.

La validación definitiva debe ejecutarse en el servidor, incluso si la interfaz ya restringe las opciones disponibles.

### 7.3. Actualización del dashboard

1. El administrador accede al dashboard.
2. El servidor comprueba la sesión.
3. El servicio obtiene los registros actuales.
4. El módulo de estadísticas calcula los totales.
5. La interfaz muestra las cifras actualizadas.

Las estadísticas no deben mantenerse en un archivo separado que pueda desincronizarse de los invitados.

## 8. Responsabilidades de los módulos

### `guest-repository.ts`

- Leer el archivo JSON.
- Validar la estructura persistida.
- Crear, actualizar y eliminar registros.
- Serializar las escrituras.
- Gestionar errores del sistema de archivos.
- Evitar que dos operaciones concurrentes sobrescriban cambios.

No debe contener reglas visuales ni lógica propia de componentes React.

### `guest-service.ts`

- Aplicar reglas de negocio.
- Coordinar el repositorio y las validaciones.
- Crear invitaciones.
- Registrar respuestas.
- Regenerar tokens.
- Verificar cupos y transiciones de estado.

### `token.ts`

- Generar tokens mediante un generador criptográficamente seguro.
- Calcular hashes criptográficos.
- Evitar la exposición de tokens en logs.
- No generar tokens mediante `Math.random()`.

### `auth.ts` y `session.ts`

- Verificar credenciales administrativas.
- Crear y validar sesiones.
- Configurar cookies seguras.
- Invalidar sesiones al cerrar sesión.

### `validations.ts`

- Definir esquemas Zod.
- Validar formularios administrativos.
- Validar respuestas públicas.
- Validar identificadores, estados y cantidades.

### `statistics.ts`

Calcular, como mínimo:

- Total de invitaciones.
- Invitaciones pendientes.
- Invitaciones confirmadas.
- Invitaciones rechazadas.
- Total de asistentes confirmados.
- Total de cupos autorizados.

## 9. Decisiones técnicas

### 9.1. Next.js App Router

Se utilizará App Router para organizar páginas, layouts y endpoints en una única aplicación.

Las operaciones que dependan de Node.js deben ejecutarse con el runtime Node.js.

### 9.2. JSON local

El almacenamiento JSON se acepta para el volumen inicial, siempre que la aplicación funcione en una sola instancia y tenga almacenamiento persistente.

Se configurará:

`DATA_FILE_PATH=/app/data/guests.json`

El archivo no debe estar dentro de `public/`.

### 9.3. Escrituras seguras

Las operaciones de escritura deben seguir una estrategia de lectura, modificación y escritura serializada.

La implementación deberá:

1. Serializar las operaciones de modificación dentro del proceso.
2. Leer el estado actual dentro de la operación serializada.
3. Aplicar la modificación.
4. Escribir el resultado completo en un archivo temporal del mismo volumen.
5. Reemplazar el archivo principal de forma controlada.
6. Propagar los errores sin informar éxito prematuramente.

La escritura temporal y el reemplazo reducen el riesgo de archivos incompletos, pero no proporcionan transacciones completas ni coordinación entre procesos. No deben ejecutarse múltiples instancias que escriban sobre el mismo archivo sin un mecanismo de bloqueo adecuado.

**Solape durante el despliegue.** Coolify actualiza con *rolling update*: el contenedor nuevo arranca mientras el viejo sigue vivo y ambos comparten el volumen. Una prueba con dos instancias del repositorio sobre el mismo archivo mostró que sin coordinación se perdía la mitad de las escrituras. Por eso cada modificación toma además un bloqueo de archivo (`<archivo>.lock`, creación exclusiva) que dura solo lo que tarda la operación y caduca a los 30 s si el proceso muere. Es una salvaguarda del solape y **no** autoriza a ejecutar varias réplicas.

### 9.4. Autenticación

Habrá un único administrador. No se implementará registro público ni recuperación de contraseña automática en la primera versión.

La contraseña se verificará mediante un hash seguro y la sesión se gestionará en el servidor.

### 9.5. Validación

Todas las entradas se validarán en el servidor. La validación en el cliente se utilizará para mejorar la experiencia, no como sustituto de la validación de seguridad.

### 9.6. Migración futura

El servicio de invitados dependerá de una interfaz de repositorio. Esto permitirá sustituir JSON por SQLite o PostgreSQL sin acoplar toda la aplicación a una tecnología de almacenamiento.

## 10. Errores y respuestas HTTP

Se utilizarán códigos HTTP apropiados:

- `200`: consulta o actualización exitosa.
- `201`: recurso creado.
- `400`: entrada inválida.
- `401`: sesión administrativa ausente o inválida.
- `403`: operación no permitida.
- `404`: invitación o recurso no encontrado.
- `409`: conflicto de estado o de datos.
- `429`: demasiadas solicitudes.
- `500`: error interno.

Los mensajes enviados al cliente no deben revelar rutas del servidor, detalles internos del archivo JSON, secretos ni información de otras invitaciones.

## 11. Pruebas

Se deben probar, como mínimo:

- Generación y verificación de tokens.
- Creación y actualización de invitaciones.
- Confirmación y rechazo de asistencia.
- Restricción del número de asistentes.
- Acceso a enlaces inválidos.
- Regeneración e invalidación de tokens.
- Acceso a endpoints administrativos sin sesión.
- Escrituras concurrentes dentro del proceso.
- Recuperación ante errores de lectura o escritura.
- Persistencia después de reiniciar la aplicación.

## 12. Restricciones operativas

- Una sola instancia de Node.js.
- Volumen persistente montado en `/app/data`.
- Copias de seguridad del archivo de datos.
- Secretos definidos mediante variables de entorno.
- Sin almacenamiento de datos reales en Git.
- Sin Edge Runtime para operaciones de archivo.
- Sin réplicas que mantengan archivos JSON independientes.
- Un solo contenedor en producción. Durante un *rolling update* el solape breve está cubierto por el bloqueo de archivo; para evitarlo por completo, usar un nombre de contenedor personalizado en Coolify (ver `docs/DEPLOYMENT.md`).
- Las cabeceras de seguridad (`X-Frame-Options`, `frame-ancestors`, HSTS, etc.) se definen en `next.config.ts`.

Si se requiere escalar horizontalmente, compartir datos entre procesos o disponer de transacciones robustas, debe revisarse esta arquitectura antes de aumentar las instancias.

## 13. Criterio de finalización

La arquitectura se considera implementada cuando:

- Las responsabilidades están separadas.
- Las rutas están protegidas correctamente.
- Las reglas de negocio se aplican en el servidor.
- El repositorio mantiene la persistencia de forma controlada.
- Las respuestas públicas no exponen datos sensibles.
- El archivo sobrevive a los despliegues y reinicios de Coolify.
- Las pruebas críticas pasan.
- La compilación de producción finaliza correctamente.
