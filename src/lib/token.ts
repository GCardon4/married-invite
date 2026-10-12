import { createHash, randomBytes } from "node:crypto";

/** Token público: 32 bytes aleatorios (256 bits) en base64url, 43 caracteres. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 en hexadecimal minúsculo. Es lo único que se persiste del token. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
