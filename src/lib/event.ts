/** Datos del evento mostrados en la invitación (docs/ABOUT.md). */
export const EVENT = {
  partner1: "Katheryn",
  partner2: "Edwin",
  monogram: "K & E",
  dateLabel: "Viernes 8 de enero de 2027",
  timeZoneLabel: "Hora de Colombia (Bogotá)",
  /** Inicio de la eucaristía, en hora de Bogotá (UTC−5, sin horario de verano). */
  startsAtIso: "2027-01-08T15:00:00-05:00",
  ceremony: {
    title: "Eucaristía",
    time: "3:00 p.m.",
    place: "Iglesia San Antonio",
    detail: "Parque Principal",
  },
  reception: {
    title: "Recepción",
    time: "5:30 p.m.",
    place: "Ángeles Eventos",
    detail: "Celebración y brindis",
  },
  mapUrl: "https://maps.app.goo.gl/8ysC2pN8d8nqYGUT6?g_st=aw",
  /**
   * Opcional: si se completa, aparece la sección «Código de vestimenta».
   * No está definido en docs/ABOUT.md, así que no se inventa.
   */
  dressCode: null as string | null,
} as const;

/**
 * Enlace de WhatsApp para consultas, o `null` si no hay número configurado.
 * Solo acepta un número internacional en dígitos (8 a 15), para no construir enlaces a partir
 * de un valor mal configurado.
 */
export function buildWhatsAppUrl(number: string | undefined, guestName: string): string | null {
  const digits = (number ?? "").replace(/[\s+()-]/g, "");
  if (!/^\d{8,15}$/.test(digits)) return null;

  const text = `Hola, soy ${guestName}. Tengo una consulta sobre la invitación de la boda de ${EVENT.partner1} y ${EVENT.partner2}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
