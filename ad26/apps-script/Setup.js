/**
 * Setup no destructivo para B | Campus Check-in AD26.
 * Agrega hojas/columnas faltantes sin borrar datos existentes.
 */

const AD26_HEADERS = {
  Config_AD26: ['llave', 'valor', 'descripcion'],
  Poblacion_AD26: [
    'matricula', 'nombres', 'apellidos', 'email', 'campus_origen', 'escuela', 'carrera', 'siglas_carrera',
    'tipo_poblacion', 'mentor_id', 'mentor_nombre', 'comunidad', 'foto_mentor',
    'preregistrado', 'respuesta_preregistro', 'fecha_preregistro', 'activo', 'periodo', 'fecha_importacion'
  ],
  Mentores_AD26: [
    'mentor_id', 'nombre', 'nombre_mostrar', 'nickname', 'foto_mentor', 'email', 'celular',
    'comunidad', 'instagram', 'verificado_institucional'
  ],
  Checkins_AD26: [
    'checkin_id', 'event_id', 'timestamp', 'matricula', 'nombre', 'campus_origen', 'escuela',
    'mentor_id', 'mentor_nombre', 'comunidad', 'preregistrado', 'respuesta_preregistro',
    'en_padron_original', 'ruta_registro', 'staff_id', 'source', 'carrera'
  ],
  Incidencias_AD26: [
    'incident_id', 'event_id', 'timestamp', 'matricula', 'nombre', 'campus_origen',
    'motivo', 'detalle', 'registrado_por', 'observaciones'
  ],
  Intentos_AD26: [
    'attempt_id', 'event_id', 'timestamp', 'matricula', 'resultado', 'ruta_registro', 'staff_id', 'source'
  ],
  Errores_AD26: ['error_id', 'event_id', 'timestamp', 'accion', 'matricula', 'mensaje'],
  Catalogos_AD26: ['catalogo', 'valor', 'activo']
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Campus Check-in AD26')
    .addItem('Preparar estructura AD26', 'setupAD26')
    .addItem('Previsualizar fotografia de preregistro', 'previewPreregistrationSnapshotAD26')
    .addItem('Importar fotografia de preregistro', 'importPreregistrationSnapshotAD26')
    .addItem('Preparar cache de estudiantes (6 h)', 'prewarmPopulationCacheAD26')
    .addItem('Actualizar dashboard (manual)', 'buildDashboardAD26')
    .addToUi();
}

function setupAD26() {
  const ss = getSpreadsheet();
  ss.setSpreadsheetTimeZone(AD26.TIMEZONE);
  reuseBlankDefaultSheet(ss);
  migrateEmptyLegacyIncidentSheet(ss);
  Object.keys(AD26_HEADERS).forEach(name => ensureSheetAndHeaders(ss, name, AD26_HEADERS[name]));
  ensureSheetAndHeaders(ss, 'Dashboard_AD26', ['Dashboard Campus Check-in AD26']);
  seedConfig(ss.getSheetByName('Config_AD26'));
  seedCatalogs(ss.getSheetByName('Catalogos_AD26'));
  buildDashboardAD26();
  protectWarningOnly(ss.getSheetByName('Config_AD26').getDataRange(), 'AD26_CONFIG');
  protectWarningOnly(ss.getSheetByName('Catalogos_AD26').getDataRange(), 'AD26_CATALOGOS');
}

function migrateEmptyLegacyIncidentSheet(ss) {
  const sheet = ss.getSheetByName('Incidencias_AD26');
  if (!sheet || sheet.getLastRow() > 1) return;

  const headers = getHeadersFromSheet(sheet);
  if (!headers.includes('acceso_autorizado') && !headers.includes('checkin_id_generado')) return;
  sheet.clear();
}

function getHeadersFromSheet(sheet) {
  if (sheet.getLastColumn() < 1) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(clean).filter(Boolean);
}

function reuseBlankDefaultSheet(ss) {
  const sheet = ss.getSheetByName('Hoja 1');
  if (!sheet || ss.getSheetByName('Config_AD26')) return;
  if (sheet.getLastRow() === 0 && sheet.getLastColumn() === 0) sheet.setName('Config_AD26');
}

function ensureSheetAndHeaders(ss, name, expectedHeaders) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  const existing = sheet.getLastColumn() > 0
    ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(clean).filter(Boolean)
    : [];

  if (!existing.length) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
  } else {
    const missing = expectedHeaders.filter(header => !existing.includes(header));
    if (missing.length) {
      sheet.getRange(1, sheet.getLastColumn() + 1, 1, missing.length).setValues([missing]);
    }
  }

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, sheet.getLastColumn())
    .setFontWeight('bold')
    .setBackground('#003b5c')
    .setFontColor('#ffffff');
  protectWarningOnly(sheet.getRange(1, 1, 1, sheet.getLastColumn()), `AD26_HEADER_${name}`);
}

function protectWarningOnly(range, description) {
  const existing = range.getSheet().getProtections(SpreadsheetApp.ProtectionType.RANGE)
    .find(protection => protection.getDescription() === description);
  if (existing) {
    existing.setRange(range);
    return;
  }
  range.protect().setDescription(description).setWarningOnly(true);
}

function seedConfig(sheet) {
  if (sheet.getLastRow() > 1) return;
  sheet.getRange(2, 1, 8, 3).setValues([
    ['PERIODO', 'AD26', 'Periodo activo'],
    ['EVENT_ID', AD26.EVENT_ID, 'Identificador estable del evento'],
    ['FECHA_EVENTO', '2026-08-07', 'Fecha ISO'],
    ['HORA_INICIO', '15:00', 'Hora local'],
    ['HORA_FIN', '17:30', 'Hora local'],
    ['ZONA_HORARIA', AD26.TIMEZONE, 'Zona horaria operativa'],
    ['LUGAR', 'Centro de Congresos', 'Campus Monterrey'],
    ['ACCESO_ONSITE_LIMITADO', 'FALSE', 'El tope de 400 aplica solo al preregistro']
  ]);
}

function seedCatalogs(sheet) {
  if (sheet.getLastRow() > 1) return;
  sheet.getRange(2, 1, 2, 3).setValues([
    ['MOTIVO_INCIDENCIA', 'TRANSFERENCIA_TARDIA', true],
    ['MOTIVO_INCIDENCIA', 'OTRO', true]
  ]);
}

function configureScriptPropertiesAD26(spreadsheetId, apiKey) {
  const normalizedId = clean(spreadsheetId);
  const normalizedKey = clean(apiKey);
  if (!/^[A-Za-z0-9_-]{20,}$/.test(normalizedId)) throw new Error('Spreadsheet ID invalido');
  if (normalizedKey.length < 32) throw new Error('La API key debe tener al menos 32 caracteres');

  PropertiesService.getScriptProperties().setProperties({
    CHECKIN_SPREADSHEET_ID: normalizedId,
    CHECKIN_API_KEY: normalizedKey
  });
  return { ok: true, spreadsheet_id: normalizedId, api_key_configured: true };
}
