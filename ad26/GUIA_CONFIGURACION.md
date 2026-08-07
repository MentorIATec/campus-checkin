# Guia de configuracion AD26

## 1. Preparar el spreadsheet B

1. Crear un proyecto Apps Script vinculado a `B | Campus Check-in AD26`.
2. Copiar `apps-script/Code.js` y `apps-script/Setup.js` al proyecto.
3. Configurar mediante `configureScriptPropertiesAD26` o, como respaldo, crear manualmente en `Project Settings > Script Properties`:
   - `CHECKIN_SPREADSHEET_ID`: ID del spreadsheet B.
   - `CHECKIN_API_KEY`: secreto largo y exclusivo para AD26.
   - `PREREG_SPREADSHEET_ID`: ID del spreadsheet A de preregistro.
4. Ejecutar manualmente `setupAD26` una sola vez y autorizar permisos.
5. Confirmar que se crearon las hojas AD26 sin borrar `Hoja 1` ni otros datos.
6. No crear un trigger de actualización cada minuto. Actualizar el dashboard manualmente desde el menu cuando se necesite monitoreo.

## 2. Desplegar Apps Script

1. Seleccionar `Deploy > New deployment > Web app`.
2. Ejecutar como la persona propietaria del spreadsheet.
3. Configurar acceso compatible con las llamadas servidor a servidor de Vercel.
4. Guardar la URL terminada en `/exec`.
5. Probar el health check con `?key=<CHECKIN_API_KEY>`; debe responder con `ok: true` y el `event_id` AD26.

## 3. Configurar Vercel

Crear un proyecto independiente `campus-checkin-ad26` desde la rama `ad26` y configurar:

- `GOOGLE_SCRIPT_URL`: URL `/exec` del deployment AD26.
- `GOOGLE_SCRIPT_KEY`: mismo valor que `CHECKIN_API_KEY`.
- `ALLOWED_ORIGINS`: dominio de produccion AD26; agregar Preview solo durante pruebas controladas.

No colocar estos valores en `public/config.js`, GitHub ni documentos publicos.

### Proteccion adicional en Vercel

El codigo aplica un limite defensivo por cliente. Como las funciones serverless pueden ejecutarse en instancias distintas, este control no sustituye una regla distribuida. Antes de produccion:

1. Configurar una regla de Firewall o rate limiting para `/api/estudiante` y `/api/checkin`.
2. Permitir el trafico normal de dispositivos en la red del campus; probar la regla con 20 a 30 equipos concurrentes.

## 4. Cargar datos

1. Importar el catalogo privado de mentores en `Mentores_AD26`.
2. Ejecutar `npm run validate:mentor-assets` y resolver todas las coincidencias faltantes.
3. Ejecutar `previewPreregistrationSnapshotAD26` y resolver duplicados o filas inválidas.
4. Ejecutar `importPreregistrationSnapshotAD26` para reemplazar solo `Poblacion_AD26` y `Mentores_AD26`.
5. Confirmar el resultado del indice privado: estudiantes, 16 shards y tamano del shard mayor. Si se requiere renovar su vigencia, ejecutar `Preparar cache de estudiantes (6 h)` desde el menu.
6. El pipeline no modifica `Checkins_AD26` ni `Incidencias_AD26`.
7. Validar campos obligatorios, Salud y preregistro antes de congelar la fotografia operativa.

El indice usa `CacheService` como acelerador, no como fuente de verdad. Si un shard no esta disponible, el Web App consulta las hojas privadas y mantiene el comportamiento funcional.

## 5. Ensayo

1. Probar una matricula de Mentoria pendiente y luego duplicada.
2. Probar una matricula de Salud sin mentor.
3. Probar una matricula inexistente y capturarla manualmente en `Incidencias_AD26`.
4. Probar doble clic, Enter, refresh, conexion lenta y reintento.
5. Ensayar al menos 20 dispositivos concurrentes.
6. Confirmar que `Dashboard_AD26` suma check-ins digitales y registros manuales sin duplicar matriculas.
7. Confirmar que la pagina publica no consulta estadisticas; el monitoreo se realiza desde `Dashboard_AD26`.
