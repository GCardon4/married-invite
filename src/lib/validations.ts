import { z } from "zod";

import type {
  Guest,
  GuestDatabase,
  GuestResponseInput,
  GuestStatus,
} from "@/types/guest";

// Mensajes de validación por defecto en español (los propios ya lo están).
z.config(z.locales.es());

export const SCHEMA_VERSION = 1;

const NAME_MAX_LENGTH = 120;
const EMAIL_MAX_LENGTH = 254;
const PHONE_MAX_LENGTH = 30;
const SEARCH_MAX_LENGTH = 120;
const LIST_LIMIT_MAX = 200;

// --- Campos reutilizables ---------------------------------------------------

export const guestStatusSchema = z.enum(["pending", "confirmed", "declined"]);

/** Identificador interno generado en el servidor, p. ej. `guest_01J...`. */
export const guestIdSchema = z
  .string()
  .regex(/^guest_[A-Za-z0-9]{1,64}$/, "Identificador inválido.");

const nameSchema = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio.")
  .max(NAME_MAX_LENGTH, `El nombre admite hasta ${NAME_MAX_LENGTH} caracteres.`);

/**
 * Recorta espacios antes de validar. Los formularios envían "" cuando el campo
 * opcional queda vacío: se guarda `null`.
 */
const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const emailSchema = z.preprocess(
  emptyToNull,
  z
    .email("Correo electrónico inválido.")
    .max(EMAIL_MAX_LENGTH)
    .transform((value) => value.toLowerCase())
    .nullable(),
);

const phoneSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .max(PHONE_MAX_LENGTH, `El teléfono admite hasta ${PHONE_MAX_LENGTH} caracteres.`)
    .nullable(),
);

const allowedGuestsSchema = z
  .number()
  .int("El cupo debe ser un número entero.")
  .min(1, "El cupo debe ser al menos 1.");

const confirmedGuestsSchema = z
  .number()
  .int("La cantidad debe ser un número entero.")
  .min(0, "La cantidad no puede ser negativa.");

const isoDateSchema = z.iso.datetime({ message: "Fecha ISO 8601 inválida." });

/** Hash SHA-256 del token público, codificado en hexadecimal (64 caracteres). */
export const tokenHashSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "Hash de token inválido.");

// --- Reglas cruzadas --------------------------------------------------------

interface GuestStateFields {
  allowedGuests: number;
  confirmedGuests: number;
  status: GuestStatus;
  respondedAt: string | null;
}

/** Reglas entre estado, asistentes y fecha de respuesta (DATA_MODEL §5 y §9). */
function checkGuestState(data: GuestStateFields, ctx: z.RefinementCtx) {
  if (data.confirmedGuests > data.allowedGuests) {
    ctx.addIssue({
      code: "custom",
      path: ["confirmedGuests"],
      message: "Los asistentes confirmados no pueden superar el cupo autorizado.",
    });
  }

  if (data.status === "pending") {
    if (data.confirmedGuests !== 0) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmedGuests"],
        message: "Una invitación pendiente debe tener cero asistentes confirmados.",
      });
    }
    if (data.respondedAt !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["respondedAt"],
        message: "Una invitación pendiente no puede tener fecha de respuesta.",
      });
    }
    return;
  }

  if (data.respondedAt === null) {
    ctx.addIssue({
      code: "custom",
      path: ["respondedAt"],
      message: "Una invitación respondida debe tener fecha de respuesta.",
    });
  }

  if (data.status === "confirmed" && data.confirmedGuests < 1) {
    ctx.addIssue({
      code: "custom",
      path: ["confirmedGuests"],
      message: "Debe confirmarse al menos un asistente.",
    });
  }

  if (data.status === "declined" && data.confirmedGuests !== 0) {
    ctx.addIssue({
      code: "custom",
      path: ["confirmedGuests"],
      message: "Una invitación rechazada debe tener cero asistentes confirmados.",
    });
  }
}

// --- Registro persistido ----------------------------------------------------

