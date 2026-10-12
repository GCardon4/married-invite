## Modelo de datos de las invitaciones

**Versión:** 1.0  
**Persistencia:** JSON  
**Entidad principal:** Guest  
**Estados:** `pending`, `confirmed`, `declined`

---

## 1. Objetivo

Definir la estructura de los datos persistidos, los tipos de cada campo, las reglas de validación y las restricciones que deben respetar los servicios y el repositorio.

La primera versión utilizará un archivo JSON local como almacenamiento de las invitaciones.

## 2. Ubicación del archivo

La ruta se configurará mediante una variable de entorno:

`DATA_FILE_PATH=/app/data/guests.json`

En producción, `/app/data` debe corresponder a un volumen persistente de Coolify.

El archivo no debe estar dentro de `public/`, ya que podría quedar expuesto mediante una URL pública.

## 3. Estructura raíz

El archivo tendrá una estructura versionada:

```json
{
  "schemaVersion": 1,
  "guests": []
}
```

### Campos raíz

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `schemaVersion` | number | Sí | Versión del esquema de datos |
| `guests` | array | Sí | Lista de invitaciones |

La versión permitirá identificar cambios futuros en la estructura y ejecutar migraciones controladas cuando sean necesarias.

## 4. Modelo Guest

Cada elemento de `guests` representa una invitación individual.

### Campos

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | string | Sí | Identificador interno único |
| `name` | string | Sí | Nombre visible del invitado o grupo |
| `email` | string o null | No | Correo de contacto |
| `phone` | string o null | No | Teléfono de contacto |
| `allowedGuests` | integer | Sí | Cupo máximo autorizado |
| `confirmedGuests` | integer | Sí | Número de asistentes confirmados |
| `status` | GuestStatus | Sí | Estado de la invitación |
| `tokenHash` | string | Sí | Hash SHA-256 del token público |
| `createdAt` | string | Sí | Fecha de creación en ISO 8601 |
| `updatedAt` | string | Sí | Fecha de actualización en ISO 8601 |
| `respondedAt` | string o null | Sí | Fecha de la última respuesta, si existe |

`allowedGuests` representa el número total de personas autorizadas para esa invitación, incluido el invitado principal.

`confirmedGuests` representa el total de personas que asistirán. No debe interpretarse como un número adicional al invitado principal.

## 5. Estados permitidos

El tipo `GuestStatus` admite únicamente tres valores:

```ts
export type GuestStatus =
  | "pending"
  | "confirmed"
  | "declined";
```

### `pending`

La invitación aún no tiene una respuesta registrada.

Condiciones:

- `confirmedGuests` debe ser `0`.
- `respondedAt` debe ser `null`.

### `confirmed`

El invitado ha confirmado su asistencia.

Condiciones:

- `confirmedGuests` debe ser mayor que `0`.
- `confirmedGuests` no puede superar `allowedGuests`.
- `respondedAt` debe contener una fecha válida.

### `declined`

El invitado ha rechazado la invitación.

Condiciones:

- `confirmedGuests` debe ser `0`.
- `respondedAt` debe contener una fecha válida.

## 6. Ejemplo de archivo JSON

El siguiente ejemplo ilustra la estructura. Los identificadores y hashes son ficticios y no constituyen enlaces funcionales.

```json
{
  "schemaVersion": 1,
  "guests": [
    {
      "id": "guest_01JEXAMPLE0000000000000000",
      "name": "Invitado de ejemplo",
      "email": "invitado@example.com",
      "phone": null,
      "allowedGuests": 2,
      "confirmedGuests": 2,
      "status": "confirmed",
      "tokenHash": "HASH_SHA256_DE_EJEMPLO",
      "createdAt": "2026-10-01T14:30:00.000Z",
      "updatedAt": "2026-10-02T16:00:00.000Z",
      "respondedAt": "2026-10-02T16:00:00.000Z"
    },
    {
      "id": "guest_01JEXAMPLE0000000000000001",
      "name": "Familia de ejemplo",
      "email": null,
      "phone": null,
      "allowedGuests": 4,
      "confirmedGuests": 0,
      "status": "pending",
      "tokenHash": "OTRO_HASH_SHA256_DE_EJEMPLO",
      "createdAt": "2026-10-01T15:00:00.000Z",
      "updatedAt": "2026-10-01T15:00:00.000Z",
      "respondedAt": null
    }
  ]
}
```

