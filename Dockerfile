# syntax=docker/dockerfile:1
#
# Imagen para Coolify (build pack «Dockerfile»). Ver docs/DEPLOYMENT.md.
#
# - Una sola instancia: el almacenamiento es un archivo JSON (AGENTS.md).
# - Los datos viven en /app/data, que DEBE montarse como volumen persistente.
# - No se declara ningún ARG ni ENV con secretos: ADMIN_PASSWORD_HASH y SESSION_SECRET
#   se reciben solo en tiempo de ejecución y nunca quedan en una capa de la imagen.

ARG NODE_VERSION=24

# --- Dependencias (incluye las de desarrollo: el build necesita TypeScript y Tailwind) ---
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# `--include=dev` evita que un NODE_ENV=production heredado de la plataforma omita las de desarrollo.
RUN npm ci --include=dev

# --- Compilación ---
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Ejecución ---
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app

# tini: PID 1 correcto (reenvía señales y recoge procesos). su-exec: el entrypoint ajusta los
# permisos del volumen como root y luego ejecuta la aplicación sin privilegios.
RUN apk add --no-cache tini su-exec

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_FILE_PATH=/app/data/guests.json

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# `sed` quita CR por si el archivo se editó en Windows: con CRLF el shebang fallaría.
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
 && chmod +x /usr/local/bin/docker-entrypoint.sh \
 && mkdir -p /app/data \
 && chown node:node /app/data

EXPOSE 3000

# Responde 200 solo si la aplicación arranca Y puede leer el archivo de datos. Con «rolling update»
# Coolify no retira la versión anterior hasta que esta sonda pase. Usa node porque es lo único
# garantizado en esta etapa (no hay curl ni wget en el contrato de la imagen).
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
