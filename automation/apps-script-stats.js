/**
 * CAMPUS CHECK-IN FJ26 - Stats en Google Sheets
 * Genera una hoja "Stats" con metricas operativas del evento.
 */

const STATS_CONFIG = {
  CHECKINS_SHEET: 'Checkins',
  ASIGNACIONES_SHEET: 'Asignaciones',
  STATS_SHEET: 'Stats',
  COLS_CHECKINS: {
    TIMESTAMP: 2, // B
    MATRICULA: 3, // C
    NOMBRE: 4, // D
    COMUNIDAD: 5, // E
    MENTOR: 6, // F
    CAMPUS: 7, // G
    CARRERA: 8 // H
  },
  COLS_ASIGNACIONES: {
    MATRICULA: 1 // A
  }
};

function generarStatsCheckin() {
  const ss = SpreadsheetApp.getActive();
  const checkinsSheet = ss.getSheetByName(STATS_CONFIG.CHECKINS_SHEET);
  const asignacionesSheet = ss.getSheetByName(STATS_CONFIG.ASIGNACIONES_SHEET);
  if (!checkinsSheet) throw new Error('No existe la hoja Checkins');

  const statsSheet = getOrCreateSheet(ss, STATS_CONFIG.STATS_SHEET);
  statsSheet.clear();

  const checkins = readRows(checkinsSheet);
  const totalRows = checkins.length;
  const uniqueMatriculas = new Set();
  const byMatricula = {};
  const byMentor = {};
  const byComunidad = {};
  const byCampus = {};
  const byCarrera = {};
  const byHour = {};

  let sinMentor = 0;
  for (let i = 0; i < checkins.length; i++) {
    const row = checkins[i];
    const matricula = normalize(row[STATS_CONFIG.COLS_CHECKINS.MATRICULA - 1]);
    const mentor = normalizeText(row[STATS_CONFIG.COLS_CHECKINS.MENTOR - 1], 'Sin mentor');
    const comunidad = normalizeText(row[STATS_CONFIG.COLS_CHECKINS.COMUNIDAD - 1], 'Sin comunidad');
    const campus = normalizeText(row[STATS_CONFIG.COLS_CHECKINS.CAMPUS - 1], 'Sin campus');
    const carrera = normalizeText(row[STATS_CONFIG.COLS_CHECKINS.CARRERA - 1], 'Sin carrera');
    const timestamp = row[STATS_CONFIG.COLS_CHECKINS.TIMESTAMP - 1];
    const hourKey = toHourKey(timestamp);

    if (matricula) {
      uniqueMatriculas.add(matricula);
      byMatricula[matricula] = (byMatricula[matricula] || 0) + 1;
    }

    if (mentor === 'Sin mentor' || mentor === 'Escuela de Salud') {
      sinMentor += 1;
    }

    byMentor[mentor] = (byMentor[mentor] || 0) + 1;
    byComunidad[comunidad] = (byComunidad[comunidad] || 0) + 1;
    byCampus[campus] = (byCampus[campus] || 0) + 1;
    byCarrera[carrera] = (byCarrera[carrera] || 0) + 1;
    byHour[hourKey] = (byHour[hourKey] || 0) + 1;
  }

  let pendientes = '';
  if (asignacionesSheet) {
    const asignaciones = readRows(asignacionesSheet);
    const targetSet = new Set();
    for (let i = 0; i < asignaciones.length; i++) {
      const m = normalize(asignaciones[i][STATS_CONFIG.COLS_ASIGNACIONES.MATRICULA - 1]);
      if (m) targetSet.add(m);
    }
    pendientes = Math.max(targetSet.size - uniqueMatriculas.size, 0);
  }

  const duplicados = Object.keys(byMatricula).reduce((acc, key) => {
    return acc + Math.max((byMatricula[key] || 0) - 1, 0);
  }, 0);

  const metrics = [
    ['Metrica', 'Valor'],
    ['Total check-ins', totalRows],
    ['Estudiantes unicos', uniqueMatriculas.size],
    ['Duplicados detectados', duplicados],
    ['Registros sin mentor asignado', sinMentor],
    ['Pendientes por llegar', pendientes],
    ['Actualizado', new Date()]
  ];

  statsSheet.getRange(1, 1, metrics.length, 2).setValues(metrics);
  statsSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
  statsSheet.getRange(2, 1, metrics.length - 1, 1).setFontWeight('bold');
  statsSheet.getRange(metrics.length, 2).setNumberFormat('yyyy-mm-dd hh:mm:ss');

  let currentRow = metrics.length + 2;
  currentRow = writeCountTable(statsSheet, currentRow, 'Check-ins por comunidad', byComunidad);
  currentRow = writeCountTable(statsSheet, currentRow, 'Check-ins por mentor', byMentor);
  currentRow = writeCountTable(statsSheet, currentRow, 'Check-ins por campus', byCampus);
  currentRow = writeCountTable(statsSheet, currentRow, 'Check-ins por carrera', byCarrera);
  currentRow = writeCountTable(statsSheet, currentRow, 'Check-ins por hora', byHour, true);
  currentRow = writeRecentTable(statsSheet, currentRow, checkins);

  statsSheet.autoResizeColumns(1, 4);
  statsSheet.setFrozenRows(1);
}

