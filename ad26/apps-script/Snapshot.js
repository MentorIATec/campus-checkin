/**
 * Fotografia controlada desde A | Preregistro AD26 hacia B | Campus Check-in AD26.
 * No se consulta el preregistro en vivo durante el evento.
 */

const AD26_SNAPSHOT = {
  SOURCE_PROPERTY: 'PREREG_SPREADSHEET_ID',
  DEFAULT_SOURCE_ID: '1jHE0OAX7EXTyo5Try8Jh5J_xwP0g_PEztxxiQBuGwZU',
  ASSIGNMENTS_SHEET: 'Asignaciones',
  RESPONSES_SHEET: 'Respuestas',
  MENTORS_SHEET: 'Datos mentor',
  ACADEMIC_SHEETS: ['Importacion_Raw_Verano26', 'Importacion_Raw_AD26'],
  TEST_MATRICULAS: ['A00000001', 'A00000002', 'A00000003']
};

// Catalogo estable para no depender de abreviaturas o de "Por clasificar" en Asignaciones.
const AD26_ACADEMIC_CATALOG = {
  AMC: ['Ambiente Construido', 'Arquitectura, Arte y Diseno'],
  ARQ: ['Arquitectura', 'Arquitectura, Arte y Diseno'],
  BA: ['Arquitectura', 'Arquitectura, Arte y Diseno'],
  BBA: ['Estrategia y Transformacion de Negocios', 'Negocios'],
  BFI: ['Finanzas', 'Negocios'],
  BGB: ['Negocios Internacionales', 'Negocios'],
  BIE: ['Ingenieria Industrial y de Sistemas', 'Ingenieria y Ciencias'],
  BME: ['Ingenieria en Mecatronica', 'Ingenieria y Ciencias'],
  CIS: ['Ciencias Sociales y Gobierno', 'Ciencias Sociales y Gobierno'],
  CPF: ['Contaduria Publica y Finanzas', 'Negocios'],
  ESC: ['Estudios Creativos', 'Arquitectura, Arte y Diseno'],
  IAG: ['Ingenieria en Biosistemas Agroalimentarios', 'Ingenieria y Ciencias'],
  IAL: ['Ingenieria en Alimentos', 'Ingenieria y Ciencias'],
  IBQ: ['Bioingenieria y Procesos Quimicos', 'Ingenieria y Ciencias'],
  IBT: ['Ingenieria en Biotecnologia', 'Ingenieria y Ciencias'],
  IC: ['Ingenieria Civil', 'Ingenieria y Ciencias'],
  ICI: ['Ingenieria - Ciencias Aplicadas', 'Ingenieria y Ciencias'],
  ICT: ['Ingenieria - Computacion y Tecnologias de Informacion', 'Ingenieria y Ciencias'],
  IDM: ['Ingenieria en Ciencia de Datos y Matematicas', 'Ingenieria y Ciencias'],
  IDS: ['Ingenieria en Desarrollo Sustentable', 'Ingenieria y Ciencias'],
  IE: ['Ingenieria en Electronica', 'Ingenieria y Ciencias'],
  IFI: ['Ingenieria en Fisica Industrial', 'Ingenieria y Ciencias'],
  IID: ['Ingenieria en Innovacion y Desarrollo', 'Ingenieria y Ciencias'],
  IIS: ['Ingenieria Industrial y de Sistemas', 'Ingenieria y Ciencias'],
  IIT: ['Ingenieria - Innovacion y Transformacion', 'Ingenieria y Ciencias'],
  IM: ['Ingenieria Mecanica', 'Ingenieria y Ciencias'],
  IMD: ['Ingenieria Biomedica', 'Ingenieria y Ciencias'],
  IMT: ['Ingenieria en Mecatronica', 'Ingenieria y Ciencias'],
  INA: ['Ingenieria en Nanotecnologia', 'Ingenieria y Ciencias'],
  ING: ['Ingenieria', 'Ingenieria y Ciencias'],
  IQ: ['Ingenieria Quimica', 'Ingenieria y Ciencias'],
  IRS: ['Ingenieria en Robotica y Sistemas Digitales', 'Ingenieria y Ciencias'],
  ITC: ['Ingenieria en Tecnologias Computacionales', 'Ingenieria y Ciencias'],
  ITD: ['Ingenieria en Transformacion Digital de Negocios', 'Ingenieria y Ciencias'],
  LAD: ['Animacion y Arte Digital', 'Arquitectura, Arte y Diseno'],
  LAE: ['Estrategia y Transformacion de Negocios', 'Negocios'],
  LAF: ['Finanzas', 'Negocios'],
  LC: ['Comunicacion', 'Humanidades, Comunicacion y Tecnologia Musical'],
  LDE: ['Emprendimiento e Innovacion', 'Negocios'],
  LDI: ['Diseno', 'Arquitectura, Arte y Diseno'],
  LDO: ['Desarrollo de Talento y Cultura Organizacional', 'Negocios'],
  LEC: ['Economia', 'Ciencias Sociales y Gobierno'],
  LED: ['Derecho', 'Ciencias Sociales y Gobierno'],
  LEI: ['Innovacion y Transformacion Educativa', 'Humanidades, Comunicacion y Tecnologia Musical'],
  LEM: ['Mercadotecnia', 'Negocios'],
  LIN: ['Negocios Internacionales', 'Negocios'],
  LIT: ['Inteligencia de Negocios', 'Negocios'],
  LLE: ['Letras y Emprendimiento Editorial', 'Humanidades, Comunicacion y Tecnologia Musical'],
  LPS: ['Psicologia Clinica y de la Salud', 'Salud'],
  LRI: ['Relaciones Internacionales', 'Ciencias Sociales y Gobierno'],
  LTM: ['Tecnologia y Produccion Musical', 'Humanidades, Comunicacion y Tecnologia Musical'],
  LUB: ['Urbanismo', 'Arquitectura, Arte y Diseno'],
  MC: ['Medico Cirujano', 'Salud'],
  NEG: ['Negocios', 'Negocios']
};

