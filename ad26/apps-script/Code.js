/**
 * Campus Check-in AD26 - Web App
 * Lookup privado y check-in idempotente.
 *
 * Script Properties requeridas:
 * - CHECKIN_API_KEY
 * - CHECKIN_SPREADSHEET_ID
 */

const AD26 = {
  EVENT_ID: 'bienvenida-transferencias-ad26',
  PERIOD: 'AD26',
  TIMEZONE: 'America/Monterrey',
  SHEETS: {
    POPULATION: 'Poblacion_AD26',
    MENTORS: 'Mentores_AD26',
    CHECKINS: 'Checkins_AD26',
    INCIDENTS: 'Incidencias_AD26',
    ATTEMPTS: 'Intentos_AD26',
    ERRORS: 'Errores_AD26'
  }
};

function doPost(e) {
  let body = null;
  try {
    body = parseJsonBody(e);
    if (!body || !secureEquals(String(body.api_key || ''), getRequiredProperty('CHECKIN_API_KEY'))) {
      return jsonResponse({ error: 'Acceso no autorizado' }, 401);
    }

    const action = String(body.action || 'lookup').toLowerCase();
    if (action === 'lookup') return lookupStudent(body);
    if (action === 'checkin') return registerCheckin(body);
    if (action === 'stats') return getStats();
    return jsonResponse({ error: 'Accion no soportada' }, 400);
  } catch (error) {
    console.error(error);
    tryLogError(body, error);
    return jsonResponse({ error: 'Error interno' }, 500);
  }
}

function doGet(e) {
  try {
    const key = e && e.parameter ? String(e.parameter.key || '') : '';
    if (!secureEquals(key, getRequiredProperty('CHECKIN_API_KEY'))) {
      return jsonResponse({ error: 'Acceso no autorizado' }, 401);
    }
    return jsonResponse({ ok: true, event_id: AD26.EVENT_ID }, 200);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: 'Error interno' }, 500);
  }
}

function lookupStudent(body) {
  const matricula = normalizeMatricula(body.matricula);
  if (!isValidMatricula(matricula)) return jsonResponse({ error: 'Matricula invalida' }, 400);

  const student = resolveStudent(matricula);
  if (!student) return jsonResponse({ error: 'Estudiante no encontrado' }, 404);

  student.yaRegistrado = checkinExists(getSheet(AD26.SHEETS.CHECKINS), buildCheckinId(matricula));
  return jsonResponse({ success: true, data: student }, 200);
}

function registerCheckin(body) {
  const matricula = normalizeMatricula(body.matricula);
  if (!isValidMatricula(matricula)) return jsonResponse({ error: 'Matricula invalida' }, 400);

  // La identidad se resuelve antes del lock; el navegador no controla estos campos.
  const student = resolveStudent(matricula);
  if (!student) return jsonResponse({ error: 'Estudiante no encontrado' }, 404);

  const sheet = getSheet(AD26.SHEETS.CHECKINS);
  const checkinId = buildCheckinId(matricula);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(7000)) return jsonResponse({ error: 'Registro ocupado' }, 503);

  try {
    if (checkinExists(sheet, checkinId)) {
      appendAttempt(matricula, 'DUPLICADO', 'AUTOSERVICIO', '', String(body.source || 'AUTOSERVICIO'));
      return jsonResponse({ success: true, alreadyRegistered: true, data: student }, 200);
    }

    const timestamp = new Date();
    appendObject(sheet, {
      checkin_id: checkinId,
      event_id: AD26.EVENT_ID,
      timestamp,
      matricula,
      nombre: student.fullnameEstudiante,
      campus_origen: student.campusOrigen,
      escuela: student.escuela,
      mentor_id: student.mentorId,
      mentor_nombre: student.mentorFullname,
      comunidad: student.comunidad,
      preregistrado: student.preregistrado,
      respuesta_preregistro: student.respuestaPreregistro,
      en_padron_original: true,
      ruta_registro: 'AUTOSERVICIO',
      staff_id: '',
      source: String(body.source || 'AUTOSERVICIO')
    });

    return jsonResponse({
      success: true,
      alreadyRegistered: false,
      timestamp: formatTimestamp(timestamp),
      data: student
    }, 200);
  } finally {
    lock.releaseLock();
  }
}

