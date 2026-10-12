import { EVENT } from "@/lib/event";

const FALLBACK_COUNTRY_CODE = "57"; // Colombia: el evento es en hora de Bogotá (docs/ABOUT.md)

/** Código de país que se antepone a los números de 10 dígitos sin prefijo (`WHATSAPP_DEFAULT_COUNTRY_CODE`). */
export function defaultCountryCode(value: string | undefined = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE): string {
  const code = (value ?? "").trim().replace(/^\+/, "");
  return /^[1-9]\d{0,2}$/.test(code) ? code : FALLBACK_COUNTRY_CODE;
}

const validInternational = (digits: string) => /^[1-9]\d{7,14}$/.test(digits);

/**
 * Convierte el teléfono guardado en el número internacional que pide WhatsApp (solo dígitos, con
 * código de país), o `null` si no se puede determinar con seguridad. No adivina: es mejor no
 * enviar que enviar a un número equivocado.
 *
 *   «+57 300 123 4567» → 573001234567     (prefijo explícito)
 *   «0057 300 123 4567» → 573001234567
 *   «300 123 4567»      → 573001234567     (10 dígitos: se añade el código por defecto)
 *   «573001234567»      → 573001234567     (ya empieza por el código por defecto)
 *   «300123», «abc», «3001234567 ext 5», «+0…» → null
 */
export function normalizeWhatsAppNumber(
  phone: string | null | undefined,
  countryCode: string = defaultCountryCode(),
): string | null {
  const raw = (phone ?? "").trim();
  // Solo dígitos y separadores habituales: letras o extensiones hacen el número ambiguo.
  if (!raw || !/^\+?[\d\s().-]+$/.test(raw)) return null;

  const digits = raw.replace(/\D/g, "");

  if (raw.startsWith("+")) return validInternational(digits) ? digits : null;
  if (digits.startsWith("00")) return validInternational(digits.slice(2)) ? digits.slice(2) : null;
  if (digits.length === 10) return validInternational(`${countryCode}${digits}`) ? `${countryCode}${digits}` : null;
  if (digits.length >= 11 && digits.startsWith(countryCode) && validInternational(digits)) return digits;
  return null;
}

/** Número que se mostrará al administrador antes de enviar (`+573001234567`), o `null` si no es utilizable. */
export function whatsAppDisplayNumber(phone: string | null | undefined, countryCode?: string): string | null {
  const number = normalizeWhatsAppNumber(phone, countryCode);
  return number ? `+${number}` : null;
}

/** Mensaje que recibe el invitado. Incluye su enlace personal. */
export function buildInvitationMessage(guestName: string, link: string): string {
  return [
    `¡Hola, ${guestName}! 💐`,
    "",
    `Con mucha alegría te invitamos a la boda de ${EVENT.partner1} y ${EVENT.partner2}, el ${EVENT.dateLabel.toLowerCase()}.`,
    "",
    "Esta es tu invitación personal, con toda la información y para confirmar tu asistencia:",
    link,
  ].join("\n");
}

/**
 * Enlace `wa.me` que abre WhatsApp con el mensaje listo para enviar al invitado, o `null` si su
 * teléfono no es utilizable. El enlace de la invitación solo se conoce al crearla o regenerarla.
 */
export function buildInvitationWhatsAppUrl(
  guest: { name: string; phone: string | null },
  link: string,
  countryCode?: string,
): string | null {
  const number = normalizeWhatsAppNumber(guest.phone, countryCode);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(buildInvitationMessage(guest.name, link))}`;
}
