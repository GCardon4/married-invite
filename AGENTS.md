# AGENTS.md — Instrucciones para la IA

## Contexto

Este proyecto es una aplicación temporal de invitaciones de matrimonio para 150–200 invitados. Utiliza Next.js App Router, TypeScript, Tailwind CSS, Zod y almacenamiento JSON persistente en el servidor. Se despliega en Coolify sobre un VPS y tiene un único administrador.

## Decisiones obligatorias

1. No introducir Supabase, Firebase ni una base de datos externa.
2. Mantener JSON como almacenamiento inicial y una única instancia Node.js.
3. Toda lectura y escritura se realiza en el servidor.
4. No acceder al archivo JSON directamente desde componentes React.
5. Centralizar la persistencia en `guest-repository.ts`.
6. Centralizar las reglas de negocio en `guest-service.ts`.
7. Validar entradas con Zod en el servidor.
8. Proteger todas las rutas administrativas mediante autenticación.
9. No exponer el listado completo de invitados en rutas públicas.
10. No cambiar el modelo de datos ni las reglas de negocio sin actualizar la documentación.

## Reglas de persistencia

- Utilizar `DATA_FILE_PATH`.
- Mantener el archivo de producción en un volumen persistente.
- Serializar toda la operación de lectura, modificación y escritura.
- Usar escritura temporal y reemplazo atómico.
- No reemplazar automáticamente archivos corruptos por archivos vacíos.
- No habilitar múltiples réplicas mientras la coordinación de escrituras sea local al proceso.
- Informar los errores de persistencia sin fingir que una operación tuvo éxito.

## Seguridad

- No guardar secretos ni datos reales en Git.
- No devolver hashes de tokens ni contraseñas en las API.
- Generar tokens aleatorios seguros y almacenar sus hashes.
- Validar permisos en cada endpoint administrativo.
- No confiar en valores enviados por el navegador para autorizar cupos o cambios.
- Proteger las solicitudes que modifican datos.
- No registrar credenciales, cookies ni tokens completos.

## Forma de trabajar

Antes de cada tarea:
1. Revisar este archivo y la documentación relacionada.
2. Explicar qué se implementará y qué archivos se modificarán.
3. Mantener los cambios acotados a la solicitud.
4. Identificar riesgos para datos, seguridad y despliegue.

Después de cada tarea:
1. Ejecutar las pruebas, el lint y el build disponibles.
2. Informar los comandos ejecutados y sus resultados reales.
3. Actualizar documentación y variables de ejemplo cuando corresponda.
4. No afirmar que se ejecutaron pruebas que no se realizaron.
5. No borrar datos reales para corregir errores.

## Cambios de arquitectura

Si una solicitud exige cambiar alguna decisión obligatoria, explicar el motivo, las alternativas, los riesgos y el impacto sobre los datos antes de implementarla. No introducir cambios de arquitectura silenciosamente.