## Despliegue en Coolify

**Versión:** 1.0
**Build pack:** Dockerfile
**Estado de verificación:** la imagen **no se ha construido ni ejecutado todavía** (ver §9). Todo lo demás de este documento se comprobó con el servidor `standalone`, pruebas automáticas y el entrypoint.

---

## 1. Resumen

La aplicación es una única instancia de Next.js (Node.js 24) que guarda los invitados en un archivo JSON. Eso impone tres reglas de despliegue:

1. **`/app/data` debe ser un volumen persistente.** Sin él, el archivo vive en el disco efímero del contenedor y se pierde en cada despliegue.
2. **Una sola instancia.** No habilites réplicas, escalado ni varios servidores.
3. **Haz copias de seguridad** del archivo (§6). La aplicación no las hace sola.

## 2. Variables de entorno

Se definen en Coolify (Environment Variables) y se reciben **solo en tiempo de ejecución**. El Dockerfile no declara ningún `ARG` ni `ENV` con secretos, así que no quedan en la imagen.

| Variable | Obligatoria | Valor |
|---|---|---|
| `ADMIN_PASSWORD_HASH` | Sí | Salida de `npm run hash-password` (`base64:…`) |
| `SESSION_SECRET` | Sí | Al menos 32 caracteres aleatorios |
| `APP_BASE_URL` | Recomendada | `https://tu-dominio` (HTTPS) |
| `DATA_FILE_PATH` | No | Ya es `/app/data/guests.json` en la imagen |
| `WHATSAPP_NUMBER` | No | Número con código de país y solo dígitos (p. ej. `573001234567`). Activa el botón de WhatsApp |

Genera los valores en tu equipo, no en el servidor:

```bash
npm run hash-password        # pide la contraseña sin eco
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Usa el valor `base64:…` del hash. Si pegas el hash `$argon2id$…` sin codificar, algunas herramientas expanden el `$` y lo dañan. El contenedor lo detecta y no arranca.

No marques estas variables como «Build Variable». No hace falta, y mantenerlas solo en ejecución evita que se escriban en capas de la imagen.

## 3. Configuración en Coolify

1. **Nueva aplicación** desde el repositorio de GitHub, con build pack **Dockerfile** (el `Dockerfile` está en la raíz).
2. **Ports Exposes:** `3000`.
3. **Persistent Storage:** añade un volumen con **destino `/app/data`**. Es lo más importante de esta lista.
4. **Dominio** con HTTPS (Let's Encrypt de Coolify). Sin HTTPS no se puede iniciar sesión: la cookie de sesión es `Secure`.
5. **Variables de entorno** de §2.
6. **Réplicas:** déjalo en una. No actives escalado.
7. **Health check:** no hace falta configurar nada en Coolify. El `HEALTHCHECK` del Dockerfile tiene prioridad sobre el de la interfaz ([documentación de Coolify](https://coolify.io/docs/applications/configuration/health-checks)).

### Actualizaciones y solape de contenedores

Coolify hace **rolling updates**: arranca el contenedor nuevo mientras el viejo sigue vivo, espera a que el nuevo pase el health check y entonces retira el viejo ([documentación](https://coolify.io/docs/applications/deployments/rolling-updates)). Durante esos segundos **dos procesos comparten el mismo `guests.json`**.

La aplicación lo tolera: cada modificación toma un bloqueo de archivo entre procesos (`guests.json.lock`), y hay pruebas que lo demuestran. Aun así, si quieres cero solape, define un **nombre de contenedor personalizado** en la aplicación. Coolify pasa entonces a detener el contenedor viejo antes de arrancar el nuevo, con unos segundos de caída. Las dos opciones son seguras; esta evita cualquier posibilidad de solape.

El `HEALTHCHECK` pasa solo si la aplicación arranca **y** puede leer un archivo de datos válido. Si un despliegue no puede usar los datos (volumen sin montar, permisos, archivo corrupto), la versión anterior se conserva.

### Fotos y videos

Los archivos de `public/` (fotos y video de los novios, ver `docs/MEDIA.md`) se incluyen **dentro de la imagen** al construirla, no en el volumen de datos. Para publicar fotos nuevas hay que volver a desplegar. Cada archivo pesado engorda el repositorio y la imagen: comprímelos antes.

## 4. Qué comprueba el contenedor al arrancar

`docker-entrypoint.sh` falla de inmediato, con un mensaje claro y sin imprimir valores, si:

- falta `ADMIN_PASSWORD_HASH` o no empieza por `base64:` o `$argon2id$`;
- `SESSION_SECRET` tiene menos de 32 caracteres;
- el usuario de la aplicación no puede escribir en el directorio de datos.

Además **advierte** (sin fallar) si `/app/data` no es un volumen montado o si `APP_BASE_URL` no usa HTTPS. Busca `ADVERTENCIA` en los registros del primer despliegue.

El contenedor cambia el dueño del directorio de datos al usuario `node` (un volumen nuevo suele ser de `root`) y luego ejecuta la aplicación **sin privilegios**. No borra ni mueve archivos.

## 5. Primer despliegue y verificación

1. Despliega y revisa los registros: no debe haber `ERROR` ni `ADVERTENCIA`.
2. Abre `https://tu-dominio/api/health`: debe responder `{"status":"ok"}`.
3. Entra en `/admin/login` y crea una invitación de prueba.
4. Abre el enlace en una ventana privada y confirma asistencia.
5. **Prueba de persistencia:** redespliega o reinicia el contenedor. La invitación y su respuesta deben seguir ahí.
6. Elimina la invitación de prueba.

