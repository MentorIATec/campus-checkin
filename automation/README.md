# Campus Check-in FJ26 - Guia operativa

## 1) Estructura de Sheets
Ejecuta `setupSheets()` desde `automation/apps-script-setup.js` para crear:
- `Asignaciones`
- `Mentores`
- `Checkins`

Headers clave esperados:
- `Asignaciones`: `Matricula`, `Mentor(a) Asignado(a) FJ26` (K), `Nombre_completo` (M), `Nombres` (N), `Apellidos` (O), `email` (Q).
- `Mentores`: `nombreMentor`, `nicknameMentor`, `fotoMentor`, `Email`, `Celular`, `Comunidad`, `Instagram`.
- `Checkins`: `checkinId`, `timestamp`, `matricula`, `nombre`, `comunidad`, `mentor`, `campus`, `carrera`, `source`.

## 2) Apps Script (lookup + checkin idempotente)
1. Pega `automation/apps-script-checkin.js`.
2. Verifica:
   - `CHECKIN_CONFIG.API_KEY` = key interna de Apps Script.
   - `MENTOR_EXCEPCIONES` activa (Pasio/Talenta y Salud).
3. Deploy como Web App:
   - Ejecutar como: tu cuenta.
   - Acceso: cualquiera.
4. Cada cambio requiere `Deploy -> Manage deployments -> New version`.

## 3) Variables en Vercel
Configura en `All Environments`:
- `API_KEY_CHECKIN` (key del frontend)
- `GOOGLE_SCRIPT_URL` (URL `/exec` de Apps Script)
- `GOOGLE_SCRIPT_KEY` (misma key de `CHECKIN_CONFIG.API_KEY`)

Recomendado: no usar `API_KEY_CHECKIN_LIST` si no es necesario.

## 4) Frontend
La key publica se define en `public/config.js`:

```js
window.CHECKIN_CONFIG = {
  API_BASE: '',
  API_KEY: 'TU_API_KEY_CHECKIN',
  GOOGLE_SCRIPT_URL: ''
};
```

No cargar `config.local.js` en produccion.

## 5) Convencion de fotos de mentores
- Preferente: usar `fotoMentor` en la hoja `Mentores` (URL o nombre de archivo).
- Fallback automatico: `/mentores/{nicknameMentor}{Comunidad}.jpg`
  - Ejemplo: `AbbyReflekto.jpg`.
- Las fotos viven en `public/mentores`.

## 6) Excepciones activas
- `Mentor Pendiente Pasio` -> `Norman Ernesto Ramirez Gonzalez` / `Pasio`.
- `Mentor(a) Talenta pendiente` -> `Zoe Nohemi Montoya Campos` / `Talenta`.
- `Salud` o `Escuela de Salud` -> comunidad `Comunidades Academicas` (sin mentor asignado).

## 7) Flujo operativo (evento)
- Lookup por matricula.
- Verificacion anti-duplicado (`GET /api/checkin`).
- Registro idempotente (`POST /api/checkin` con `checkinId=matricula|FJ26`).
- Auto-reset corto en movil para fila continua.

## 8) Checklist pre-produccion
1. Buscar 3 matriculas validas y 1 invalida.
2. Confirmar que no duplique registro.
3. Validar foto/fallback mentor.
4. Probar excepciones (Pasio, Talenta, Salud).
5. Probar en movil flujo continuo (3 registros seguidos).
6. Revisar `Checkins` en Sheet en tiempo real.

## 9) Hoja de estadisticas (opcional pero recomendada)
Para generar metricas en la misma spreadsheet:
1. Pega `automation/apps-script-stats.js` en Apps Script.
2. Ejecuta `generarStatsCheckin()`.
3. Recarga la hoja para ver el menu `Check-in FJ26`.
4. Usa `Check-in FJ26 -> Actualizar Stats` cuando necesites refrescar dashboard.
5. Se creara/actualizara la hoja `Stats` con:
   - Totales, unicos, duplicados y pendientes.
   - Dashboard visual con bloques KPI de color.
   - Tablas Top 5 (comunidades, mentores, carreras).
   - Check-ins por comunidad, mentor, campus, carrera y hora.
   - Ultimos 10 check-ins.