// Los nombres de archivo son parte del despliegue y no dependen de columnas editables del Sheet.
const AD26_MENTOR_PHOTOS = {
  'AD26-LPAEZ': 'LeoEkvilibro.jpg',
  'AD26-ABRIL-DE-LEON': 'AbrilEkvilibro.jpg',
  'AD26-MGFLORES': 'MarthaEkvilibro.jpg',
  'AD26-CARMENMORA': 'MariCaEkvilibro.jpg',
  'AD26-JULIANAGT': 'JulyEkvilibro.jpg',
  'AD26-MCRISTERNA': 'VinnyEnergio.jpg',
  'AD26-PAME-MTZ': 'PameEnergio.jpg',
  'AD26-RICARDO-KLEIN': 'RicardoEnergio.jpg',
  'AD26-ANTONIO-RIVERA': 'TonyEnergio.jpg',
  'AD26-ISABELDELAGARZA': 'IsaEnergio.jpg',
  'AD26-ZOE-MONTOYA': 'ZoéForta.jpg',
  'AD26-DAMARIS-MORALES': 'DámarisForta.jpg',
  'AD26-ROWLAND': 'RowlandForta.jpg',
  'AD26-ATEMOLTZI': 'ArturoForta.jpg',
  'AD26-EGARZAC': 'KikeForta.jpg',
  'AD26-JR-FLORES': 'JR Krei.jpg',
  'AD26-KARENG': 'KarenKrei.jpg',
  'AD26-KVILLARREAL': 'KarlaKrei.jpg',
  'AD26-AZUNIGA': 'AngieKrei.jpg',
  'AD26-JJFRANKLIN': 'FranklinKrei.jpg',
  'AD26-DACIA-GZZ': 'DaciaKresko.jpg',
  'AD26-ANDREA-HERRERA': 'AndreaKresko.jpg',
  'AD26-PACELIDELUCA': 'PaceliKresko.jpg',
  'AD26-ALEYDA-FERNANDEZ': 'AleydaKresko.jpg',
  'AD26-ROGER-ROSADO': 'Roger Pasio.jpg',
  'AD26-MARIANAORTEGA': 'MarianaPasio.jpg',
  'AD26-ALMA-MERCADO': 'AlmaPasio.jpg',
  'AD26-MONSERRAT-TIJERINA': 'MonsePasio.jpg',
  'AD26-ROCIOF': 'RocíoPasio.jpg',
  'AD26-CHANTAL-MAGALLANES': 'ChantalReflekto.jpg',
  'AD26-ACORREA': 'AlinnaReflekto.jpg',
  'AD26-LAURAMTZ': 'LauraReflekto.jpg',
  'AD26-ANA-PINILLA': 'AnnieReflekto.jpg',
  'AD26-ABIGAILCEPEDA': 'AbbyReflekto.jpg',
  'AD26-ERNESTO-RMZ': 'ErnestoRevo.jpg',
  'AD26-ROGELIO-RIVAS': 'Roger Revo.jpg',
  'AD26-FABBY': 'FabiRevo.jpg',
  'AD26-MMENDIOL': 'MaríaRevo.jpg',
  'AD26-MOGARCIA': 'MontseRevo.jpg',
  'AD26-DLCRUZ-JACOB': 'JacobSpirita.jpg',
  'AD26-FABIOLACAMPOSS': 'FabySpirita.jpg',
  'AD26-FERNANDAMB': 'FerSpirita.jpg',
  'AD26-CHRISTOPHER-MICHAUX': 'ChrisSpirita.jpg',
  'AD26-MAURICIONORIEGA': 'MauricioTalenta.jpg',
  'AD26-BETYCLUB': 'BetyTalenta.jpg',
  'AD26-BRENDA-R': 'BrendaTalenta.jpg',
  'AD26-LGRC': 'LauraTalenta.jpg',
  'AD26-ANAVARELA': 'AnaTalenta.jpg'
};

