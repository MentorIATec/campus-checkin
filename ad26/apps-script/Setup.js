/**
 * Setup no destructivo para B | Campus Check-in AD26.
 * Agrega hojas/columnas faltantes sin borrar datos existentes.
 */

const AD26_HEADERS = {
  Config_AD26: ['llave', 'valor', 'descripcion'],
  Poblacion_AD26: [
    'matricula', 'nombres', 'apellidos', 'email', 'campus_origen', 'escuela', 'carrera',
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
    'en_padron_original', 'ruta_registro', 'staff_id', 'source'
  ],
  Incidencias_AD26: [
    'incident_id', 'event_id', 'timestamp', 'matricula_capturada', 'nombre', 'campus_origen',
    'motivo', 'detalle_otro', 'staff_id', 'acceso_autorizado', 'checkin_id_generado'
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
    .addItem('Regenerar dashboard', 'buildDashboardAD26')
    .addToUi();
}

function setupAD26() {
  const ss = getSpreadsheet();
  ss.setSpreadsheetTimeZone(AD26.TIMEZONE);
  reuseBlankDefaultSheet(ss);
  Object.keys(AD26_HEADERS).forEach(name => ensureSheetAndHeaders(ss, name, AD26_HEADERS[name]));
  ensureSheetAndHeaders(ss, 'Dashboard_AD26', ['Dashboard Campus Check-in AD26']);
  seedConfig(ss.getSheetByName('Config_AD26'));
  seedCatalogs(ss.getSheetByName('Catalogos_AD26'));
  buildDashboardAD26();
  protectWarningOnly(ss.getSheetByName('Config_AD26').getDataRange(), 'AD26_CONFIG');
  protectWarningOnly(ss.getSheetByName('Catalogos_AD26').getDataRange(), 'AD26_CATALOGOS');
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
  const exists = range.getSheet().getProtections(SpreadsheetApp.ProtectionType.RANGE)
    .some(protection => protection.getDescription() === description);
  if (!exists) range.protect().setDescription(description).setWarningOnly(true);
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

function buildDashboardAD26() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Dashboard_AD26') || ss.insertSheet('Dashboard_AD26');
  sheet.clear();
  sheet.clearFormats();

  sheet.getRange('A1:F1').merge().setValue('Dashboard Campus Check-in AD26')
    .setBackground('#003b5c').setFontColor('#ffffff').setFontWeight('bold').setFontSize(15)
    .setHorizontalAlignment('center');

  const labels = [
    ['Metrica', 'Valor'],
    ['Check-ins unicos', ''],
    ['Ultimo check-in', ''],
    ['Preregistrados que acudieron', ''],
    ['Asistentes sin preregistro', ''],
    ['Asistentes fuera del padron', ''],
    ['Incidencias staff', ''],
    ['Intentos duplicados', ''],
    ['Errores tecnicos', '']
  ];
  sheet.getRange(3, 1, labels.length, 2).setValues(labels);
  sheet.getRange('A3:B3').setFontWeight('bold').setBackground('#d9ecff');

  const event = AD26.EVENT_ID;
  sheet.getRange('B4').setFormula(`=IFERROR(COUNTUNIQUE(FILTER(Checkins_AD26!D2:D2000,Checkins_AD26!B2:B2000="${event}")),0)`);
  sheet.getRange('B5').setFormula(`=IFERROR(MAX(FILTER(Checkins_AD26!C2:C2000,Checkins_AD26!B2:B2000="${event}")),"")`).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange('B6').setFormula(`=COUNTIFS(Checkins_AD26!B2:B2000,"${event}",Checkins_AD26!K2:K2000,TRUE)`);
  sheet.getRange('B7').setFormula(`=COUNTIFS(Checkins_AD26!B2:B2000,"${event}",Checkins_AD26!K2:K2000,FALSE)`);
  sheet.getRange('B8').setFormula(`=COUNTIFS(Checkins_AD26!B2:B2000,"${event}",Checkins_AD26!M2:M2000,FALSE)`);
  sheet.getRange('B9').setFormula(`=COUNTIF(Incidencias_AD26!B2:B2000,"${event}")`);
  sheet.getRange('B10').setFormula(`=COUNTIFS(Intentos_AD26!B2:B2000,"${event}",Intentos_AD26!E2:E2000,"DUPLICADO")`);
  sheet.getRange('B11').setFormula(`=COUNTIF(Errores_AD26!B2:B2000,"${event}")`);

  sheet.getRange('A13').setFormula(`=QUERY(Checkins_AD26!B2:J2000,"select J,count(D) where B = '${event}' group by J label J 'Comunidad', count(D) 'Check-ins'",0)`);
  sheet.getRange('D13').setFormula(`=QUERY(Checkins_AD26!B2:I2000,"select I,count(D) where B = '${event}' group by I label I 'Mentor', count(D) 'Check-ins'",0)`);

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 6);
  protectWarningOnly(sheet.getRange('A1:F2000'), 'AD26_DASHBOARD_FORMULAS');
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