Los valores de `tokenHash` anteriores son marcadores ilustrativos. En producción, el campo debe contener el hash real de un token criptográficamente aleatorio.

## 7. Tipos TypeScript

Archivo sugerido: `src/types/guest.ts`

```ts
export type GuestStatus =
  | "pending"
  | "confirmed"
  | "declined";

export interface Guest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;

  allowedGuests: number;
  confirmedGuests: number;
  status: GuestStatus;

  tokenHash: string;

  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
}

export interface GuestDatabase {
  schemaVersion: 1;
  guests: Guest[];
}

export interface PublicInvitation {
  name: string;
  allowedGuests: number;
  confirmedGuests: number;
  status: GuestStatus;
}

export interface GuestResponseInput {
  status: "confirmed" | "declined";
  confirmedGuests: number;
}
```

`PublicInvitation` es una representación pública deliberadamente limitada. Nunca se debe devolver directamente el objeto `Guest` completo a un invitado.

## 8. Reglas de validación

Las reglas se implementan en `src/lib/validations.ts`. Decisiones de implementación que concretan este documento:

- `id`: patrón `^guest_[A-Za-z0-9]{1,64}$`.
- `tokenHash`: SHA-256 en hexadecimal minúsculo (64 caracteres). Los valores de marcador del ejemplo de la sección 6 no superan esta validación.
- Correo y teléfono: se recortan los espacios y una cadena vacía se almacena como `null`. El correo se guarda en minúsculas y admite hasta 254 caracteres. El teléfono admite hasta 30.
- Nombre: máximo 120 caracteres.
- Las entradas administrativas son estrictas: se rechazan campos desconocidos como `status`, `tokenHash`, `id` o fechas, que asigna siempre el servidor.
- Un cupo menor que los asistentes ya confirmados no se detecta en el esquema de entrada, sino en `guest-service.ts`.


### Identificador

- Debe ser único.
- Debe generarse en el servidor.
- No debe depender de un contador secuencial predecible.
- No debe modificarse después de crear el registro.

### Nombre

- Es obligatorio.
- Debe eliminar espacios al inicio y al final.
- No puede quedar vacío.
- Debe tener una longitud máxima definida por el esquema, por ejemplo 120 caracteres.

### Correo electrónico

- Puede ser `null` si no se proporciona.
- Si existe, debe tener formato válido.
- Debe normalizarse eliminando espacios y aplicando una política coherente de comparación.

### Teléfono

- Puede ser `null`.
- Debe almacenarse como `string`, no como número, para conservar prefijos y ceros iniciales.
- Si existe, debe limitarse a una longitud razonable.
- Es texto libre (no se valida el formato al guardar). Solo para el envío por WhatsApp se interpreta así (`src/lib/whatsapp.ts`): con prefijo `+` o `00` se usa tal cual (8 a 15 dígitos); con exactamente 10 dígitos se antepone `WHATSAPP_DEFAULT_COUNTRY_CODE` (57 por defecto); si ya empieza por ese código y tiene 11 a 15 dígitos se acepta; en cualquier otro caso (letras, extensiones, longitudes ambiguas) **no se envía**, para no escribir a un número equivocado. No cambia lo que se almacena.

### Cupos

- `allowedGuests` debe ser un entero mayor o igual que `1`.
- `confirmedGuests` debe ser un entero mayor o igual que `0`.
- `confirmedGuests` no puede superar `allowedGuests`.

### Estado y respuesta

- `status` solo acepta los tres valores definidos.
- Una respuesta pública solo puede establecer `confirmed` o `declined`.
- El invitado no puede enviar el estado `pending` para modificar directamente el registro.
- El servidor debe actualizar `respondedAt` y `updatedAt`.
- Los valores del estado y del número de asistentes deben validarse conjuntamente.

### Fechas

- Deben almacenarse como cadenas ISO 8601.
- Deben representar fechas válidas.
- `createdAt` se asigna al crear el registro.
- `updatedAt` cambia cuando se modifica el registro.
- `respondedAt` es `null` mientras esté pendiente y se actualiza cuando se registra una respuesta.

### Token

