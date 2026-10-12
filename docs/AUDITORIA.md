## Auditoría del proyecto contra AGENTS.md y docs/

**Fecha:** 2026-10-12
**Alcance:** persistencia, escrituras concurrentes, exposición de datos, autorización, validación, sesiones y despliegue.
**Método:** lectura del código, comprobaciones mecánicas (`grep`), 305 pruebas automáticas, pruebas de mutación (introducir un fallo a propósito y comprobar que alguna prueba lo detecta) y ejecución real del servidor de producción.

---

## Resultado

| Severidad | Hallazgos | Corregidos | Abiertos |
|---|---|---|---|
| Crítica | 0 | 0 | 0 |
| Alta | 4 | 1 | 3 |
| Media | 6 | 2 (+1 mitigado) | 3 |
| Baja | 8 | 0 | 8 |

No se encontró ningún fallo crítico de autorización ni de exposición de datos. El único problema con pérdida real de datos (A1) está corregido y demostrado con pruebas.

## Hallazgos

### Altos

**A1. Pérdida de escrituras entre procesos durante un despliegue — CORREGIDO**
Coolify hace *rolling updates*: el contenedor nuevo arranca con el viejo aún vivo, y ambos comparten `guests.json`. La cola de escrituras es local a cada proceso, así que no los coordina. Demostrado con dos instancias del repositorio sobre el mismo archivo: **40 actualizaciones dejaban 21** y **60 creaciones dejaban 30**.
*Corrección:* bloqueo de archivo entre procesos (`<archivo>.lock`, creación exclusiva) que dura solo cada operación y caduca a los 30 s si el proceso muere. Con él, 41/41 y 60/60. Las lecturas no lo necesitan (el reemplazo es atómico). Es una salvaguarda del solape, no una autorización para usar réplicas. Ver `tests/guest-repository-multiprocess.test.ts`.
*Riesgo residual:* si dos procesos observan a la vez el mismo bloqueo vencido, podrían ambos retirarlo y tomarlo (exige además que un proceso haya muerto con el bloqueo tomado; muy improbable).

**A2. Todo el trabajo está sin commitear — ABIERTO (acción tuya)**
El repositorio tiene 2 commits (la plantilla y la documentación inicial). `src/`, `tests/`, `docs/` (salvo ABOUT y DESIGN), `scripts/`, el Dockerfile y los cambios de configuración están sin versionar, y `app/` figura como renombrado sin confirmar. Un borrado accidental, un `git clean` o un fallo de disco los perdería. No hice commit porque no me lo pediste.
*Recomendación:* crear una rama y hacer commit. `.gitignore` ya excluye `.env*`, `data/*`, `*.bak` y `*.tmp`.

**A3. No hay copias de seguridad — ABIERTO (requiere configuración tuya)**
REQUIREMENTS §4.2 las exige y DATA_MODEL §13 supone que existen para recuperarse de un archivo corrupto. La aplicación no las hace y no se pueden configurar desde el código. Un archivo en un solo VPS es un punto único de fallo para todas las respuestas.
*Recomendación:* tarea programada de Coolify y descarga periódica fuera del servidor. Comando y procedimiento de restauración en `docs/DEPLOYMENT.md` §6. Prueba una restauración antes de necesitarla.

**A4. La imagen de Docker no se ha construido ni ejecutado — SIN VERIFICAR**
Docker Desktop estaba apagado y se decidió omitir esa prueba. Verificado sin Docker: el servidor `standalone` incluye el módulo nativo de Argon2 y arranca, el inicio de sesión funciona dentro de él, la sonda de salud responde 200/503, y el entrypoint rechaza configuraciones inválidas. **No verificado:** el build en Alpine, el usuario `node`, `su-exec`, los permisos de un volumen real y el reinicio con volumen. Pasos para comprobarlo en `docs/DEPLOYMENT.md` §9.

### Medios