export const guestSchema = z
  .object({
    id: guestIdSchema,
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    allowedGuests: allowedGuestsSchema,
    confirmedGuests: confirmedGuestsSchema,
    status: guestStatusSchema,
    tokenHash: tokenHashSchema,
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
    respondedAt: isoDateSchema.nullable(),
  })
  .strict()
  .superRefine(checkGuestState);

/** Estructura raíz del archivo JSON, incluida la unicidad de `id` y `tokenHash`. */
export const guestDatabaseSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    guests: z.array(guestSchema),
  })
  .strict()
  .superRefine((data, ctx) => {
    const ids = new Set<string>();
    const hashes = new Set<string>();

    data.guests.forEach((guest, index) => {
      if (ids.has(guest.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["guests", index, "id"],
          message: "Identificador duplicado.",
        });
      }
      if (hashes.has(guest.tokenHash)) {
        ctx.addIssue({
          code: "custom",
          path: ["guests", index, "tokenHash"],
          message: "Hash de token duplicado.",
        });
      }
      ids.add(guest.id);
      hashes.add(guest.tokenHash);
    });
  });

// --- Entradas administrativas -----------------------------------------------

/**
 * Datos que el administrador puede enviar al crear una invitación.
 * `id`, `status`, `tokenHash` y las fechas los asigna siempre el servidor;
 * `.strict()` rechaza cualquier campo adicional.
 */
export const createGuestInputSchema = z
  .object({
    name: nameSchema,
    email: emailSchema.default(null),
    phone: phoneSchema.default(null),
    allowedGuests: allowedGuestsSchema,
  })
  .strict();

/**
 * Actualización parcial. Que el nuevo cupo no quede por debajo de los asistentes
 * ya confirmados depende del registro almacenado y lo verifica `guest-service.ts`.
 */
export const updateGuestInputSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    allowedGuests: allowedGuestsSchema,
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviarse al menos un campo para actualizar.",
  });

/** Parámetros de `GET /api/admin/invitados`. */
export const guestListQuerySchema = z.object({
  search: z.string().trim().max(SEARCH_MAX_LENGTH).optional(),
  status: guestStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(LIST_LIMIT_MAX).default(50),
});

// --- Entradas públicas ------------------------------------------------------

/**
 * Respuesta del invitado. El estado `pending` no es válido aquí. El cupo
 * máximo depende del registro almacenado y se verifica en `guest-service.ts`.
 */
export const guestResponseSchema = z
  .object({
    status: z.enum(["confirmed", "declined"]),
    confirmedGuests: confirmedGuestsSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.status === "confirmed" && data.confirmedGuests < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmedGuests"],
        message: "Debe confirmarse al menos un asistente.",
      });
    }

    if (data.status === "declined" && data.confirmedGuests !== 0) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmedGuests"],
        message: "Una invitación rechazada debe tener cero asistentes confirmados.",
      });
    }
  });

/** Token público tal como llega en la URL (se valida el formato, no su existencia). */
export const publicTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{16,128}$/, "Token inválido.");

// --- Autenticación ----------------------------------------------------------

/** Longitud máxima: evita enviar cuerpos enormes al verificador de contraseñas. */
export const loginInputSchema = z
  .object({
    password: z
      .string({ error: "Ingresa tu contraseña." })
      .min(1, "Ingresa tu contraseña.")
      .max(200, "Contraseña inválida."),
  })
  .strict();

// --- Tipos derivados --------------------------------------------------------

export type CreateGuestInput = z.infer<typeof createGuestInputSchema>;
export type UpdateGuestInput = z.infer<typeof updateGuestInputSchema>;
export type GuestListQuery = z.infer<typeof guestListQuerySchema>;

// Comprobaciones en tiempo de compilación: los esquemas deben producir los tipos de `types/guest.ts`.
type AssertAssignable<T extends Expected, Expected> = T;
export type _GuestMatches = AssertAssignable<z.output<typeof guestSchema>, Guest>;
export type _DatabaseMatches = AssertAssignable<
  z.output<typeof guestDatabaseSchema>,
  GuestDatabase
>;
export type _ResponseMatches = AssertAssignable<
  z.output<typeof guestResponseSchema>,
  GuestResponseInput
>;
