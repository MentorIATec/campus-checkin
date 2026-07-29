/**
 * Dashboard operativo AD26.
 * Se regenera manualmente para evitar lecturas continuas durante el acceso onsite.
 */

function buildDashboardAD26() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Dashboard_AD26') || ss.insertSheet('Dashboard_AD26');
  const data = dashboardDataAD26();

  sheet.clear();
  sheet.clearFormats();
  writeDashboardHeaderAD26(sheet);
  writeKpiCardsAD26(sheet, data.kpis);
  writeTop5TableAD26(sheet, 7, 1, 'Top 5 Comunidades', data.byCommunity);
  writeTop5TableAD26(sheet, 7, 4, 'Top 5 Mentores', data.byMentor);
  writeTop5TableAD26(sheet, 7, 7, 'Top 5 Carreras', data.byCareer);

  let currentRow = 15;
  const metrics = [
    ['Metrica', 'Valor'],
    ['Registros digitales totales', data.kpis.digitalRows],
    ['Check-ins digitales unicos', data.kpis.digitalUnique],
    ['Registros manuales unicos', data.kpis.manualUnique],
    ['Total asistentes unicos', data.kpis.unique],
    ['Pendientes del padron', data.kpis.pending],
    ['Preregistrados que acudieron', data.kpis.preregisteredAttended],
    ['Asistentes sin preregistro', data.kpis.withoutPreregistration],
    ['Duplicados detectados', data.kpis.duplicates],
    ['Escuela de Salud / sin mentor', data.kpis.withoutMentor],
    ['Errores tecnicos', data.kpis.errors],
    ['Actualizado', new Date()]
  ];
  sheet.getRange(currentRow, 1, metrics.length, 2).setValues(metrics);
  sheet.getRange(currentRow, 1, 1, 2).setFontWeight('bold').setBackground('#edf2f7');
  sheet.getRange(currentRow + 1, 1, metrics.length - 1, 1).setFontWeight('bold');
  sheet.getRange(currentRow + metrics.length - 1, 2).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  currentRow += metrics.length + 2;

  currentRow = writeCountTableAD26(sheet, currentRow, 'Check-ins por comunidad', data.byCommunity);
  currentRow = writeCountTableAD26(sheet, currentRow, 'Check-ins por mentor', data.byMentor);
  currentRow = writeCountTableAD26(sheet, currentRow, 'Check-ins por escuela', data.bySchool);
  currentRow = writeCountTableAD26(sheet, currentRow, 'Check-ins por campus', data.byCampus);
  currentRow = writeCountTableAD26(sheet, currentRow, 'Check-ins por carrera', data.byCareer);
  currentRow = writeCountTableAD26(sheet, currentRow, 'Check-ins por hora', data.byHour, true);
  writeRecentTableAD26(sheet, currentRow, data.recent);

  sheet.autoResizeColumns(1, 10);
  sheet.setColumnWidth(1, 330);
  sheet.setColumnWidth(4, 330);
  sheet.setColumnWidth(7, 330);
  sheet.setFrozenRows(1);
  protectWarningOnly(sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), 10), 'AD26_DASHBOARD_MANUAL');
  return data.kpis;
}

