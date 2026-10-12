# Invitaciones de Matrimonio

Aplicación web para gestionar invitaciones de matrimonio, confirmar asistencia de invitados y administrar el listado desde un dashboard privado.

## Objetivo

Centralizar la administración de aproximadamente 150–200 invitados, generar enlaces individuales de invitación y registrar las respuestas de asistencia desde cualquier dispositivo.

## Tecnologías

- **Next.js:** framework de la aplicación.
- **TypeScript:** tipado estático.
- **Tailwind CSS:** estilos responsive.
- **Prisma + SQLite:** persistencia local en el servidor.
- **Zod:** validación de datos.
- **Autenticación:** acceso restringido al dashboard administrativo.

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

Requisitos: Node.js compatible con la versión de Next.js seleccionada y npm.

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Abrir `http://localhost:3000`.

Los comandos de base de datos se ajustarán según la configuración inicial de Prisma y SQLite.

## Variables de entorno

Configurar las variables necesarias en `.env` a partir de `.env.example`. No almacenar contraseñas, secretos de sesión ni credenciales privadas en el repositorio.

## Despliegue

La aplicación podrá desplegarse en Coolify mediante GitHub. Si se utiliza SQLite, se debe configurar almacenamiento persistente para la base de datos y realizar copias de seguridad antes de actualizaciones importantes.

## Alcance

Aplicación temporal para gestionar invitaciones y respuestas de asistencia. No incluye inicialmente notificaciones automatizadas, múltiples administradores, integración con pasarelas de pago ni una aplicación móvil nativa.