- Debe generarse mediante una fuente criptográficamente segura.
- Su hash debe almacenarse en `tokenHash`.
- El token original no debe persistirse.
- Los hashes deben compararse de forma consistente.
- Al regenerar el token, se reemplaza el hash anterior y el enlace previo deja de ser válido.
- El token no debe incluirse en logs ni mensajes de error.

## 9. Validaciones cruzadas

Las siguientes reglas deben aplicarse al registro completo:

```ts
function isValidGuestState(guest: {
  allowedGuests: number;
  confirmedGuests: number;
  status: "pending" | "confirmed" | "declined";
  respondedAt: string | null;
}): boolean {
  if (
    !Number.isInteger(guest.allowedGuests) ||
    guest.allowedGuests < 1
  ) {
    return false;
  }

  if (
    !Number.isInteger(guest.confirmedGuests) ||
    guest.confirmedGuests < 0 ||
    guest.confirmedGuests > guest.allowedGuests
  ) {
    return false;
  }

  if (guest.status === "pending") {
    return (
      guest.confirmedGuests === 0 &&
      guest.respondedAt === null
    );
  }

  if (guest.status === "confirmed") {
    return (
      guest.confirmedGuests > 0 &&
      guest.respondedAt !== null
    );
  }

  if (guest.status === "declined") {
    return (
      guest.confirmedGuests === 0 &&
      guest.respondedAt !== null
    );
  }

  return false;
}
```

Esta función es ilustrativa. En la implementación definitiva se recomienda centralizar las validaciones con Zod y complementar el esquema con pruebas unitarias.

## 10. Esquema de validación con Zod

Ejemplo inicial:

```ts
import { z } from "zod";

export const guestStatusSchema = z.enum([
  "pending",
  "confirmed",
  "declined",
]);

export const guestResponseSchema = z
  .object({
    status: z.enum(["confirmed", "declined"]),
    confirmedGuests: z.number().int().min(0),
  })
  .superRefine((data, ctx) => {
    if (
      data.status === "confirmed" &&
      data.confirmedGuests < 1
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmedGuests"],
        message:
          "Debe confirmarse al menos un asistente.",
      });
    }

    if (
      data.status === "declined" &&
      data.confirmedGuests !== 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmedGuests"],
        message:
          "Una invitación rechazada debe tener cero asistentes confirmados.",
      });
    }
  });
```

El cupo máximo depende de la invitación consultada y, por lo tanto, debe verificarse adicionalmente en el servicio del servidor. No basta con validar el cuerpo HTTP.

## 11. Operaciones permitidas

### Crear invitación

- Generar un identificador.
- Generar un token.
- Calcular el hash del token.
- Inicializar `confirmedGuests` en `0`.
- Inicializar `status` en `pending`.
- Inicializar `respondedAt` en `null`.
- Asignar `createdAt` y `updatedAt`.

### Confirmar asistencia

- Comprobar el token.
- Obtener el cupo autorizado desde el registro almacenado.
- Validar que el número de asistentes sea al menos `1`.
- Verificar que no supere `allowedGuests`.
- Establecer `status` en `confirmed`.
- Establecer `confirmedGuests`.
- Actualizar `respondedAt` y `updatedAt`.

### Rechazar asistencia

- Comprobar el token.
- Establecer `status` en `declined`.
- Establecer `confirmedGuests` en `0`.
- Actualizar `respondedAt` y `updatedAt`.

### Regenerar enlace

- Generar un token nuevo.
- Calcular su hash.
- Reemplazar `tokenHash`.
- Actualizar `updatedAt`.
- Devolver el enlace nuevo al administrador una sola vez.
- Invalidar inmediatamente el enlace anterior.

### Eliminar invitación

- Verificar la sesión administrativa.
- Validar el identificador.
- Solicitar confirmación en la interfaz.
- Eliminar el registro mediante el servicio.
- Persistir el resultado.

## 12. Estadísticas

Las estadísticas se calcularán sobre los registros actuales.

- `totalInvitations`: cantidad total de registros.
- `pendingInvitations`: cantidad con estado `pending`.
- `confirmedInvitations`: cantidad con estado `confirmed`.
- `declinedInvitations`: cantidad con estado `declined`.
- `totalConfirmedGuests`: suma de `confirmedGuests` para registros confirmados.
- `totalAllowedGuests`: suma de `allowedGuests`.

Los cupos autorizados no equivalen a asistentes confirmados. La interfaz debe distinguir claramente ambos valores.

