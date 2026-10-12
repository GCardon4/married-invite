/**
 * Textos que ve el invitado. Sin dependencias de servidor: se usan también
 * desde componentes de cliente.
 */
export const PUBLIC_MESSAGES = {
  invalidLink:
    "Este enlace de invitación no es válido o ya no está activo. Si crees que es un error, comunícate con los novios para recibir uno nuevo.",
  invalidRequest: "No pudimos procesar tu respuesta. Revisa los datos e inténtalo de nuevo.",
  forbidden: "No pudimos procesar tu solicitud. Recarga la página e inténtalo de nuevo.",
  tooManyRequests: "Hiciste demasiados intentos seguidos. Espera un momento e inténtalo de nuevo.",
  server:
    "Tuvimos un problema para procesar tu solicitud. Si estabas enviando tu respuesta, no se registró. Inténtalo de nuevo en unos minutos.",
  network:
    "No pudimos conectarnos. Tu respuesta no se registró: revisa tu conexión e inténtalo de nuevo.",
} as const;
