# Campus Check-in FJ26 - Setup rápido

## 1) Google Sheets
1. Crea un Spreadsheet.
2. Abre Apps Script y pega `automation/apps-script-setup.js`.
3. Ejecuta `setupSheets()` para crear:
   - `Asignaciones`
   - `Mentores`
   - `Checkins`

## 2) Apps Script Web App (Lookup + Check-in)
1. En Apps Script, crea un archivo nuevo y pega `automation/apps-script-checkin.js`.
2. Reemplaza `REEMPLAZA_ESTA_API_KEY` por una key segura.
3. Ajusta columnas en `CHECKIN_CONFIG.COLS_ASIGNACIONES` si cambiaste headers.
4. Deploy -> "Web App":
   - Ejecutar como: **tú**
   - Quién tiene acceso: **Cualquiera**
5. Guarda la URL del Web App.

## 3) Vercel (API Proxy)
Variables de entorno requeridas:
- `API_KEY_CHECKIN` o `API_KEY_CHECKIN_LIST`
- `GOOGLE_SCRIPT_URL` (URL del Web App)
- `GOOGLE_SCRIPT_KEY` (API key del Apps Script)

## 4) Frontend
En `public/config.local.js`:
```js
window.CHECKIN_CONFIG = {
  API_KEY: 'TU_API_KEY_FRONTEND'
};
```

## 5) Endpoints
- `POST /api/estudiante` -> lookup
- `POST /api/checkin` -> registrar asistencia
- `GET /api/checkin?matricula=A01234567` -> verificar status
- `GET /api/stats` -> conteo y último check-in

## 6) Prueba rápida
1. En Sheets, carga una fila en `Asignaciones`.
2. Verifica lookup en el frontend.
3. Confirma asistencia y revisa `Checkins`.
