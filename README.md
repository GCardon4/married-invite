# Invitaciones de Matrimonio

Aplicación web para gestionar invitaciones de matrimonio, confirmar asistencia de invitados y administrar el listado desde un dashboard privado.

## Objetivo

Centralizar la administración de aproximadamente 150–200 invitados, generar enlaces individuales de invitación y registrar las respuestas de asistencia desde cualquier dispositivo.

## Tecnologías

- **Next.js:** framework de la aplicación.
- **TypeScript:** tipado estático.
- **Tailwind CSS:** estilos responsive.
- **Archivo JSON local:** persistencia en el servidor, en un volumen persistente y con una única instancia de Node.js.
- **Zod:** validación de datos.
- **Autenticación:** acceso restringido al dashboard administrativo (administrador único).

## Módulos

### 1. Invitaciones públicas
- Página personalizada del matrimonio.
- Acceso mediante enlace único.
- Confirmación o rechazo de asistencia.
- Registro de acompañantes autorizados y confirmados.
- Consulta del estado de respuesta.

### 2. Dashboard administrativo
- Inicio de sesión.
- CRUD de invitados.
- Búsqueda y filtros.
- Estadísticas de asistencia.
- Exportación de información, si se requiere.

## Reglas de negocio

1. Cada invitación debe tener un token único.
2. El estado inicial será `pending`.
3. Una confirmación válida cambiará el estado a `confirmed`.
4. Un rechazo válido cambiará el estado a `declined`.
5. Los acompañantes confirmados no pueden superar el cupo autorizado.
6. Solo usuarios autorizados pueden acceder al dashboard y modificar invitados.
7. Las operaciones de escritura se realizarán en el servidor.
8. Las confirmaciones deben persistir después de reiniciar o actualizar la aplicación.

## Instalación

Requisitos: Node.js compatible con Next.js 16 y npm.

```bash
npm install
cp .env.example .env   # completar los valores
npm run dev
```

Abrir `http://localhost:3000`.

### Scripts

| Comando | Función |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Comprobación de tipos con `tsc` |
| `npm test` | Pruebas con Vitest |

## Primer uso

1. Instalar y copiar las variables: `npm install` y `cp .env.example .env`.
2. Generar el hash de la contraseña del administrador: `npm run hash-password`. Pega la línea resultante (`ADMIN_PASSWORD_HASH=base64:…`) en `.env`.
3. Definir `SESSION_SECRET` con un valor aleatorio de al menos 32 caracteres, p. ej. `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
4. `npm run dev` y abrir `http://localhost:3000/admin/login`.

Las sesiones viven en memoria: reiniciar el servidor las cierra. Para pruebas en local hace falta `DATA_FILE_PATH` (por defecto `./data/guests.json`, que se crea sola si no existe).

## Fotos y videos

Coloca la foto principal en `public/images/hero.jpg`, las de la galería en `public/images/galeria/` y el video en `public/videos/invitacion.mp4`. Aparecen solos en la invitación; sin archivos, se ve igual con su decoración floral. Nombres, tamaños y recomendaciones en [docs/MEDIA.md](docs/MEDIA.md).

## Estado del proyecto

Fase actual: base del proyecto. Existen la estructura de carpetas, los tipos (`src/types/guest.ts`), los esquemas Zod (`src/lib/validations.ts`), el repositorio JSON (`guest-repository.ts`), el servicio de invitados (`guest-service.ts`) el **flujo público** (`/invitacion/[token]` y `/api/public/invitaciones/...`), la **autenticación del administrador** y el **panel privado** (`/admin/...`: estadísticas, CRUD de invitados, búsqueda, filtros y enlaces), con pruebas. Pendiente: construir y probar la imagen de Docker, y configurar las copias de seguridad (`docs/DEPLOYMENT.md`). Ver `docs/CHANGELOG.md`.

## Variables de entorno

Copiar `.env.example` a `.env` y completar `APP_BASE_URL`, `DATA_FILE_PATH`, `ADMIN_PASSWORD_HASH` y `SESSION_SECRET`. No almacenar contraseñas, secretos de sesión ni datos reales en el repositorio. El archivo de datos (`data/*.json`) está excluido de Git.

## Despliegue

Se despliega en Coolify con el `Dockerfile` de la raíz (build pack «Dockerfile»). Requisitos clave: un **volumen persistente montado en `/app/data`**, **una sola instancia**, HTTPS y las variables `ADMIN_PASSWORD_HASH` y `SESSION_SECRET`. Guía completa, copias de seguridad y solución de problemas en [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). El informe de la última auditoría está en [docs/AUDITORIA.md](docs/AUDITORIA.md).

## Alcance

Aplicación temporal para gestionar invitaciones y respuestas de asistencia. No incluye inicialmente notificaciones automatizadas, múltiples administradores, integración con pasarelas de pago ni una aplicación móvil nativa.