## 13. Integridad y persistencia

El repositorio debe verificar:

- Que el JSON pueda analizarse.
- Que `schemaVersion` sea compatible.
- Que `guests` sea un arreglo.
- Que todos los registros cumplan el esquema.
- Que no existan identificadores duplicados.
- Que no existan hashes de token duplicados.

Ante datos inválidos, el sistema no debe sobrescribir silenciosamente el archivo con un arreglo vacío. Debe informar el error al servidor, conservar el archivo original y permitir la recuperación desde una copia de seguridad.

Las operaciones de escritura deben serializarse dentro del proceso para evitar la pérdida de cambios concurrentes.

### Comportamiento implementado (`guest-repository.ts`)

- **Cola única:** todas las operaciones, incluidas las lecturas, se ejecutan de una en una. Cada operación vuelve a leer y validar el archivo; no hay caché. Un fallo no bloquea las operaciones siguientes.
- **Escritura:** se valida el estado completo con `guestDatabaseSchema`, se escribe un temporal `<archivo>.<uuid>.tmp` en el mismo directorio (permisos `0600`, con `fsync`) y se reemplaza con `rename`. En Windows se reintenta ante `EPERM`, `EBUSY` y `EACCES`. Si algo falla, se elimina el temporal, se conserva el archivo anterior y se propaga `PersistenceError`.
- **Archivo ausente:** se crea `{ "schemaVersion": 1, "guests": [] }` con creación exclusiva (`wx`), que nunca sobrescribe un archivo existente. Si el archivo principal falta pero hay temporales `<archivo>.*.tmp` junto a él, no se inicializa y se informa `DataCorruptionError`, porque pueden indicar datos perdidos que deben revisarse a mano.
- **Archivo existente pero inválido** (vacío, JSON incorrecto, `schemaVersion` distinto de 1, registros que incumplen el esquema, `id` o `tokenHash` duplicados): toda operación falla con `DataCorruptionError` y el archivo no se modifica. La recuperación es manual, desde una copia de seguridad.
- **Errores:** los mensajes al cliente son genéricos. En logs solo se registra el código y el tipo de fallo, nunca contenido, rutas ni tokens.
- **Bloqueo entre procesos:** cada modificación (crear, actualizar, eliminar) toma `<archivo>.lock` con creación exclusiva (`wx`) mientras lee, modifica y escribe. Espera hasta 10 s a que otro proceso lo suelte, y lo considera abandonado si lleva más de 30 s sin cambios (la operación dura milisegundos). Existe para el solape de un *rolling update* de Coolify; no hace válidas las réplicas. Las lecturas no lo necesitan, porque el reemplazo del archivo es atómico. Un `.lock` junto a un archivo ausente no impide la inicialización, a diferencia de un temporal `.tmp`.
- **Alcance:** la cola es local al proceso, por lo que solo es válida con una instancia de Node.js.

## 14. Privacidad

El archivo JSON contiene datos personales y debe tratarse como información privada.

- No debe servirse como archivo estático.
- No debe incluirse en el repositorio Git.
- No debe exponerse a endpoints públicos.
- No debe registrarse su contenido en logs.
- Los respaldos deben protegerse con controles de acceso.
- Los endpoints públicos deben devolver una proyección limitada del registro.

## 15. Evolución del esquema

Si se modifica el modelo de datos:

1. Incrementar `schemaVersion` cuando el cambio requiera una migración.
2. Crear una función de migración explícita.
3. Conservar una copia de seguridad antes de modificar los datos.
4. Validar el resultado después de la migración.
5. Evitar cambios destructivos sin un procedimiento de recuperación.

## 16. Criterios de aceptación

- [ ] El JSON contiene una versión de esquema.
- [ ] Todos los invitados cumplen el modelo definido.
- [ ] Los estados solo admiten los valores permitidos.
- [ ] Las cantidades respetan el cupo autorizado.
- [ ] Las fechas tienen un formato válido.
- [ ] Los tokens originales no se almacenan en el archivo.
- [ ] Los identificadores y hashes son únicos.
- [ ] La API pública no devuelve el objeto completo.
- [ ] Los datos sobreviven a los reinicios y despliegues.
- [ ] Los errores de persistencia no destruyen silenciosamente los datos.

**Fin del documento.**