function dashboardDataAD26() {
  const population = readObjects(getSheet(AD26.SHEETS.POPULATION))
    .filter(row => toBoolean(row.activo) && clean(row.periodo).toUpperCase() === AD26.PERIOD);
  const checkins = readObjects(getSheet(AD26.SHEETS.CHECKINS))
    .filter(row => clean(row.event_id) === AD26.EVENT_ID);
  const incidents = readObjects(getSheet(AD26.SHEETS.INCIDENTS))
    .filter(row => clean(row.event_id) === AD26.EVENT_ID);
  const attempts = readObjects(getSheet(AD26.SHEETS.ATTEMPTS))
    .filter(row => clean(row.event_id) === AD26.EVENT_ID);
  const errors = readObjects(getSheet(AD26.SHEETS.ERRORS))
    .filter(row => clean(row.event_id) === AD26.EVENT_ID);

  const populationByMatricula = indexDashboardRowsAD26(population, 'matricula');
  const activeMatriculas = new Set(Object.keys(populationByMatricula));
  const digitalMatriculas = new Set();
  const digitalCounts = {};
  const attendees = {};

  checkins.forEach(row => {
    const matricula = normalizeMatricula(row.matricula);
    if (!matricula) return;
    digitalMatriculas.add(matricula);
    digitalCounts[matricula] = (digitalCounts[matricula] || 0) + 1;
    const record = enrichDashboardRecordAD26(row, populationByMatricula[matricula], 'DIGITAL');
    const current = attendees[matricula];
    if (!current || dashboardTimeAD26(record.timestamp) >= dashboardTimeAD26(current.timestamp)) {
      attendees[matricula] = record;
    }
  });

  const manualMatriculas = new Set();
  incidents.forEach(row => {
    const matricula = normalizeMatricula(row.matricula);
    if (!matricula) return;
    manualMatriculas.add(matricula);
    if (!attendees[matricula]) {
      attendees[matricula] = enrichDashboardRecordAD26(row, populationByMatricula[matricula], 'MANUAL');
    }
  });

  const records = Object.keys(attendees).map(matricula => attendees[matricula]);
  const byCommunity = countDashboardFieldAD26(records, 'comunidad', 'Sin comunidad');
  const byMentor = countDashboardFieldAD26(records, 'mentor_nombre', 'Sin mentor');
  const bySchool = countDashboardFieldAD26(records, 'escuela', 'Sin escuela');
  const byCampus = countDashboardFieldAD26(records, 'campus_origen', 'Sin campus');
  const byCareer = countDashboardFieldAD26(records, 'carrera', 'Sin carrera');
  const byHour = records.reduce((result, row) => {
    const hour = dashboardHourAD26(row.timestamp);
    result[hour] = (result[hour] || 0) + 1;
    return result;
  }, {});

  const duplicateRows = Object.keys(digitalCounts)
    .reduce((total, matricula) => total + Math.max(digitalCounts[matricula] - 1, 0), 0);
  const duplicateAttempts = attempts.filter(row => clean(row.resultado).toUpperCase() === 'DUPLICADO').length;
  const preregisteredAttended = records.filter(row => toBoolean(row.preregistrado)).length;
  const withoutMentor = records.filter(row => {
    const mentor = normalizeText(row.mentor_nombre);
    return !mentor || mentor === 'escuela de salud';
  }).length;

  return {
    kpis: {
      total: checkins.length + incidents.length,
      unique: records.length,
      pending: [...activeMatriculas].filter(matricula => !attendees[matricula]).length,
      duplicates: duplicateRows + duplicateAttempts,
      withoutMentor,
      digitalRows: checkins.length,
      digitalUnique: digitalMatriculas.size,
      manualUnique: manualMatriculas.size,
      preregisteredAttended,
      withoutPreregistration: records.length - preregisteredAttended,
      errors: errors.length
    },
    byCommunity,
    byMentor,
    bySchool,
    byCampus,
    byCareer,
    byHour,
    recent: records.slice().sort((a, b) => dashboardTimeAD26(b.timestamp) - dashboardTimeAD26(a.timestamp)).slice(0, 10)
  };
}

function enrichDashboardRecordAD26(row, population, route) {
  const source = population || {};
  return {
    timestamp: row.timestamp || source.fecha_importacion || '',
    matricula: normalizeMatricula(row.matricula || source.matricula),
    nombre: clean(row.nombre || [source.nombres, source.apellidos].filter(Boolean).join(' ')),
    comunidad: clean(source.comunidad || row.comunidad),
    mentor_nombre: clean(source.mentor_nombre || row.mentor_nombre),
    escuela: clean(source.escuela || row.escuela),
    campus_origen: clean(source.campus_origen || row.campus_origen),
    carrera: clean(source.carrera || row.carrera),
    preregistrado: Object.prototype.hasOwnProperty.call(source, 'preregistrado') ? source.preregistrado : row.preregistrado,
    route
  };
}

function writeDashboardHeaderAD26(sheet) {
  sheet.getRange('A1:J1').merge().setValue('Dashboard Campus Check-in AD26')
    .setFontWeight('bold').setFontSize(15).setHorizontalAlignment('center')
    .setBackground('#003b5c').setFontColor('#ffffff');
}

