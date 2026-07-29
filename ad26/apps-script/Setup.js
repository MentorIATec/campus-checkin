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
    .addItem('Regenerar dashboard', 'buildDashboardAD26')
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

function buildDashboardAD26() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Dashboard_AD26') || ss.insertSheet('Dashboard_AD26');
  sheet.clear();
  sheet.clearFormats();

  sheet.getRange('A1:J1').merge().setValue('Dashboard Campus Check-in AD26')
    .setBackground('#003b5c').setFontColor('#ffffff').setFontWeight('bold').setFontSize(15)
    .setHorizontalAlignment('center');

  const labels = [
    ['Metrica', 'Valor'],
    ['Registros digitales totales', ''],
    ['Check-ins digitales unicos', ''],
    ['Registros manuales unicos', ''],
    ['Total asistentes unicos', ''],
    ['Pendientes del padron', ''],
    ['Ultimo check-in digital', ''],
    ['Preregistrados que acudieron', ''],
    ['Asistentes sin preregistro', ''],
    ['Intentos duplicados', ''],
    ['Escuela de Salud / sin mentor', ''],
    ['Errores tecnicos', '']
  ];
  sheet.getRange(3, 1, labels.length, 2).setValues(labels);
  sheet.getRange('A3:B3').setFontWeight('bold').setBackground('#d9ecff');

  const event = AD26.EVENT_ID;
  sheet.getRange('B4').setFormula(`=COUNTIFS(Checkins_AD26!B2:B2000,"${event}",Checkins_AD26!D2:D2000,"<>")`);
  sheet.getRange('B5').setFormula(`=IF(B4=0,0,COUNTA(UNIQUE(FILTER(Checkins_AD26!D2:D2000,Checkins_AD26!D2:D2000<>"",Checkins_AD26!B2:B2000="${event}"))))`);
  sheet.getRange('B6').setFormula(`=IF(COUNTIFS(Incidencias_AD26!B2:B2000,"${event}",Incidencias_AD26!D2:D2000,"<>")=0,0,COUNTA(UNIQUE(FILTER(Incidencias_AD26!D2:D2000,Incidencias_AD26!D2:D2000<>"",Incidencias_AD26!B2:B2000="${event}"))))`);
  sheet.getRange('B7').setFormula(`=B5+B6-IF(B6=0,0,SUM(ARRAYFORMULA(N(COUNTIF(Checkins_AD26!D2:D2000,UNIQUE(FILTER(Incidencias_AD26!D2:D2000,Incidencias_AD26!D2:D2000<>"",Incidencias_AD26!B2:B2000="${event}")))>0))))`);
  sheet.getRange('B8').setFormula(`=IFERROR(COUNTA(UNIQUE(FILTER(Poblacion_AD26!A2:A2000,Poblacion_AD26!A2:A2000<>"",Poblacion_AD26!P2:P2000=TRUE,ARRAYFORMULA(COUNTIF(Checkins_AD26!D2:D2000,Poblacion_AD26!A2:A2000)=0),ARRAYFORMULA(COUNTIF(Incidencias_AD26!D2:D2000,Poblacion_AD26!A2:A2000)=0)))),0)`);
  sheet.getRange('B9').setFormula(`=IFERROR(MAX(FILTER(Checkins_AD26!C2:C2000,Checkins_AD26!B2:B2000="${event}")),"")`).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange('B10').setFormula(`=COUNTIFS(Checkins_AD26!B2:B2000,"${event}",Checkins_AD26!K2:K2000,TRUE)`);
  sheet.getRange('B11').setFormula(`=COUNTIFS(Checkins_AD26!B2:B2000,"${event}",Checkins_AD26!K2:K2000,FALSE)`);
  sheet.getRange('B12').setFormula(`=COUNTIFS(Intentos_AD26!B2:B2000,"${event}",Intentos_AD26!E2:E2000,"DUPLICADO")`);
  sheet.getRange('B13').setFormula(`=COUNTIFS(Checkins_AD26!B2:B2000,"${event}",Checkins_AD26!I2:I2000,"Escuela de Salud")+COUNTIFS(Checkins_AD26!B2:B2000,"${event}",Checkins_AD26!I2:I2000,"")`);
  sheet.getRange('B14').setFormula(`=COUNTIF(Errores_AD26!B2:B2000,"${event}")`);
  sheet.getRange('B4:B8').setNumberFormat('#,##0');
  sheet.getRange('B10:B14').setNumberFormat('#,##0');

  sheet.getRange('D3').setFormula(`=QUERY(Checkins_AD26!B2:J2000,"select J,count(D) where B = '${event}' and D is not null group by J order by count(D) desc limit 5 label J 'Top comunidades', count(D) 'Check-ins'",0)`);
  sheet.getRange('G3').setFormula(`=QUERY(Checkins_AD26!B2:I2000,"select I,count(D) where B = '${event}' and D is not null group by I order by count(D) desc limit 5 label I 'Top mentores', count(D) 'Check-ins'",0)`);
  sheet.getRange('I3').setFormula(`=QUERY(Checkins_AD26!B2:F2000,"select F,count(D) where B = '${event}' and D is not null group by F order by count(D) desc limit 5 label F 'Top campus', count(D) 'Check-ins'",0)`);

  sheet.getRange('A17').setValue('Desglose completo').setFontWeight('bold').setFontSize(12);
  sheet.getRange('A18').setFormula(`=QUERY(Checkins_AD26!B2:J2000,"select J,count(D) where B = '${event}' and D is not null group by J order by count(D) desc label J 'Comunidad', count(D) 'Check-ins'",0)`);
  sheet.getRange('D18').setFormula(`=QUERY(Checkins_AD26!B2:I2000,"select I,count(D) where B = '${event}' and D is not null group by I order by count(D) desc label I 'Mentor', count(D) 'Check-ins'",0)`);
  sheet.getRange('G18').setFormula(`=QUERY(Checkins_AD26!B2:F2000,"select F,count(D) where B = '${event}' and D is not null group by F order by count(D) desc label F 'Campus', count(D) 'Check-ins'",0)`);

  sheet.getRange('A45').setFormula(`=QUERY(Checkins_AD26!B2:Q2000,"select Q,count(D) where B = '${event}' and D is not null group by Q order by count(D) desc label Q 'Carrera', count(D) 'Check-ins'",0)`);
  sheet.getRange('D45').setFormula(`=QUERY(Checkins_AD26!B2:C2000,"select hour(C),count(C) where B = '${event}' and C is not null group by hour(C) order by hour(C) label hour(C) 'Hora', count(C) 'Check-ins'",0)`);
  sheet.getRange('G45').setFormula(`=QUERY(Checkins_AD26!B2:I2000,"select C,D,E,I where B = '${event}' and D is not null order by C desc limit 10 label C 'Hora', D 'Matricula', E 'Estudiante', I 'Mentor'",0)`);

  sheet.getRange('A70:J70').merge().setValue('Los registros manuales se capturan en Incidencias_AD26 y se suman al total sin duplicar matriculas. Los desgloses usan los check-ins digitales, que incluyen datos enriquecidos del padron.')
    .setFontColor('#52606d').setFontStyle('italic').setWrap(true);

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(4, 240);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(7, 190);
  sheet.setColumnWidth(8, 110);
  sheet.setColumnWidth(9, 190);
  sheet.setColumnWidth(10, 110);
  ['D3:E3', 'G3:H3', 'I3:J3', 'A18:B18', 'D18:E18', 'G18:H18', 'A45:B45', 'D45:E45', 'G45:J45']
    .forEach(a1 => sheet.getRange(a1).setFontWeight('bold').setBackground('#d9ecff'));
  protectWarningOnly(sheet.getRange('A1:J2000'), 'AD26_DASHBOARD_FORMULAS');
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
