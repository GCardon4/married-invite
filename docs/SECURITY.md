## Seguridad de la aplicación de invitaciones digitales

**Versión:** 1.0  
**Framework:** Next.js App Router  
**Autenticación:** Administrador único mediante sesión segura  
**Autorización pública:** Token individual por invitación  
**Persistencia:** Archivo JSON en volumen privado  
**Despliegue:** Coolify sobre VPS  
**Clasificación:** Información administrativa y datos personales

---

## 1. Objetivo

Definir los controles de seguridad necesarios para proteger la aplicación contra accesos no autorizados, exposición de datos personales, manipulación de respuestas, robo de sesiones, abuso de endpoints y pérdida de información.

Este documento es una referencia obligatoria durante el desarrollo, las pruebas y el despliegue.

## 2. Principios de seguridad

La implementación debe cumplir estos principios:

1. Denegar el acceso por defecto cuando no exista autorización válida.
2. Verificar permisos en el servidor en cada operación protegida.
3. No confiar en datos enviados por el navegador.
4. No almacenar contraseñas ni tokens originales en texto plano.
5. Exponer únicamente los datos necesarios para cada operación.
6. Mantener secretos y archivos privados fuera del repositorio y de la carpeta pública.
7. Validar todas las entradas mediante esquemas definidos.
8. Aplicar controles contra solicitudes automatizadas y abuso.
9. Registrar errores operativos sin incluir información sensible.
10. Proteger la integridad y disponibilidad del archivo JSON.

## 3. Actores y permisos

La aplicación contempla dos tipos de actor.

### 3.1. Administrador

Es el único usuario autorizado para gestionar el sistema.

Puede:

- Iniciar y cerrar sesión.
- Consultar todas las invitaciones.
- Crear, editar y eliminar invitaciones.
- Consultar estadísticas.
- Generar y regenerar enlaces.
- Consultar los datos de contacto de los invitados.
- Modificar cupos autorizados.

Todas estas operaciones requieren una sesión administrativa válida.

### 3.2. Invitado

Es un usuario público que dispone de un enlace individual.

Puede:

- Consultar la invitación asociada a su token.
- Consultar su estado de respuesta.
- Confirmar o rechazar la asistencia.
- Indicar el número de asistentes confirmados dentro del cupo autorizado.

No puede:

- Consultar el listado general de invitados.
- Consultar información de otros invitados.
- Acceder al dashboard.
- Modificar el cupo autorizado.
- Cambiar el identificador interno.
- Regenerar su token.
- Consultar el hash del token.
- Acceder a los endpoints administrativos.

El enlace constituye una credencial de acceso limitada a una invitación, no una sesión administrativa.

## 4. Autenticación del administrador

### 4.1. Credenciales

La primera versión utilizará un único administrador configurado mediante variables de entorno.

Variables previstas:

- `ADMIN_PASSWORD_HASH`
- `SESSION_SECRET`

No se permitirá el registro público de administradores.

La contraseña no debe almacenarse en texto plano ni incluirse en el código fuente.

### 4.2. Hash de contraseña

El valor de `ADMIN_PASSWORD_HASH` debe generarse mediante un algoritmo de hash de contraseñas resistente a ataques por diccionario, como Argon2id.

No debe utilizarse SHA-256 directamente para almacenar contraseñas, ya que es demasiado rápido para ese propósito.

La implementación debe verificar la contraseña ingresada contra el hash configurado utilizando una biblioteca mantenida y apropiada para Node.js.

### 4.3. Inicio de sesión

El endpoint `POST /api/admin/login` debe:

1. Validar el formato de las credenciales.
2. Aplicar limitación de intentos.
3. Verificar la contraseña en el servidor.
4. Crear una sesión nueva si la autenticación es válida.
5. Emitir una cookie de sesión segura.
6. Responder sin revelar secretos ni detalles internos.

Los errores de autenticación deben ser genéricos. No deben indicar información que facilite descubrir credenciales o configuración interna.

### 4.4. Cierre de sesión

El endpoint `POST /api/admin/logout` debe invalidar la sesión y eliminar la cookie mediante una respuesta con los mismos atributos relevantes utilizados al crearla.

La interfaz debe eliminar cualquier estado administrativo local al cerrar sesión.

## 5. Gestión de sesiones

### 5.1. Cookie

La cookie de sesión debe utilizar, como mínimo:

- `HttpOnly`: impide su lectura desde JavaScript del navegador.
- `Secure`: obliga a utilizar HTTPS en producción.
- `SameSite=Lax` o una política más restrictiva compatible con los flujos de navegación.
- `Path=/`.
- Una duración limitada.
- Un nombre que no exponga información sensible.

Se recomienda