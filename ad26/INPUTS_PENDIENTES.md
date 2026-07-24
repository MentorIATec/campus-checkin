# Inputs pendientes para cerrar AD26

## Datos

- Encabezados definitivos de la sabana AD26.
- Archivo final de poblacion, sin publicarlo en Git.
- Confirmacion de la regla definitiva para identificar Escuela de Salud.
- Fecha y responsable del congelamiento de la fotografia operativa.

## Mentores

- Copiar o renombrar las imagenes pendientes reportadas por `npm run validate:mentor-assets`.
- Importar los 47 registros de `DATOSME_CURSOR.xlsx` a `Mentores_AD26` en el spreadsheet privado.
- Validar que `foto_mentor` coincida exactamente, incluyendo acentos y mayusculas.

## Integraciones

- Crear y configurar `CHECKIN_API_KEY` y `CHECKIN_SPREADSHEET_ID` en Script Properties.
- Desplegar Apps Script como Web App y registrar su URL `/exec` en Vercel.
- Configurar en Vercel `GOOGLE_SCRIPT_URL`, `GOOGLE_SCRIPT_KEY`, `ALLOWED_ORIGINS` y `STAFF_PIN`.
- Configurar reglas distribuidas de rate limiting o Firewall para los tres endpoints operativos.
- Rotar la llave historica FJ26 que estuvo versionada.

## Operacion

- Definir dispositivos y responsables del flujo staff.
- Ensayar concurrencia, red lenta, doble clic, refresh e incidencia tardia.
- Crear el proyecto y dominio `campus-checkin-ad26` sin reutilizar FJ26.
- Definir respaldo manual y QR de contingencia.
