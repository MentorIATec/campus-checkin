/**
 * CAMPUS CHECK-IN FJ26 - Apps Script Web App
 * Lookup seguro + registro idempotente de asistencia.
 *
 * Hojas esperadas:
 * - Asignaciones
 * - Mentores
 * - Checkins (o Respuestas si decides reutilizarla)
 */

const CHECKIN_CONFIG = {
  API_KEY: 'REEMPLAZA_ESTA_API_KEY',
  EVENT_KEY: 'FJ26',
  TIMEZONE: 'America/Mexico_City',
  ASIGNACIONES_SHEET: 'Asignaciones',
  MENTORES_SHEET: 'Mentores',
  CHECKINS_SHEET: 'Checkins',
  COLS_ASIGNACIONES: {
    MATRICULA: 1, // A
    CAMPUS_ORIGEN: 2, // B
    MENTOR_ASIGNADO: 11, // K
    NOMBRE_COMPLETO: 13, // M
    NOMBRES: 14, // N
    APELLIDOS: 15, // O
    EMAIL: 17, // Q
    CARRERA: 5 // E (ajusta si aplica)
  },
  COLS_MENTORES: {
    NOMBRE_MENTOR: 1, // A
    NICKNAME: 2, // B
    EMAIL: 4, // D
    CELULAR: 5, // E
    COMUNIDAD: 6 // F
  },
  COLS_CHECKINS: {
    CHECKIN_ID: 1, // A
    TIMESTAMP: 2, // B
    MATRICULA: 3, // C
    NOMBRE: 4, // D
    COMUNIDAD: 5, // E
    MENTOR: 6, // F
    CAMPUS: 7, // G
    CARRERA: 8, // H
    SOURCE: 9 // I
  }
};

function doPost(e) {
  try {
    const body = parseBody(e);
    if (!body || body.api_key !== CHECKIN_CONFIG.API_KEY) {
      return jsonResponse({ error: 'Acceso no autorizado' }, 401);
    }

    const action = String(body.action || 'lookup').toLowerCase();
    if (action === 'checkin') {
      return registrarCheckin(body);
    }
    if (action === 'stats') {
      return statsCheckins();
    }

    return lookupEstudiante(body);
  } catch (err) {
    return jsonResponse({ error: 'Error interno', detalle: err.message }, 500);
  }
}

function doGet(e) {
  const key = e && e.parameter ? e.parameter.key : '';
  if (key !== CHECKIN_CONFIG.API_KEY) {
    return jsonResponse({ error: 'Acceso no autorizado' }, 401);
  }

  const action = String((e && e.parameter ? e.parameter.action : '') || '').toLowerCase();
  if (action === 'stats') {
    return statsCheckins();
  }

  return jsonResponse({ ok: true }, 200);
}

function lookupEstudiante(body) {
  const matricula = String(body.matricula || '').trim().toUpperCase();
  if (!/^[A-Z]\d{8}$/.test(matricula)) {
    return jsonResponse({ error: 'Matrícula inválida' }, 400);
  }

  const ss = SpreadsheetApp.getActive();
  const asignaciones = ss.getSheetByName(CHECKIN_CONFIG.ASIGNACIONES_SHEET);
  const mentores = ss.getSheetByName(CHECKIN_CONFIG.MENTORES_SHEET);
  const checkins = ss.getSheetByName(CHECKIN_CONFIG.CHECKINS_SHEET);
  if (!asignaciones || !mentores) {
    return jsonResponse({ error: 'Hojas no encontradas' }, 500);
  }

  const row = buscarFilaPorMatricula(asignaciones, matricula);
  if (!row) {
    return jsonResponse({ error: 'Estudiante no encontrado' }, 404);
  }

  const mentorAsignado = String(row[CHECKIN_CONFIG.COLS_ASIGNACIONES.MENTOR_ASIGNADO - 1] || '').trim();
  const mentorInfo = buscarMentor(mentores, mentorAsignado);
  const fullname = String(row[CHECKIN_CONFIG.COLS_ASIGNACIONES.NOMBRE_COMPLETO - 1] || '').trim();
  const name = String(row[CHECKIN_CONFIG.COLS_ASIGNACIONES.NOMBRES - 1] || '').trim();
  const campus = String(row[CHECKIN_CONFIG.COLS_ASIGNACIONES.CAMPUS_ORIGEN - 1] || '').trim();
  const carrera = String(row[CHECKIN_CONFIG.COLS_ASIGNACIONES.CARRERA - 1] || '').trim();
  const email = String(row[CHECKIN_CONFIG.COLS_ASIGNACIONES.EMAIL - 1] || '').trim();

  const data = {
    matricula,
    fullnameEstudiante: fullname || `${name} ${String(row[CHECKIN_CONFIG.COLS_ASIGNACIONES.APELLIDOS - 1] || '').trim()}`.trim(),
    nameEstudiante: name,
    mentorFullname: mentorInfo.nombre || mentorAsignado,
    mentorNickname: mentorInfo.nickname || (mentorAsignado.split(' ')[0] || mentorAsignado),
    comunidad: mentorInfo.comunidad || '',
    campusOrigen: campus,
    carrera,
    email,
    yaRegistrado: checkins ? yaRegistrado(checkins, matricula) : false
  };

  return jsonResponse({ success: true, data }, 200);
}

