## Sistema de invitaciones digitales para boda

**Versión:** 1.0  
**Estado:** Definición inicial del proyecto  
**Stack:** Next.js + TypeScript  
**Despliegue:** Coolify sobre VPS  
**Persistencia:** Archivo JSON local  
**Usuarios:** Un administrador y aproximadamente 150–200 invitados

---

## 1. Objetivo del proyecto

Desarrollar una aplicación web para administrar invitaciones digitales de boda, permitiendo crear invitados, generar enlaces individuales, compartirlos y consultar las respuestas de asistencia desde un panel administrativo.

Cada invitado tendrá un enlace único para acceder a su invitación y confirmar o rechazar su asistencia.

La aplicación debe ser sencilla de administrar, adaptable a dispositivos móviles y segura frente al acceso no autorizado a la información de otros invitados.

## 2. Alcance funcional

### 2.1. Invitación pública

La aplicación debe permitir:

- Mostrar una página de bienvenida a la boda.
- Presentar los nombres de los novios, fecha, hora, lugar y demás información definida para el evento.
- Acceder a una invitación individual mediante un enlace con token único.
- Mostrar únicamente la información correspondiente a esa invitación.
- Permitir confirmar o rechazar la asistencia.
- Permitir indicar la cantidad de asistentes confirmados dentro del cupo autorizado.
- Mostrar un mensaje de confirmación después de guardar la respuesta.
- Permitir consultar el estado actual de la respuesta mediante el mismo enlace.

La invitación debe ser responsive y funcionar en navegadores modernos de escritorio, tabletas y teléfonos móviles.

### 2.2. Panel administrativo

Debe existir un panel privado para un único administrador.

El administrador podrá:

- Iniciar y cerrar sesión.
- Consultar el total de invitaciones registradas.
- Consultar cuántas están pendientes, confirmadas y rechazadas.
- Crear nuevas invitaciones.
- Consultar el listado de invitados.
- Buscar invitados por nombre o datos de contacto.
- Editar la información de un invitado.
- Definir el número máximo de asistentes autorizados por invitación.
- Consultar la respuesta y el número de asistentes confirmados.
- Generar y copiar el enlace individual de cada invitación.
- Regenerar el enlace cuando sea necesario.
- Eliminar invitaciones mediante una acción de confirmación.
- Identificar rápidamente las invitaciones pendientes de respuesta.

La información debe actualizarse desde el servidor, sin depender del almacenamiento local del navegador como fuente de datos.

### 2.3. Gestión de invitados

Cada invitación debe contar con un identificador interno y un token público único.

Los campos mínimos serán:

| Campo | Descripción |
|---|---|
| `id` | Identificador interno único |
| `name` | Nombre del invitado o grupo familiar |
| `email` | Correo electrónico, opcional |
| `phone` | Teléfono de contacto, opcional |
| `allowedGuests` | Número máximo de asistentes autorizados |
| `confirmedGuests` | Número de asistentes confirmados |
| `status` | Estado de la invitación |
| `tokenHash` | Hash del token de acceso |
| `createdAt` | Fecha de creación |
| `updatedAt` | Fecha de última actualización |
| `respondedAt` | Fecha de respuesta, o `null` |

Los nombres y los datos de contacto no deben exponerse a otros invitados.

## 3. Reglas de negocio

1. Cada invitación tendrá un enlace individual con un token único, generado mediante un generador criptográficamente seguro.
2. El token original no debe guardarse en texto plano en el archivo JSON. Se almacenará su hash.
3. El enlace completo se mostrará al administrador cuando se cree o regenere el token.
4. Si se regenera un token, el enlace anterior dejará de funcionar.
5. El estado de una invitación será uno de estos valores:
   - `pending`: pendiente de respuesta.
   - `confirmed`: asistencia confirmada.
   - `declined`: asistencia rechazada.