**M1. Panel y API incrustables en un `<iframe>` ajeno (clickjacking) — CORREGIDO**
Ninguna ruta enviaba `X-Frame-Options` ni `frame-ancestors`. *Corrección:* cabeceras en todas las rutas (`X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, HSTS), comprobadas en el servidor real. No se definió una CSP completa porque Next.js inyecta scripts en línea y exigiría nonces.

**M2. La aplicación arrancaba con configuración inválida — CORREGIDO**
Sin `ADMIN_PASSWORD_HASH` o con un hash dañado por la expansión de `$`, el servidor arrancaba y fallaba después, con un 500 al intentar iniciar sesión. *Corrección:* el entrypoint falla de inmediato con un mensaje claro (sin imprimir valores) y `/api/health` solo pasa si el archivo de datos se puede leer, para que `rolling update` no sustituya una versión sana.

**M3. Volumen sin montar → datos efímeros en silencio — MITIGADO**
Sin Persistent Storage en `/app/data`, el archivo vive en el disco del contenedor y se pierde al redesplegar, sin ningún error. *Mitigación:* el entrypoint advierte en los registros. Solo advierte y no falla, porque no puede distinguir con certeza todos los tipos de montaje. La prueba de persistencia de `docs/DEPLOYMENT.md` §5 es el control real.

**M4. `docs/SECURITY.md` está truncado — ABIERTO**
Termina en §5.1 («Se recomienda»). Faltan las secciones de sesiones, CSRF, límites, respaldos y despliegue, así que no se puede contrastar lo implementado con lo especificado. El diseño real está en `docs/ARCHITECTURE.md` §6.3. *Recomendación:* completar el documento y contrastarlo.

**M5. Los límites de uso dependen de `X-Forwarded-For` — ABIERTO (condicional)**
Se usa la última entrada, la que añade el proxy. Si hay un proxy o CDN delante de Traefik, todos los invitados compartirían un contador: con 20 envíos por minuto, un pico podría dar «demasiados intentos» a invitados legítimos. Si el contenedor se expone directamente, cualquiera puede falsear la cabecera. *Recomendación:* con Coolify directo es correcto; si añades un CDN, revisa estos límites.

**M6. La página `/` era la plantilla de Next.js — RESUELTO PARCIALMENTE**
`docs/REQUIREMENTS.md` pide una página de bienvenida. Hoy muestra el contenido de ejemplo de `create-next-app` (enlaces a Vercel). No exponía datos, pero era lo primero que vería alguien que visitara el dominio. Se eliminó `src/app/page.tsx`: ahora `/` responde 404. Sigue pendiente la página de bienvenida que pide REQUIREMENTS.

### Bajos

- **B1. El cupo no tiene tope** (acepta hasta 9.007.199.254.740.991) y el teléfono no limita caracteres. Solo lo puede enviar el administrador y se escapa al mostrarse. DATA_MODEL no define máximo: es una decisión de modelo.
- **B2. 5 avisos altos de `npm audit`** en `eslint-config-next → fast-glob → micromatch → braces` (denegación de servicio por patrones anidados). Son dependencias de desarrollo: `npm audit --omit=dev` da 0 y la imagen no las incluye.
- **B3. `experimental.agentFeedback` en `next.config.ts`** hace que `next dev` reescriba `AGENTS.md` (añade su propio bloque). No se tocó porque es decisión tuya; conviene quitarlo.
- **B4. Los errores inesperados se registran solo como `UNEXPECTED`**, sin tipo ni código, lo que dificulta diagnosticarlos. Se evita registrar el mensaje por si contiene rutas o datos.
- **B5. No se hace `fsync` del directorio tras el `rename`.** Ante un corte de energía justo en ese instante podría perderse la última escritura (el archivo anterior queda íntegro).
- **B6. El límite global de inicio de sesión** permite que alguien bloquee temporalmente nuevos inicios de sesión (100 intentos/15 min). No afecta a una sesión ya abierta. Es la contrapartida de limitar la fuerza bruta distribuida.
- **B7. `package.json` no declara `engines`.** El Dockerfile fija Node 24.
- **B8. Las sesiones se pierden al reiniciar** (por diseño: están en memoria). Cada despliegue obliga a iniciar sesión de nuevo.

## Cumplimiento de AGENTS.md

| Regla | Estado | Evidencia |
|---|---|---|
| 1. Sin Supabase, Firebase ni BD externa | ✅ | `package.json`: solo Next, React, Zod y Argon2 |
| 2. JSON y una sola instancia | ✅ | Un único repositorio; documentado; bloqueo solo para el solape |
| 3. Lectura y escritura en el servidor | ✅ | Los datos de invitados solo los toca `guest-repository.ts`. `media.ts` también importa `node:fs`, pero únicamente para listar las carpetas públicas de fotos y videos, nunca el JSON |
| 4. Sin acceso al JSON desde React | ✅ | Ningún componente importa el repositorio |
| 5. Persistencia en `guest-repository.ts` | ✅ | `grep` |
| 6. Reglas en `guest-service.ts` | ✅ | Cupo, estados y tokens dentro de `repository.update` |
| 7. Entradas validadas con Zod | ✅ | Ninguna ruta lee el cuerpo sin `readJsonBody` + esquema |
| 8. Rutas administrativas autenticadas | ✅ | `withAdmin` + guardia estructural + 30 casos de 401 |
| 9. Sin listado de invitados en rutas públicas | ✅ | La API pública solo devuelve 4 campos, y solo del token |
| 10. Documentación al cambiar el modelo | ✅ | DATA_MODEL §8 y §13, ARCHITECTURE §6 |
| Persistencia: `DATA_FILE_PATH`, cola, temporal atómico, sin sobrescribir corruptos, errores honestos | ✅ | 36 pruebas del repositorio y 9 de varios procesos |
| Seguridad: sin hashes ni secretos en API, tokens aleatorios con hash, sin registrar credenciales | ✅ | Pruebas de ausencia de fugas; `randomBytes` en tokens, ids y sesiones |
| Seguridad: «proteger las solicitudes que modifican datos» | ✅ | `Origin` + JSON + `SameSite=Strict` |

## Verificación realizada

| Comprobación | Resultado |
|---|---|
| `npm test` | 305 pruebas, todas pasan |
| `npm run lint` / `typecheck` / `build` | Sin errores |
| `npm audit --omit=dev` | 0 vulnerabilidades |
| Servidor `standalone` en modo producción | Salud, cabeceras, Argon2 y login correctos |
| Pruebas de mutación (autenticación, sesión, cookie, límites) | 9/9 detectadas |
| Prueba de pérdida de datos entre procesos | Falla sin el bloqueo (21/41, 30/60) y pasa con él |
| Construcción de la imagen de Docker | **No realizada** |
| Despliegue real en Coolify | **No realizado** |