function appendAttempt(matricula, result, route, staffId, source) {
  const timestamp = new Date();
  appendObject(getSheet(AD26.SHEETS.ATTEMPTS), {
    attempt_id: `${AD26.EVENT_ID}|${matricula}|${timestamp.getTime()}`,
    event_id: AD26.EVENT_ID,
    timestamp,
    matricula,
    resultado: result,
    ruta_registro: route,
    staff_id: staffId,
    source
  });
}

function tryLogError(body, error) {
  try {
    const timestamp = new Date();
    appendObject(getSheet(AD26.SHEETS.ERRORS), {
      error_id: `${AD26.EVENT_ID}|${timestamp.getTime()}`,
      event_id: AD26.EVENT_ID,
      timestamp,
      accion: clean(body && body.action),
      matricula: normalizeMatricula(body && body.matricula),
      mensaje: clean(error && error.message).slice(0, 500)
    });
  } catch (loggingError) {
    console.error('No fue posible escribir Errores_AD26', loggingError);
  }
}

function getStats() {
  const rows = readObjects(getSheet(AD26.SHEETS.CHECKINS))
    .filter(row => clean(row.event_id) === AD26.EVENT_ID);
  const manualRows = readObjects(getSheet(AD26.SHEETS.INCIDENTS))
    .filter(row => clean(row.event_id) === AD26.EVENT_ID);
  const unique = new Set();
  let lastTimestamp = null;

  rows.forEach(row => {
    const matricula = normalizeMatricula(row.matricula);
    if (matricula) unique.add(matricula);
    const date = row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp);
    if (!isNaN(date.getTime()) && (!lastTimestamp || date > lastTimestamp)) lastTimestamp = date;
  });
  manualRows.forEach(row => {
    const matricula = normalizeMatricula(row.matricula);
    if (matricula) unique.add(matricula);
  });

  return jsonResponse({
    checkins: unique.size,
    digitalCheckins: new Set(rows.map(row => normalizeMatricula(row.matricula)).filter(Boolean)).size,
    manualCheckins: new Set(manualRows.map(row => normalizeMatricula(row.matricula)).filter(Boolean)).size,
    lastCheckinTime: lastTimestamp ? Utilities.formatDate(lastTimestamp, AD26.TIMEZONE, 'HH:mm') : '—'
  }, 200);
}

function resolveStudent(matricula) {
  const populationSheet = getSheet(AD26.SHEETS.POPULATION);
  const populationRow = findObjectByValue(populationSheet, 'matricula', matricula);
  if (!populationRow) return null;
  if (!toBoolean(populationRow.activo) || clean(populationRow.periodo).toUpperCase() !== AD26.PERIOD) return null;

  const mentorId = clean(populationRow.mentor_id);
  const mentorRow = mentorId
    ? findObjectByValue(getSheet(AD26.SHEETS.MENTORS), 'mentor_id', mentorId)
    : null;

  const school = clean(populationRow.escuela);
  const populationType = clean(populationRow.tipo_poblacion).toUpperCase();
  const rawMentorName = clean(populationRow.mentor_nombre || (mentorRow && mentorRow.nombre));
  const isHealth = populationType === 'SALUD' || normalizeText(school).includes('salud') || normalizeText(rawMentorName) === 'escuela de salud';

  const names = clean(populationRow.nombres);
  const lastnames = clean(populationRow.apellidos);
  const mentorName = isHealth ? 'Escuela de Salud' : clean((mentorRow && (mentorRow.nombre_mostrar || mentorRow.nombre)) || rawMentorName);
  const community = isHealth
    ? 'Comunidades Academicas'
    : clean(populationRow.comunidad || (mentorRow && mentorRow.comunidad));
  const photo = isHealth ? 'Salud.jpg' : clean(populationRow.foto_mentor || (mentorRow && mentorRow.foto_mentor));

  return {
    matricula,
    nameEstudiante: names,
    fullnameEstudiante: [names, lastnames].filter(Boolean).join(' ').trim() || clean(populationRow.nombre),
    campusOrigen: clean(populationRow.campus_origen),
    escuela: school,
    carrera: clean(populationRow.carrera),
    tipoPoblacion: isHealth ? 'SALUD' : (populationType || 'MENTORIA'),
    mentorId: isHealth ? '' : mentorId,
    mentorFullname: mentorName,
    mentorNickname: isHealth ? '' : clean(mentorRow && mentorRow.nickname),
    fotoMentor: photo ? `/mentores/${photo.replace(/^\/+/, '')}` : '',
    comunidad: community,
    noMentorAsignado: isHealth,
    preregistrado: toBoolean(populationRow.preregistrado),
    respuestaPreregistro: clean(populationRow.respuesta_preregistro || 'SIN RESPUESTA')
  };
}

