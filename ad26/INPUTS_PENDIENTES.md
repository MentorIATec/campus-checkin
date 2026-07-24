# Inputs pendientes para cerrar AD26

## Datos

- Encabezados definitivos de la sabana AD26.
- Archivo final de poblacion, sin publicarlo en Git.
- Confirmacion de la regla definitiva para identificar Escuela de Salud.
- Fecha y responsable del congelamiento de la fotografia operativa.

## Mentores

- Importar los 47 registros de `DATOSME_CURSOR.xlsx` a `Mentores_AD26` en el spreadsheet privado.
- Conservar en `foto_mentor` los nombres aprobados en `mentor-assets.expected.txt`.
- Completar la revision visual de identidad y encuadre; la validacion automatica de los 47 archivos ya esta completa.

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