function configurePreregistrationSourceAD26(spreadsheetId) {
  const id = clean(spreadsheetId || AD26_SNAPSHOT.DEFAULT_SOURCE_ID);
  if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) throw new Error('Spreadsheet ID de preregistro invalido');
  PropertiesService.getScriptProperties().setProperty(AD26_SNAPSHOT.SOURCE_PROPERTY, id);
  return { ok: true, prereg_spreadsheet_id: id };
}

function previewPreregistrationSnapshotAD26() {
  const snapshot = buildPreregistrationSnapshotAD26();
  const result = {
    ok: snapshot.duplicates.length === 0,
    estudiantes: snapshot.population.length,
    mentores: snapshot.mentors.length,
    respuestas: snapshot.responseCount,
    preregistro_si: snapshot.yesCount,
    preregistro_no: snapshot.noCount,
    sin_respuesta: snapshot.pendingCount,
    salud: snapshot.healthCount,
    fotos_configuradas: snapshot.photoCount,
    mentores_sin_foto: snapshot.mentorsWithoutPhoto,
    cruces_academicos: snapshot.academicMatchedCount,
    sin_cruce_academico: snapshot.academicUnmatched,
    escuelas_por_clasificar: snapshot.unclassifiedSchools,
    registros_fuente_sin_asignacion: snapshot.rawWithoutAssignmentCount,
    duplicados: snapshot.duplicates
  };
  console.log(JSON.stringify(result));
  SpreadsheetApp.getUi().alert(
    'Previsualizacion AD26',
    `Estudiantes: ${result.estudiantes}\nMentores: ${result.mentores}\nRespuestas: ${result.respuestas}\nSI: ${result.preregistro_si}\nNO: ${result.preregistro_no}\nSin respuesta: ${result.sin_respuesta}\nSalud: ${result.salud}\nCruces academicos: ${result.cruces_academicos}\nSin cruce academico: ${result.sin_cruce_academico.length}\nEscuelas por clasificar: ${result.escuelas_por_clasificar.length}\nRegistros fuente sin asignacion: ${result.registros_fuente_sin_asignacion}\nFotos configuradas: ${result.fotos_configuradas}\nMentores sin foto: ${result.mentores_sin_foto.length}\nDuplicados: ${result.duplicados.length}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return result;
}

function importPreregistrationSnapshotAD26() {
  const snapshot = buildPreregistrationSnapshotAD26();
  if (snapshot.duplicates.length) {
    throw new Error(`Importacion bloqueada: matriculas duplicadas (${snapshot.duplicates.slice(0, 10).join(', ')})`);
  }

  const ui = SpreadsheetApp.getUi();
  const confirmation = ui.alert(
    'Importar fotografia AD26',
    `Se reemplazaran Poblacion_AD26 y Mentores_AD26 con ${snapshot.population.length} estudiantes y ${snapshot.mentors.length} mentores. No se modificaran check-ins ni incidencias.`,
    ui.ButtonSet.OK_CANCEL
  );
  if (confirmation !== ui.Button.OK) return { ok: false, cancelled: true };

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Otra importacion esta en curso');
  try {
    replaceSheetRowsAD26(getSheet(AD26.SHEETS.POPULATION), snapshot.population);
    replaceSheetRowsAD26(getSheet(AD26.SHEETS.MENTORS), snapshot.mentors);
    PropertiesService.getScriptProperties().setProperty('POPULATION_CACHE_VERSION', String(Date.now()));
    return {
      ok: true,
      estudiantes: snapshot.population.length,
      mentores: snapshot.mentors.length,
      fecha_importacion: formatTimestamp(new Date())
    };
  } finally {
    lock.releaseLock();
  }
}

function buildPreregistrationSnapshotAD26() {
  const sourceId = getRequiredProperty(AD26_SNAPSHOT.SOURCE_PROPERTY);
  const source = SpreadsheetApp.openById(sourceId);
  const assignments = readSnapshotObjectsAD26(source, AD26_SNAPSHOT.ASSIGNMENTS_SHEET);
  const responses = readSnapshotObjectsAD26(source, AD26_SNAPSHOT.RESPONSES_SHEET);
  const sourceMentors = readSnapshotObjectsAD26(source, AD26_SNAPSHOT.MENTORS_SHEET);
  const academicIndex = buildAcademicIndexAD26(source);
  const existingMentors = readObjects(getSheet(AD26.SHEETS.MENTORS));
  const existingById = indexByAD26(existingMentors, 'mentor_id');
  const latestResponses = latestResponsesByMatriculaAD26(responses);
  const seen = new Set();
  const duplicates = [];
  const importedAt = new Date();

  const population = assignments
    .filter(row => toBoolean(row.activo) && clean(row.periodo).toUpperCase() === AD26.PERIOD)
    .filter(row => !isTestAssignmentAD26(row))
    .map(row => {
      const matricula = normalizeMatricula(row.matricula);
      if (seen.has(matricula)) duplicates.push(matricula);
      seen.add(matricula);

      const response = latestResponses[matricula] || null;
      const answer = response ? clean(response.asistira).toUpperCase() : 'SIN RESPUESTA';
      const academic = academicIndex.byMatricula[matricula] || {};
      const careerCode = clean(academic.careerCode || row.carrera).toUpperCase();
      const catalog = AD26_ACADEMIC_CATALOG[careerCode] || [];
      const careerName = clean(catalog[0] || academic.careerName || row.nombre_carrera || careerCode);
      const existingSchool = clean(row.escuela);
      const school = clean(catalog[1] || academic.school || (!isUnclassifiedSchoolAD26(existingSchool) ? existingSchool : '')) || 'Por clasificar';
      const mentorId = clean(row.mentor_id);
      const currentMentor = existingById[mentorId] || {};
      const health = isHealthAssignmentAD26(row) || normalizeText(school) === 'salud';

      return {
        matricula,
        nombres: clean(row.nombres),
        apellidos: clean(row.apellidos),
        email: clean(row.email),
        campus_origen: clean(row.campus_origen),
        escuela: school,
        carrera: careerName,
        siglas_carrera: careerCode,
        tipo_poblacion: health ? 'SALUD' : clean(row.tipo_poblacion || 'MENTORIA'),
        mentor_id: health ? '' : mentorId,
        mentor_nombre: health ? 'Escuela de Salud' : clean(row.mentor_nombre),
        comunidad: health ? 'Comunidades Academicas' : clean(row.comunidad),
        foto_mentor: health ? 'Salud.jpg' : mentorPhotoAD26(mentorId, currentMentor.foto_mentor),
        preregistrado: !!response,
        respuesta_preregistro: answer,
        fecha_preregistro: response ? response.timestamp : '',
        activo: true,
        periodo: AD26.PERIOD,
        fecha_importacion: importedAt
      };
    });

  const mentors = sourceMentors
    .filter(row => toBoolean(row.activo))
    .filter(row => !clean(row.mentor_id).toUpperCase().startsWith('TEST'))
    .map(row => {
      const mentorId = clean(row.mentor_id);
      const current = existingById[mentorId] || {};
      return {
        mentor_id: mentorId,
        nombre: clean(row.nombre),
        nombre_mostrar: clean(row.nombre_mostrar || row.nombre),
        nickname: clean(row.nickname),
        foto_mentor: mentorPhotoAD26(mentorId, current.foto_mentor),
        email: clean(row.email),
        celular: clean(row.celular),
        comunidad: clean(row.comunidad),
        instagram: clean(current.instagram),
        verificado_institucional: toBoolean(current.verificado_institucional)
      };
    });

  const populationMatriculas = new Set(population.map(row => row.matricula));
  return {
    population,
    mentors,
    duplicates: [...new Set(duplicates)],
    responseCount: population.filter(row => row.preregistrado).length,
    yesCount: population.filter(row => normalizeText(row.respuesta_preregistro) === 'si').length,
    noCount: population.filter(row => normalizeText(row.respuesta_preregistro) === 'no').length,
    pendingCount: population.filter(row => !row.preregistrado).length,
    healthCount: population.filter(row => row.tipo_poblacion === 'SALUD').length,
    photoCount: mentors.filter(row => row.foto_mentor).length,
    mentorsWithoutPhoto: mentors.filter(row => !row.foto_mentor).map(row => row.mentor_id),
    academicMatchedCount: population.filter(row => academicIndex.byMatricula[row.matricula]).length,
    academicUnmatched: population.filter(row => !academicIndex.byMatricula[row.matricula]).map(row => row.matricula),
    unclassifiedSchools: population.filter(row => isUnclassifiedSchoolAD26(row.escuela)).map(row => row.matricula),
    rawWithoutAssignmentCount: Object.keys(academicIndex.byMatricula).filter(matricula => !populationMatriculas.has(matricula)).length
  };
}

function buildAcademicIndexAD26(source) {
  const byMatricula = {};
  AD26_SNAPSHOT.ACADEMIC_SHEETS.forEach(sheetName => {
    readOptionalSnapshotObjectsAD26(source, sheetName).forEach(row => {
      const matricula = normalizeMatricula(row.matricula);
      if (!isValidMatricula(matricula)) return;
      const careerCode = clean(row.carrera).toUpperCase();
      const catalog = AD26_ACADEMIC_CATALOG[careerCode] || [];
      byMatricula[matricula] = {
        careerCode,
        careerName: clean(catalog[0] || row.nombre_carrera),
        school: clean(catalog[1])
      };
    });
  });
  return { byMatricula };
}

function readOptionalSnapshotObjectsAD26(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  return sheet ? readSnapshotObjectsAD26(spreadsheet, sheetName) : [];
}

function isUnclassifiedSchoolAD26(value) {
  const normalized = normalizeText(value);
  return !normalized || normalized === 'por clasificar' || normalized === 'sin clasificar';
}

function mentorPhotoAD26(mentorId, currentPhoto) {
  return clean(AD26_MENTOR_PHOTOS[clean(mentorId)] || currentPhoto);
}

function readSnapshotObjectsAD26(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error(`No existe la hoja fuente ${sheetName}`);
  if (sheet.getLastRow() < 2) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(snapshotHeaderAD26);
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues()
    .map(row => rowToObject(row, headers));
}

function latestResponsesByMatriculaAD26(rows) {
  return rows.reduce((result, row) => {
    if (clean(row.event_id) !== AD26.EVENT_ID) return result;
    const matricula = normalizeMatricula(row.matricula);
    if (!isValidMatricula(matricula)) return result;
    const current = result[matricula];
    if (!current || snapshotTimeAD26(row.timestamp) >= snapshotTimeAD26(current.timestamp)) {
      result[matricula] = row;
    }
    return result;
  }, {});
}

function replaceSheetRowsAD26(sheet, objects) {
  const headers = getHeaders(sheet);
  if (!headers.length) throw new Error(`La hoja ${sheet.getName()} no tiene encabezados`);
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }
  if (!objects.length) return;
  const values = objects.map(object => headers.map(header => Object.prototype.hasOwnProperty.call(object, header) ? object[header] : ''));
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}

function indexByAD26(rows, key) {
  return rows.reduce((result, row) => {
    const value = clean(row[key]);
    if (value) result[value] = row;
    return result;
  }, {});
}

function isTestAssignmentAD26(row) {
  const matricula = normalizeMatricula(row.matricula);
  return AD26_SNAPSHOT.TEST_MATRICULAS.includes(matricula) || clean(row.mentor_id).toUpperCase().startsWith('TEST');
}

function isHealthAssignmentAD26(row) {
  return clean(row.tipo_poblacion).toUpperCase() === 'SALUD'
    || normalizeText(row.escuela).includes('salud')
    || normalizeText(row.mentor_nombre) === 'escuela de salud';
}

function snapshotHeaderAD26(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function snapshotTimeAD26(value) {
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? 0 : date.getTime();
}