function registrarCheckin(body) {
  const matricula = String(body.matricula || '').trim().toUpperCase();
  if (!/^[A-Z]\d{8}$/.test(matricula)) {
    return jsonResponse({ error: 'Matrícula inválida' }, 400);
  }

  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(CHECKIN_CONFIG.CHECKINS_SHEET);
  if (!sheet) {
    return jsonResponse({ error: 'Hoja de check-ins no encontrada' }, 500);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);

  try {
    const checkinId = `${matricula}|${CHECKIN_CONFIG.EVENT_KEY}`;
    if (yaRegistrado(sheet, matricula, checkinId)) {
      return jsonResponse({ success: true, alreadyRegistered: true }, 200);
    }

    const now = new Date();
    const timestamp = Utilities.formatDate(now, CHECKIN_CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    const row = [];
    row[CHECKIN_CONFIG.COLS_CHECKINS.CHECKIN_ID - 1] = checkinId;
    row[CHECKIN_CONFIG.COLS_CHECKINS.TIMESTAMP - 1] = timestamp;
    row[CHECKIN_CONFIG.COLS_CHECKINS.MATRICULA - 1] = matricula;
    row[CHECKIN_CONFIG.COLS_CHECKINS.NOMBRE - 1] = String(body.fullnameEstudiante || '').trim();
    row[CHECKIN_CONFIG.COLS_CHECKINS.COMUNIDAD - 1] = String(body.comunidad || '').trim();
    row[CHECKIN_CONFIG.COLS_CHECKINS.MENTOR - 1] = String(body.mentorFullname || '').trim();
    row[CHECKIN_CONFIG.COLS_CHECKINS.CAMPUS - 1] = String(body.campusOrigen || '').trim();
    row[CHECKIN_CONFIG.COLS_CHECKINS.CARRERA - 1] = String(body.carrera || '').trim();
    row[CHECKIN_CONFIG.COLS_CHECKINS.SOURCE - 1] = String(body.source || 'onsite').trim();

    sheet.appendRow(row);
    return jsonResponse({ success: true, alreadyRegistered: false, timestamp }, 200);
  } finally {
    lock.releaseLock();
  }
}

function statsCheckins() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(CHECKIN_CONFIG.CHECKINS_SHEET);
  if (!sheet) {
    return jsonResponse({ error: 'Hoja de check-ins no encontrada' }, 500);
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return jsonResponse({ checkins: 0, lastCheckinTime: '—' }, 200);
  }
  const total = lastRow - 1;
  const lastTimestamp = sheet.getRange(lastRow, CHECKIN_CONFIG.COLS_CHECKINS.TIMESTAMP).getValue();
  const formatted = lastTimestamp
    ? Utilities.formatDate(new Date(lastTimestamp), CHECKIN_CONFIG.TIMEZONE, 'HH:mm')
    : '—';
  return jsonResponse({ checkins: total, lastCheckinTime: formatted }, 200);
}

function buscarFilaPorMatricula(sheet, matricula) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < values.length; i++) {
    const value = String(values[i][CHECKIN_CONFIG.COLS_ASIGNACIONES.MATRICULA - 1] || '').trim().toUpperCase();
    if (value === matricula) {
      return values[i];
    }
  }
  return null;
}

function yaRegistrado(sheet, matricula, checkinId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const ids = sheet.getRange(2, CHECKIN_CONFIG.COLS_CHECKINS.CHECKIN_ID, lastRow - 1, 1).getValues();
  const targetId = (checkinId || '').trim();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '').trim() === targetId) {
      return true;
    }
  }
  const mats = sheet.getRange(2, CHECKIN_CONFIG.COLS_CHECKINS.MATRICULA, lastRow - 1, 1).getValues();
  const target = matricula.trim().toUpperCase();
  return mats.some(row => String(row[0] || '').trim().toUpperCase() === target);
}

function buscarMentor(sheet, mentorNombre) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};
  const rows = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  const target = normalizar(mentorNombre);
  for (let i = 0; i < rows.length; i++) {
    const nombre = String(rows[i][CHECKIN_CONFIG.COLS_MENTORES.NOMBRE_MENTOR - 1] || '').trim();
    if (normalizar(nombre) === target) {
      return {
        nombre,
        nickname: String(rows[i][CHECKIN_CONFIG.COLS_MENTORES.NICKNAME - 1] || '').trim(),
        email: String(rows[i][CHECKIN_CONFIG.COLS_MENTORES.EMAIL - 1] || '').trim(),
        celular: String(rows[i][CHECKIN_CONFIG.COLS_MENTORES.CELULAR - 1] || '').trim(),
        comunidad: String(rows[i][CHECKIN_CONFIG.COLS_MENTORES.COMUNIDAD - 1] || '').trim()
      };
    }
  }
  return {};
}

function parseBody(e) {
  if (!e || !e.postData || !e.postData.contents) return null;
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    return null;
  }
}

function normalizar(value) {
  return value
    ? value
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
    : '';
}

function jsonResponse(obj, code) {
  const payload = Object.assign({ status: code }, obj);
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
