/**
 * CAMPUS CHECK-IN FJ26 - Setup de Google Sheets
 * Crea hojas y headers mínimos.
 */

const SETUP_CONFIG = {
  ASIGNACIONES_SHEET: 'Asignaciones',
  MENTORES_SHEET: 'Mentores',
  CHECKINS_SHEET: 'Checkins',
  HEADERS: {
    ASIGNACIONES: [
      'Matricula',
      'Campus origen',
      'Campus destino',
      'Area de exploracion',
      'Carrera',
      'Periodo',
      'Tipo',
      'Comentario',
      'Ya habia est?',
      'Mentor(a) asignado(a) previamente',
      'Mentor(a) Asignado(a) FJ26',
      'Comentarios',
      'Nombre_completo',
      'Nombres',
      'Apellidos',
      'Siglas',
      'email',
      'Motivo_categoria',
      'Columna 1'
    ],
    MENTORES: [
      'Mentor(a)',
      'Nickname',
      'Email',
      'Celular',
      'Comunidad'
    ],
    CHECKINS: [
      'checkinId',
      'timestamp',
      'matricula',
      'nombre',
      'comunidad',
      'mentor',
      'campus',
      'carrera',
      'source'
    ]
  }
};

function setupSheets() {
  const ss = SpreadsheetApp.getActive();
  crearOResetSheet(ss, SETUP_CONFIG.ASIGNACIONES_SHEET, SETUP_CONFIG.HEADERS.ASIGNACIONES);
  crearOResetSheet(ss, SETUP_CONFIG.MENTORES_SHEET, SETUP_CONFIG.HEADERS.MENTORES);
  crearOResetSheet(ss, SETUP_CONFIG.CHECKINS_SHEET, SETUP_CONFIG.HEADERS.CHECKINS);
}

function crearOResetSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  } else {
    sheet.clear();
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}
