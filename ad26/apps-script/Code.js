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

const AD26_RUNTIME = {
  spreadsheet: null,
  headers: {},
  headerMaps: {}
};

const AD26_POPULATION_CACHE = {
  SHARDS: 16,
  TTL_SECONDS: 21600,
  MAX_SHARD_BYTES: 90000,
  PREFIX: 'population-index'
};

function doPost(e) {
  let body = null;
  try {
    resetRuntimeCaches();
    body = parseJsonBody(e);
    if (!body || !secureEquals(String(body.api_key || ''), getRequiredProperty('CHECKIN_API_KEY'))) {
      return jsonResponse({ error: 'Acceso no autorizado' }, 401);
    }

    const action = String(body.action || 'lookup').toLowerCase();
    if (action === 'lookup') return lookupStudent(body);
    if (action === 'checkin') return registerCheckin(body);
    if (action === 'stats') return getStats();
    if (action === 'warmcache') return jsonResponse({ success: true, data: rebuildPopulationCacheAD26() }, 200);
    return jsonResponse({ error: 'Accion no soportada' }, 400);
  } catch (error) {
    console.error(error);
    tryLogError(body, error);
    return jsonResponse({ error: 'Error interno' }, 500);
  }
}

function doGet(e) {
  try {
    resetRuntimeCaches();
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
  if (!lock.tryLock(2500)) return jsonResponse({ error: 'Registro ocupado' }, 503);

  let alreadyRegistered = false;
  let timestamp = null;
  try {
    if (checkinExists(sheet, checkinId)) {
      alreadyRegistered = true;
    } else {
      timestamp = new Date();
      appendObject(sheet, {
        checkin_id: checkinId,
        event_id: AD26.EVENT_ID,
        timestamp,
        matricula,
        nombre: student.fullnameEstudiante,
        campus_origen: student.campusOrigen,
        escuela: student.escuela,
        carrera: student.carrera,
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
      markCheckinExists(checkinId);
    }
  } finally {
    lock.releaseLock();
  }

  if (alreadyRegistered) {
    // Duplicate telemetry must not extend the critical section for new check-ins.
    appendAttempt(matricula, 'DUPLICADO', 'AUTOSERVICIO', '', String(body.source || 'AUTOSERVICIO'));
    return jsonResponse({ success: true, alreadyRegistered: true, data: student }, 200);
  }

  return jsonResponse({
    success: true,
    alreadyRegistered: false,
    timestamp: formatTimestamp(timestamp),
    data: student
  }, 200);
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
  const indexed = readStudentFromPopulationIndex(matricula);
  if (indexed.available) return indexed.student;

  // Fallback seguro si Google expulsa un shard antes de su TTL sugerido.
  const studentCache = CacheService.getScriptCache();
  const studentCacheKey = `student:${AD26.EVENT_ID}:${getPopulationCacheVersion()}:${matricula}`;
  const cachedStudent = studentCache.get(studentCacheKey);
  if (cachedStudent) {
    try {
      return JSON.parse(cachedStudent);
    } catch (error) {
      console.warn('Cache de estudiante invalido', error);
    }
  }

  const populationSheet = getSheet(AD26.SHEETS.POPULATION);
  const populationRow = findObjectByValue(populationSheet, 'matricula', matricula);
  if (!populationRow) return null;
  if (!toBoolean(populationRow.activo) || clean(populationRow.periodo).toUpperCase() !== AD26.PERIOD) return null;

  const mentorId = clean(populationRow.mentor_id);
  const mentorRow = mentorId
    ? findObjectByValue(getSheet(AD26.SHEETS.MENTORS), 'mentor_id', mentorId)
    : null;

  const student = buildStudentAD26(matricula, populationRow, mentorRow);
  studentCache.put(studentCacheKey, JSON.stringify(student), 3600);
  return student;
}

function buildStudentAD26(matricula, populationRow, mentorRow) {
  mentorRow = mentorRow || null;

  const mentorId = clean(populationRow.mentor_id);
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

  const student = {
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
  return student;
}

function readStudentFromPopulationIndex(matricula) {
  const cache = CacheService.getScriptCache();
  const key = populationShardKeyAD26(getPopulationCacheVersion(), populationShardAD26(matricula));
  const raw = cache.get(key);
  if (!raw) return { available: false, student: null };

  try {
    const shard = JSON.parse(raw);
    return {
      available: true,
      student: Object.prototype.hasOwnProperty.call(shard, matricula) ? shard[matricula] : null
    };
  } catch (error) {
    console.warn('Shard de poblacion invalido', error);
    cache.remove(key);
    return { available: false, student: null };
  }
}

function prewarmPopulationCacheAD26() {
  const result = rebuildPopulationCacheAD26();
  try {
    SpreadsheetApp.getUi().alert(
      'Cache AD26 preparado',
      `Estudiantes: ${result.students}\nShards: ${result.shards}\nShard mayor: ${result.largest_shard_bytes} bytes\nVigencia maxima sugerida: 6 horas`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (error) {
    console.log('Cache AD26 preparado', JSON.stringify(result));
  }
  return result;
}

function rebuildPopulationCacheAD26() {
  resetRuntimeCaches();
  const populationRows = readObjects(getSheet(AD26.SHEETS.POPULATION));
  const mentorRows = readObjects(getSheet(AD26.SHEETS.MENTORS));
  const mentorsById = mentorRows.reduce((result, row) => {
    const mentorId = clean(row.mentor_id);
    if (mentorId) result[mentorId] = row;
    return result;
  }, {});
  const shards = Array.from({ length: AD26_POPULATION_CACHE.SHARDS }, () => ({}));
  let students = 0;

  populationRows.forEach(row => {
    const matricula = normalizeMatricula(row.matricula);
    if (!isValidMatricula(matricula)) return;
    if (!toBoolean(row.activo) || clean(row.periodo).toUpperCase() !== AD26.PERIOD) return;
    const mentorId = clean(row.mentor_id);
    shards[populationShardAD26(matricula)][matricula] = buildStudentAD26(
      matricula,
      row,
      mentorId ? mentorsById[mentorId] : null
    );
    students += 1;
  });

  const version = getPopulationCacheVersion();
  const values = {};
  let largestShardBytes = 0;
  shards.forEach((shard, index) => {
    const serialized = JSON.stringify(shard);
    const bytes = Utilities.newBlob(serialized).getBytes().length;
    if (bytes > AD26_POPULATION_CACHE.MAX_SHARD_BYTES) {
      throw new Error(`Shard ${index} excede el limite seguro (${bytes} bytes)`);
    }
    largestShardBytes = Math.max(largestShardBytes, bytes);
    values[populationShardKeyAD26(version, index)] = serialized;
  });

  CacheService.getScriptCache().putAll(values, AD26_POPULATION_CACHE.TTL_SECONDS);
  return {
    ok: true,
    students,
    shards: AD26_POPULATION_CACHE.SHARDS,
    largest_shard_bytes: largestShardBytes,
    cache_version: version
  };
}

function populationShardAD26(matricula) {
  let hash = 0;
  for (let index = 0; index < matricula.length; index += 1) {
    hash = ((hash * 31) + matricula.charCodeAt(index)) >>> 0;
  }
  return hash % AD26_POPULATION_CACHE.SHARDS;
}

function populationShardKeyAD26(version, shard) {
  return `${AD26_POPULATION_CACHE.PREFIX}:${AD26.EVENT_ID}:${version}:${shard}`;
}

function buildCheckinId(matricula) {
  return `${matricula}|${AD26.EVENT_ID}`;
}

function checkinExists(sheet, checkinId) {
  const cache = CacheService.getScriptCache();
  const cacheKey = `checkin:${checkinId}`;
  if (cache.get(cacheKey) === '1') return true;

  const headers = getHeaderMap(sheet);
  const column = headers.checkin_id;
  const lastRow = sheet.getLastRow();
  if (!column || lastRow < 2) return false;
  const match = sheet
    .getRange(2, column, lastRow - 1, 1)
    .createTextFinder(checkinId)
    .matchEntireCell(true)
    .findNext();
  if (match) cache.put(cacheKey, '1', 21600);
  return !!match;
}

function markCheckinExists(checkinId) {
  CacheService.getScriptCache().put(`checkin:${checkinId}`, '1', 21600);
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
  const cacheKey = String(sheet.getSheetId());
  if (AD26_RUNTIME.headers[cacheKey]) return AD26_RUNTIME.headers[cacheKey];
  const lastColumn = sheet.getLastColumn();
  const headers = lastColumn < 1
    ? []
    : sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(value => clean(value));
  AD26_RUNTIME.headers[cacheKey] = headers;
  return headers;
}

function getHeaderMap(sheet) {
  const cacheKey = String(sheet.getSheetId());
  if (AD26_RUNTIME.headerMaps[cacheKey]) return AD26_RUNTIME.headerMaps[cacheKey];
  const headerMap = getHeaders(sheet).reduce((result, header, index) => {
    if (header) result[header] = index + 1;
    return result;
  }, {});
  AD26_RUNTIME.headerMaps[cacheKey] = headerMap;
  return headerMap;
}

function getSpreadsheet() {
  if (!AD26_RUNTIME.spreadsheet) {
    AD26_RUNTIME.spreadsheet = SpreadsheetApp.openById(getRequiredProperty('CHECKIN_SPREADSHEET_ID'));
  }
  return AD26_RUNTIME.spreadsheet;
}

function resetRuntimeCaches() {
  AD26_RUNTIME.spreadsheet = null;
  AD26_RUNTIME.headers = {};
  AD26_RUNTIME.headerMaps = {};
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

function getPopulationCacheVersion() {
  return PropertiesService.getScriptProperties().getProperty('POPULATION_CACHE_VERSION') || 'initial';
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