function writeCountTable(sheet, startRow, title, sourceMap, sortByKey) {
  const rows = Object.keys(sourceMap).map((key) => [key, sourceMap[key]]);
  if (sortByKey) {
    rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  } else {
    rows.sort((a, b) => b[1] - a[1]);
  }

  sheet.getRange(startRow, 1).setValue(title).setFontWeight('bold');
  sheet.getRange(startRow + 1, 1, 1, 2).setValues([['Categoria', 'Total']]).setFontWeight('bold');
  if (rows.length > 0) {
    sheet.getRange(startRow + 2, 1, rows.length, 2).setValues(rows);
  } else {
    sheet.getRange(startRow + 2, 1, 1, 2).setValues([['Sin datos', 0]]);
  }
  return startRow + Math.max(rows.length, 1) + 4;
}

function writeRecentTable(sheet, startRow, checkins) {
  const copy = checkins.slice();
  copy.sort((a, b) => {
    const da = toDateValue(a[STATS_CONFIG.COLS_CHECKINS.TIMESTAMP - 1]);
    const db = toDateValue(b[STATS_CONFIG.COLS_CHECKINS.TIMESTAMP - 1]);
    return db - da;
  });

  const recent = copy.slice(0, 10).map((row) => ([
    row[STATS_CONFIG.COLS_CHECKINS.TIMESTAMP - 1],
    row[STATS_CONFIG.COLS_CHECKINS.MATRICULA - 1],
    row[STATS_CONFIG.COLS_CHECKINS.NOMBRE - 1],
    row[STATS_CONFIG.COLS_CHECKINS.MENTOR - 1]
  ]));

  sheet.getRange(startRow, 1).setValue('Ultimos 10 check-ins').setFontWeight('bold');
  sheet.getRange(startRow + 1, 1, 1, 4).setValues([['Timestamp', 'Matricula', 'Nombre', 'Mentor']]).setFontWeight('bold');
  if (recent.length > 0) {
    sheet.getRange(startRow + 2, 1, recent.length, 4).setValues(recent);
  } else {
    sheet.getRange(startRow + 2, 1, 1, 4).setValues([['Sin datos', '', '', '']]);
  }
  return startRow + Math.max(recent.length, 1) + 4;
}

function readRows(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
}

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function normalize(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeText(value, fallback) {
  const clean = String(value || '').trim();
  return clean || fallback;
}

function toHourKey(value) {
  const date = toDateValue(value);
  return Utilities.formatDate(new Date(date), 'America/Mexico_City', 'HH:00');
}

function toDateValue(value) {
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) return parsed.getTime();
  return 0;
}

