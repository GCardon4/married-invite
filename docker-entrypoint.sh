#!/bin/sh
# Comprobaciones de arranque y permisos del volumen. Falla pronto y con un mensaje claro:
# en un «rolling update» de Coolify, un contenedor que no arranca NO reemplaza al anterior.
set -eu

fail() { echo "[entrypoint] ERROR: $*" >&2; exit 1; }
warn() { echo "[entrypoint] ADVERTENCIA: $*" >&2; }

# --- Configuración obligatoria (nunca se imprimen los valores) ---------------------------------
hash="${ADMIN_PASSWORD_HASH:-}"
[ -n "$hash" ] || fail "ADMIN_PASSWORD_HASH no está definida. Genérala con «npm run hash-password»."
case "$hash" in
  base64:*|\$argon2id\$*) ;;
  *) fail "ADMIN_PASSWORD_HASH no tiene el formato esperado (base64:... o \$argon2id\$...). Si pegaste el hash sin codificar, el «\$» pudo expandirse: usa el valor base64: que entrega «npm run hash-password»." ;;
esac

secret="${SESSION_SECRET:-}"
[ "${#secret}" -ge 32 ] || fail "SESSION_SECRET debe tener al menos 32 caracteres."

[ -n "${DATA_FILE_PATH:-}" ] || fail "DATA_FILE_PATH no está definida."

case "${APP_BASE_URL:-}" in
  https://*) ;;
  "") warn "APP_BASE_URL no está definida: los enlaces de invitación usarán el dominio de la solicitud." ;;
  *) warn "APP_BASE_URL no empieza por https://. La cookie de sesión es Secure y no funcionará sin HTTPS." ;;
esac

# --- Volumen de datos ----------------------------------------------------------------------------
data_dir="$(dirname "$DATA_FILE_PATH")"
mkdir -p "$data_dir"

if ! mountpoint -q "$data_dir" 2>/dev/null; then
  warn "$data_dir NO es un volumen montado: el archivo vive en el disco efímero del contenedor y se PERDERÁ al redesplegar. Configura Persistent Storage en Coolify (destino $data_dir)."
fi

if [ "$(id -u)" = "0" ]; then
  # Un volumen nuevo suele pertenecer a root. Solo se cambia el dueño; no se borra ni se mueve nada.
  chown -R node:node "$data_dir" 2>/dev/null || warn "No se pudo cambiar el dueño de $data_dir; se comprobará si se puede escribir."

  su-exec node sh -c 'probe="$1/.write-test.$$"; : > "$probe" && rm -f "$probe"' sh "$data_dir" \
    || fail "El usuario de la aplicación no puede escribir en $data_dir. Revisa los permisos del volumen."

  exec su-exec node "$@"
fi

exec "$@"
