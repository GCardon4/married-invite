/**
 * Errores de aplicación. `message` es siempre seguro para mostrar al cliente:
 * nunca incluye rutas, contenido del JSON, tokens ni detalles internos.
 * El detalle técnico queda en `cause` y solo debe usarse en logs del servidor.
 */
export type AppErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "CONFIGURATION"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "PERSISTENCE"
  | "DATA_CORRUPTION";

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 429 | 500,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(
    message = "Los datos enviados no son válidos.",
    readonly issues: { path: string; message: string }[] = [],
  ) {
    super("VALIDATION", 400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Debes iniciar sesión para continuar.") {
    super("UNAUTHORIZED", 401, message);
  }
}

/** Configuración del servidor ausente o inválida (secretos, hash de contraseña). */
export class ConfigurationError extends AppError {
  constructor(readonly reason: string) {
    super("CONFIGURATION", 500, "El servidor no está configurado correctamente.");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Invitación no encontrada.") {
    super("NOT_FOUND", 404, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Operación no permitida.") {
    super("FORBIDDEN", 403, message);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor() {
    super("PAYLOAD_TOO_LARGE", 413, "La solicitud es demasiado grande.");
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor() {
    super("UNSUPPORTED_MEDIA_TYPE", 415, "Tipo de contenido no admitido.");
  }
}

export class TooManyRequestsError extends AppError {
  constructor(readonly retryAfterSeconds: number) {
    super("RATE_LIMITED", 429, "Demasiadas solicitudes.");
  }
}

export class ConflictError extends AppError {
  constructor(message = "La operación entra en conflicto con el estado actual.") {
    super("CONFLICT", 409, message);
  }
}

/** Fallo de lectura o escritura del almacenamiento. La operación NO se realizó. */
export class PersistenceError extends AppError {
  constructor(cause?: unknown) {
    super("PERSISTENCE", 500, "No se pudo acceder al almacenamiento de datos.", { cause });
  }
}

/** El archivo existe pero no es válido. Se conserva intacto para recuperarlo. */
export class DataCorruptionError extends AppError {
  constructor(
    readonly reason: string,
    cause?: unknown,
  ) {
    super("DATA_CORRUPTION", 500, "Los datos almacenados no son válidos.", { cause });
  }
}

/** Resumen apto para logs: código y tipo de fallo, sin contenido de datos ni rutas. */
export function describeErrorForLog(error: unknown): string {
  if (error instanceof DataCorruptionError) return `${error.code}: ${error.reason}`;
  if (error instanceof ConfigurationError) return `${error.code}: ${error.reason}`;
  if (error instanceof AppError) {
    const cause = error.cause as { code?: unknown } | undefined;
    const sys = typeof cause?.code === "string" ? ` (${cause.code})` : "";
    return `${error.code}${sys}`;
  }
  return "UNEXPECTED";
}