function buildCheckinId(matricula) {
  return `${matricula}|${AD26.EVENT_ID}`;
}

function checkinExists(sheet, checkinId) {
  const headers = getHeaderMap(sheet);
  const column = headers.checkin_id;
  if (!column || sheet.getLastRow() < 2) return false;
  const match = sheet
    .getRange(2, column, sheet.getLastRow() - 1, 1)
    .createTextFinder(checkinId)
    .matchEntireCell(true)
    .findNext();
  return !!match;
}

function findObjectByValue(sheet, header, value) {
  const headers = getHeaderMap(sheet);
  const column = headers[header];
  if (!column || sheet.getLastRow() < 2) return null;
  const match = sheet
    .getRange(2, column, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(value))
    .matchCase(false)
    .matchEntireCell(true)
    .findNext();
  if (!match) return null;
  return rowToObject(sheet.getRange(match.getRow(), 1, 1, sheet.getLastColumn()).getValues()[0], getHeaders(sheet));
}

function appendObject(sheet, object) {
  const headers = getHeaders(sheet);
  if (!headers.length) throw new Error(`La hoja ${sheet.getName()} no tiene encabezados`);
  const row = headers.map(header => Object.prototype.hasOwnProperty.call(object, header) ? object[header] : '');
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
}

function readObjects(sheet) {
  if (sheet.getLastRow() < 2) return [];
  const headers = getHeaders(sheet);
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues().map(row => rowToObject(row, headers));
}

function rowToObject(row, headers) {
  return headers.reduce((result, header, index) => {
    result[header] = row[index];
    return result;
  }, {});
}

function getHeaders(sheet) {
  if (sheet.getLastColumn() < 1) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(value => clean(value));
}

function getHeaderMap(sheet) {
  return getHeaders(sheet).reduce((result, header, index) => {
    if (header) result[header] = index + 1;
    return result;
  }, {});
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(getRequiredProperty('CHECKIN_SPREADSHEET_ID'));
}

function getSheet(name) {
  const sheet = getSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error(`No existe la hoja ${name}`);
  return sheet;
}

function getRequiredProperty(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw new Error(`Falta Script Property ${name}`);
  return value;
}

function parseJsonBody(e) {
  if (!e || !e.postData || !e.postData.contents) return null;
  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    return null;
  }
}

function normalizeMatricula(value) {
  return clean(value).toUpperCase();
}

function isValidMatricula(value) {
  return /^[A-Z]\d{8}$/.test(value);
}

function normalizeText(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function toBoolean(value) {
  if (value === true) return true;
  return ['TRUE', 'SI', 'SÍ', '1'].includes(clean(value).toUpperCase());
}

function secureEquals(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

function formatTimestamp(date) {
  return Utilities.formatDate(date, AD26.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

function jsonResponse(object, status) {
  return ContentService
    .createTextOutput(JSON.stringify(Object.assign({ status }, object)))
    .setMimeType(ContentService.MimeType.JSON);
}