function writeKpiCardsAD26(sheet, kpi) {
  const cards = [
    { label: 'Total registros', value: kpi.total, col: 1, bg: '#d9ecff' },
    { label: 'Unicos', value: kpi.unique, col: 3, bg: '#dff7e3' },
    { label: 'Pendientes', value: kpi.pending, col: 5, bg: '#fff4d9' },
    { label: 'Duplicados', value: kpi.duplicates, col: 7, bg: '#ffe3e3' },
    { label: 'Sin mentor', value: kpi.withoutMentor, col: 9, bg: '#f4e8ff' }
  ];
  cards.forEach(card => {
    sheet.getRange(3, card.col, 1, 2).merge();
    sheet.getRange(4, card.col, 1, 2).merge();
    sheet.getRange(3, card.col).setValue(card.label).setFontWeight('bold').setHorizontalAlignment('center');
    sheet.getRange(4, card.col).setValue(card.value).setFontWeight('bold').setFontSize(16).setHorizontalAlignment('center');
    sheet.getRange(3, card.col, 2, 2).setBackground(card.bg).setBorder(true, true, true, true, false, false);
  });
}

function writeTop5TableAD26(sheet, row, col, title, sourceMap) {
  const rows = sortedDashboardCountsAD26(sourceMap).slice(0, 5);
  sheet.getRange(row, col, 1, 2).merge().setValue(title).setFontWeight('bold').setBackground('#edf2f7');
  sheet.getRange(row + 1, col, 1, 2).setValues([['Categoria', 'Total']]).setFontWeight('bold');
  sheet.getRange(row + 2, col, Math.max(rows.length, 1), 2).setValues(rows.length ? rows : [['Sin datos', 0]]);
}

function writeCountTableAD26(sheet, startRow, title, sourceMap, sortByKey) {
  const rows = sortedDashboardCountsAD26(sourceMap, sortByKey);
  sheet.getRange(startRow, 1).setValue(title).setFontWeight('bold');
  sheet.getRange(startRow + 1, 1, 1, 2).setValues([['Categoria', 'Total']]).setFontWeight('bold').setBackground('#edf2f7');
  sheet.getRange(startRow + 2, 1, Math.max(rows.length, 1), 2).setValues(rows.length ? rows : [['Sin datos', 0]]);
  return startRow + Math.max(rows.length, 1) + 4;
}

function writeRecentTableAD26(sheet, startRow, rows) {
  sheet.getRange(startRow, 1).setValue('Ultimos 10 registros').setFontWeight('bold');
  sheet.getRange(startRow + 1, 1, 1, 5)
    .setValues([['Timestamp', 'Matricula', 'Nombre', 'Mentor', 'Ruta']])
    .setFontWeight('bold').setBackground('#edf2f7');
  const values = rows.map(row => [row.timestamp, row.matricula, row.nombre, row.mentor_nombre || 'Sin mentor', row.route]);
  sheet.getRange(startRow + 2, 1, Math.max(values.length, 1), 5)
    .setValues(values.length ? values : [['Sin datos', '', '', '', '']]);
  if (values.length) sheet.getRange(startRow + 2, 1, values.length, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
}

function countDashboardFieldAD26(rows, field, fallback) {
  return rows.reduce((result, row) => {
    const key = clean(row[field]) || fallback;
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
}

function sortedDashboardCountsAD26(sourceMap, sortByKey) {
  const rows = Object.keys(sourceMap).map(key => [key, sourceMap[key]]);
  rows.sort(sortByKey
    ? (a, b) => String(a[0]).localeCompare(String(b[0]))
    : (a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
  return rows;
}

function indexDashboardRowsAD26(rows, field) {
  return rows.reduce((result, row) => {
    const key = field === 'matricula' ? normalizeMatricula(row[field]) : clean(row[field]);
    if (key) result[key] = row;
    return result;
  }, {});
}

function dashboardHourAD26(value) {
  const timestamp = dashboardTimeAD26(value);
  return timestamp ? Utilities.formatDate(new Date(timestamp), AD26.TIMEZONE, 'HH:00') : 'Sin hora';
}

function dashboardTimeAD26(value) {
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? 0 : date.getTime();
}