Si el paso 5 falla, el volumen no está montado en `/app/data`.

## 6. Copias de seguridad

El volumen es un único disco en un único servidor: si se pierde, se pierden las respuestas. Haz copias **fuera del VPS**.

Una tarea programada de Coolify (Scheduled Tasks) con el comando de abajo guarda una copia diaria y conserva las 30 últimas:

```sh
sh -c 'mkdir -p /app/data/backups && cp /app/data/guests.json "/app/data/backups/guests-$(date +%Y%m%d-%H%M).json" && ls -1t /app/data/backups | tail -n +31 | while read f; do rm -f "/app/data/backups/$f"; done'
```

Esto protege contra errores o corrupción, no contra la pérdida del disco: descarga también `/app/data/backups` de forma periódica a otro lugar (otro servidor, almacenamiento en la nube o tu equipo). Las copias contienen datos personales: protégelas igual que el archivo original.

### Restaurar

1. Detén la aplicación en Coolify.
2. Copia la copia elegida sobre `/app/data/guests.json`.
3. Inicia la aplicación y revisa `/api/health` y el panel.

**Prueba la restauración una vez antes de necesitarla.**

## 7. Si algo falla

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El contenedor no arranca y dice `ERROR` | Variables faltantes o inválidas | Corregir en Coolify (§2) |
| `/api/health` devuelve 503 | Archivo de datos ilegible o corrupto, o permisos | Ver los registros: `DATA_CORRUPTION` o `PERSISTENCE` y el motivo. **No borres el archivo**: restáuralo desde una copia (§6) |
| No se puede iniciar sesión | Sitio servido sin HTTPS, o contraseña/hash distintos | Usar HTTPS; regenerar el hash |
| Te pide iniciar sesión tras cada despliegue | Las sesiones están en memoria | Es lo esperado; vuelve a entrar |
| Los invitados reciben «demasiados intentos» | Los límites cuentan por IP (`X-Forwarded-For`); si un proxy o CDN oculta la IP real, todos comparten un solo contador | Revisar la cadena de proxies; no exponer el contenedor directamente |
| Registros con `stale-file-lock-removed` | Un proceso murió a mitad de una escritura | Informativo: el bloqueo caduca a los 30 s y se recupera solo |

Los registros contienen códigos de error (`PERSISTENCE (EACCES)`), nunca datos de invitados, tokens, cookies ni contraseñas.

## 8. Actualizar la aplicación

1. `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` en local.
2. Haz una copia de seguridad (§6) antes de cambios que toquen el modelo de datos.
3. Despliega. Si `schemaVersion` cambia, aplica primero la migración descrita en `docs/DATA_MODEL.md` §15.

## 9. Lo que no se ha verificado

- **Construcción de la imagen** y ejecución del contenedor: Docker no estaba disponible al preparar este despliegue. Hasta que se haga, no se ha comprobado nada de lo que depende de Alpine, del usuario `node`, de `su-exec` ni del arranque real del volumen.
- **Comportamiento detrás del proxy de Coolify** con un dominio real (cabeceras `X-Forwarded-*`, HTTPS, cookie `__Host-`).

Haz primero esta comprobación local, con Docker en marcha:

```bash
docker build -t married-invite .
docker run --rm -p 3000:3000 -v married-data:/app/data \
  -e ADMIN_PASSWORD_HASH='base64:…' -e SESSION_SECRET='…(32+ caracteres)…' \
  -e APP_BASE_URL=http://localhost:3000 married-invite
```

En local, sin HTTPS, la cookie `Secure` puede impedir iniciar sesión según el navegador (algunos la aceptan en `localhost`, otros no): para esta prueba basta con `/api/health`, el reinicio con el mismo volumen y los registros del arranque.