6. Una invitación pendiente no tendrá una respuesta registrada.
7. Una invitación confirmada tendrá al menos un asistente confirmado.
8. Una invitación rechazada tendrá `confirmedGuests = 0`.
9. El número de asistentes confirmados no podrá superar `allowedGuests`.
10. El servidor validará todas las respuestas; no confiará en valores enviados únicamente desde el cliente.
11. Un invitado solo podrá consultar y modificar la respuesta asociada a su propio token.
12. Los cambios administrativos deberán requerir una sesión válida.
13. La eliminación de una invitación deberá solicitar confirmación en la interfaz.
14. Las fechas se almacenarán en formato ISO 8601.
15. Las estadísticas se calcularán a partir de los datos persistidos y no de contadores independientes susceptibles de quedar desactualizados.

## 4. Requisitos técnicos

### 4.1. Tecnologías

- Next.js con App Router.
- TypeScript.
- React.
- Tailwind CSS para estilos.
- Zod para validar entradas y datos.
- API Route Handlers de Next.js.
- `node:fs/promises` para leer y escribir el archivo JSON.
- Una solución de sesión segura basada en cookies, por ejemplo `jose` o `iron-session`.
- Vitest para pruebas unitarias, cuando se incorpore la configuración de pruebas.

Se utilizará el runtime de Node.js para las rutas que accedan al sistema de archivos. No se utilizará Edge Runtime para estas operaciones.

### 4.2. Persistencia

La información se almacenará en un archivo JSON ubicado fuera de la carpeta pública.

Ruta configurable:

`DATA_FILE_PATH=/app/data/guests.json`

Requisitos:

- Crear el archivo con una estructura inicial válida cuando no exista.
- Validar la estructura al leer los datos.
- Gestionar errores de lectura y escritura.
- Evitar escrituras simultáneas que puedan sobrescribir cambios.
- Serializar las operaciones de lectura, modificación y escritura dentro del proceso.
- Escribir primero en un archivo temporal y reemplazar el archivo principal de forma controlada.
- Mantener copias de seguridad periódicas.
- No incluir datos reales de invitados en el repositorio Git.

**Limitación importante:** esta solución está prevista para una sola instancia de Node.js con almacenamiento persistente. No debe escalarse a múltiples réplicas con archivos JSON independientes. Si se requieren múltiples instancias, transacciones más robustas o alta concurrencia, deberá evaluarse una base de datos como SQLite con almacenamiento compartido adecuado o PostgreSQL.

### 4.3. API

La aplicación utilizará endpoints separados para invitados y administrador.

**Endpoints públicos**

- `GET /api/public/invitaciones/[token]`: obtener los datos mínimos de la invitación.
- `POST /api/public/invitaciones/[token]/respuesta`: registrar o actualizar la respuesta.

**Endpoints administrativos**

- `POST /api/admin/login`: iniciar sesión.
- `POST /api/admin/logout`: cerrar sesión.
- `GET /api/admin/invitados`: listar y buscar invitados.
- `POST /api/admin/invitados`: crear una invitación.
- `GET /api/admin/invitados/[id]`: consultar una invitación.
- `PATCH /api/admin/invitados/[id]`: actualizar una invitación.
- `DELETE /api/admin/invitados/[id]`: eliminar una invitación.

Todos los endpoints administrativos deben verificar la sesión en el servidor. La API pública no debe permitir listar invitados ni acceder a información de otras invitaciones.

## 5. Seguridad

La aplicación deberá cumplir estos requisitos:

- Contraseña administrativa almacenada como hash seguro.
- Secreto de sesión generado aleatoriamente y mantenido fuera del repositorio.
- Cookies de sesión con `HttpOnly`, `Secure` en producción y una política `SameSite` apropiada.
- Validación de datos de entrada mediante esquemas.
- Protección frente a intentos repetidos de inicio de sesión.
- Protección CSRF cuando corresponda al mecanismo de autenticación y a las operaciones de escritura.
- Control de acceso en el servidor, no solamente en componentes visuales.
- Respuestas públicas con los datos estrictamente necesarios.
- Mensajes de error que no revelen rutas internas, tokens, secretos ni detalles de implementación.
- Exclusión del archivo JSON, archivos temporales, respaldos y secretos de Git.
- Regeneración de enlaces con invalidación inmediata del token anterior.

Variables de entorno previstas:

- `APP_BASE_URL`
- `DATA_FILE_PATH`
- `ADMIN_PASSWORD_HASH`
- `SESSION_SECRET`

