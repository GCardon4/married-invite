import { verify } from "@node-rs/argon2";

import { ConfigurationError } from "@/lib/errors";

const BASE64_PREFIX = "base64:";

/**
 * `ADMIN_PASSWORD_HASH` es un hash Argon2id en formato PHC. Como contiene `$`, que los
 * archivos `.env` interpretan como variable, también se acepta codificado como
 * `base64:<hash en base64>` (lo genera `npm run hash-password`).
 */
function loadPasswordHash(): string {
  const raw = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!raw) throw new ConfigurationError("ADMIN_PASSWORD_HASH-not-set");

  const hash = raw.startsWith(BASE64_PREFIX)
    ? Buffer.from(raw.slice(BASE64_PREFIX.length), "base64").toString("utf8")
    : raw;

  if (!hash.startsWith("$argon2id$")) throw new ConfigurationError("ADMIN_PASSWORD_HASH-not-argon2id");
  return hash;
}

/** Compara la contraseña con el hash configurado. Nunca registra ni devuelve la contraseña. */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const hash = loadPasswordHash();
  try {
    return await verify(hash, password);
  } catch {
    // Hash corrupto o truncado: es un problema de configuración, no una contraseña errónea.
    throw new ConfigurationError("ADMIN_PASSWORD_HASH-invalid");
  }
}
