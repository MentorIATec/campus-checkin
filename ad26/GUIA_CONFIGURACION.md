# Guia de configuracion AD26

## 1. Preparar el spreadsheet B

1. Crear un proyecto Apps Script vinculado a `B | Campus Check-in AD26`.
2. Copiar `apps-script/Code.js` y `apps-script/Setup.js` al proyecto.
3. Configurar mediante `configureScriptPropertiesAD26` o, como respaldo, crear manualmente en `Project Settings > Script Properties`:
   - `CHECKIN_SPREADSHEET_ID`: ID del spreadsheet B.
   - `CHECKIN_API_KEY`: secreto largo y exclusivo para AD26.
4. Ejecutar manualmente `setupAD26` una sola vez y autorizar permisos.
5. Confirmar que se crearon las hojas AD26 sin borrar `Hoja 1` ni otros datos.
6. No crear un trigger de actualización cada minuto. El dashboard usa formulas y tiene regeneracion manual.

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
- `STAFF_PIN`: PIN temporal para la ruta `/staff`.

No colocar estos valores en `public/config.js`, GitHub ni documentos publicos.

### Proteccion adicional en Vercel

El codigo aplica un limite defensivo por cliente y bloquea temporalmente intentos fallidos de PIN. Como las funciones serverless pueden ejecutarse en instancias distintas, este control no sustituye una regla distribuida. Antes de produccion:

1. Configurar una regla de Firewall o rate limiting para `/api/estudiante`, `/api/checkin` y `/api/incidencia`.
2. Permitir el trafico normal de dispositivos en la red del campus; probar la regla con 20 a 30 equipos concurrentes.
3. No publicar ni compartir el PIN de staff en el QR del alumnado.

## 4. Cargar datos

1. Importar el catalogo privado de mentores en `Mentores_AD26`.
2. Ejecutar `npm run validate:mentor-assets` y resolver todas las coincidencias faltantes.
3. Cuando lleguen los encabezados definitivos, construir `Poblacion_AD26` mediante el pipeline de importacion.
4. Completar `activo=TRUE` y `periodo=AD26` para cada estudiante habilitado.
5. Validar duplicados, campos obligatorios, Salud y preregistro antes de congelar la fotografia operativa.

## 5. Ensayo

1. Probar una matricula de Mentoria pendiente y luego duplicada.
2. Probar una matricula de Salud sin mentor.
3. Probar una matricula inexistente desde `/staff`.
4. Probar doble clic, Enter, refresh, conexion lenta y reintento.
5. Ensayar al menos 20 dispositivos concurrentes.
6. Confirmar que `Dashboard_AD26` cuenta matriculas unicas y no altera `Checkins_AD26`.
7. Confirmar que la pagina publica no consulta estadisticas; el monitoreo se realiza desde `Dashboard_AD26`.