No se deben almacenar contraseñas administrativas en texto plano ni utilizar valores de ejemplo en producción.

## 6. Despliegue en Coolify

El proyecto debe poder desplegarse desde un repositorio GitHub en Coolify.

Requisitos de despliegue:

1. Configurar la construcción y ejecución de Next.js en modo producción.
2. Utilizar Node.js compatible con la versión de Next.js instalada.
3. Definir las variables de entorno necesarias.
4. Crear un volumen persistente en Coolify y montarlo en `/app/data`.
5. Configurar `DATA_FILE_PATH=/app/data/guests.json`.
6. Mantener una sola instancia de la aplicación.
7. Configurar el dominio y HTTPS.
8. Verificar que el archivo JSON permanezca disponible después de reiniciar o volver a desplegar el contenedor.
9. Configurar copias de seguridad del archivo de datos.
10. Probar los flujos públicos y administrativos después del despliegue.

No se debe depender del sistema de archivos efímero del contenedor para conservar las respuestas.

## 7. Interfaz y experiencia de usuario

### Invitación pública

- Diseño visual acorde con la identidad de la boda.
- Presentación clara de fecha, ubicación y datos del evento.
- Botones visibles para confirmar o rechazar asistencia.
- Formulario simple para registrar el número de asistentes.
- Estados de carga, éxito y error.
- Diseño responsive y accesible.

### Panel administrativo

- Diseño claro y funcional.
- Resumen estadístico de invitaciones.
- Tabla o listado de invitados.
- Búsqueda y filtros por estado.
- Formularios de creación y edición con validación.
- Acción para copiar el enlace.
- Confirmación antes de eliminar o regenerar enlaces.
- Indicadores de errores y resultados de las operaciones.

## 8. Requisitos no funcionales

- Código tipado y organizado por responsabilidades.
- Separación entre interfaz, validación, lógica de negocio y persistencia.
- Componentes reutilizables.
- Manejo consistente de errores.
- Validación tanto en el cliente como en el servidor.
- Compatibilidad con navegadores modernos.
- Pruebas de las reglas de negocio y de los endpoints críticos.
- Documentación de instalación, variables de entorno y despliegue.
- Ausencia de dependencias innecesarias para esta primera versión.

## 9. Criterios de aceptación

El proyecto se considerará funcional cuando:

- [ ] El administrador pueda iniciar y cerrar sesión de forma segura.
- [ ] El administrador pueda crear, consultar, editar y eliminar invitaciones.
- [ ] Cada invitación genere un enlace individual.
- [ ] Los enlaces funcionen después de reiniciar y redesplegar la aplicación.
- [ ] Un invitado pueda confirmar o rechazar su asistencia.
- [ ] El sistema impida confirmar más asistentes de los autorizados.
- [ ] El invitado no pueda acceder a datos de otras invitaciones.
- [ ] El panel muestre estadísticas coherentes con los registros.
- [ ] Los usuarios no autenticados no puedan acceder a la API administrativa.
- [ ] El almacenamiento sobreviva al reinicio del contenedor.
- [ ] Los errores de validación se presenten de forma comprensible.
- [ ] El proyecto supere las verificaciones de lint, pruebas disponibles y compilación de producción.

## 10. Fuera del alcance inicial

No forman parte de la primera versión:

- Envío automático de invitaciones por WhatsApp o correo.
- Integraciones con servicios externos de mensajería.
- Registro de múltiples administradores.
- Roles y permisos avanzados.
- Base de datos externa.
- Sincronización entre múltiples instancias.
- Gestión de pagos, regalos o mesas.
- Aplicación móvil nativa.

Estas funciones podrán incorporarse posteriormente si el proyecto lo requiere.

## 11. Decisión de arquitectura

Se utilizará almacenamiento JSON local como solución inicial debido al volumen reducido de invitados y a la existencia de un único administrador.

Esta decisión queda condicionada a disponer de un volumen persistente, respaldos y una sola instancia de Node.js. El repositorio de datos deberá implementarse detrás de una interfaz para facilitar una futura migración a una base de datos sin reescribir la lógica de negocio.

**Fin del documento.**