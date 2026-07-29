/**
 * @OnlyCurrentDoc
 */

// Nombres de las hojas de cálculo utilizadas en el proyecto.
const STUDENTS_SHEET_NAME = "Estudiantes";
const RESPONSES_SHEET_NAME = "Respuestas";
const MENTORS_SHEET_NAME = "Mentores";
const DASHBOARD_SHEET_NAME = "Dashboard";

// Índices de las columnas en la hoja "Estudiantes" (basado en 1 para facilitar la lectura).
const COL = {
    MATRICULA: 1,
    NOMBRE: 2,
    EMAIL: 3,
    ID_UNICO: 4,
    ENLACE: 5,
    ESTADO: 6,
    MENTOR_NOMBRE: 7,
    COMUNIDAD: 8,
    FECHA_INVITACION: 9,
    FECHA_RECORDATORIO: 10,
    FECHA_COMPLETADO: 11,
};

const COL_MENTORES = {
    NOMBRE: 1,
    NICKNAME: 2,
    FOTO: 3,
    EMAIL: 4,
    CELULAR: 5,
    COMUNIDAD: 6,
    INSTAGRAM: 7
};

/**
 * Se ejecuta cuando se abre la hoja de cálculo y agrega el menú personalizado.
 */
function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu('Campaña de Encuesta')
        .addItem('1. Generar Enlaces Personalizados', 'generatePersonalizedLinks')
        .addSeparator()
        .addItem('2. Enviar Correo de Invitación', 'sendInitialEmails')
        .addItem('3. Enviar Recordatorios a Pendientes', 'sendReminderEmails')
        .addSeparator()
        .addItem('4. Crear Dashboard', 'crearDashboard')
        .addToUi();
}

/**
 * Sirve la aplicación web.
 */
function doGet(e) {
    const studentId = e.parameter.studentId;

    if (!studentId) {
        return HtmlService.createHtmlOutput('<h1>Error: ID de estudiante no válido.</h1><p>Por favor, utiliza el enlace que recibiste por correo electrónico.</p>');
    }

    const studentData = getStudentData_(studentId);

    if (!studentData || studentData.estado === "Completado") {
        return HtmlService.createHtmlOutput('<h1>Encuesta ya respondida</h1><p>¡Gracias! Ya hemos recibido tus respuestas. No es necesario que completes la encuesta de nuevo.</p>');
    }

    const template = HtmlService.createTemplateFromFile('Index');
    template.studentId = studentId;
    return template.evaluate()
        .setTitle("Encuesta de Salida - Bienvenida de Transferencias")
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

/**
 * Procesa el envío del formulario.
 */
function processSurvey(formObject) {
    try {
        const studentId = formObject.studentId;
        if (!studentId) throw new Error("ID de estudiante no proporcionado.");
        
        const studentData = getStudentData_(studentId);
        if (!studentData) throw new Error("Estudiante no encontrado.");

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const responsesSheet = spreadsheet.getSheetByName(RESPONSES_SHEET_NAME) || spreadsheet.insertSheet(RESPONSES_SHEET_NAME);
        
        // Define todas las cabeceras posibles.
        const headers = [
            "Timestamp", "Matrícula", "Nombre Estudiante", "Mentor Asignado", "Comunidad", "Asistió al Evento",
            "Motivo No Asistencia", "Otro Motivo", "Sugerencia No Asistió", "Estado mentor (NO)",
            "Estado contacto mentor", "Áreas contacto", "Áreas otro",
            "Recorrido campus", "Apoyo mentor", "Otro apoyo", "Lo que más gustó", "Otro gusto",
            "Integración (multi)", "Comentario", "Experiencia general"
        ];
        if (responsesSheet.getLastRow() === 0) {
            responsesSheet.appendRow(headers);
        }

        let newRow;
        const attended = formObject.q_asistencia === 'si';

        if (attended) {
            newRow = [
                new Date(), studentData.matricula, studentData.nombre, studentData.mentor_nombre, studentData.comunidad || "", "Sí",
                "", "", "", "",
                formObject.q2_mentor_contacto, formObject.q3_areas, formObject.q3_otro_area,
                formObject.q6_recorrido, formObject.q7_apoyo, formObject.q7_otro_apoyo,
                formObject.q8_gusto, formObject.q8_otro_gusto,
                formObject.q9_integracion, formObject.q9_comentario, formObject.q10_experiencia
            ];
        } else {
            newRow = [
                new Date(), studentData.matricula, studentData.nombre, studentData.mentor_nombre, studentData.comunidad || "", "No",
                formObject.q2_motivo_no_asistir, formObject.q2_otro_motivo, formObject.q3_sugerencia_no,
                formObject.q3_no_mentor || "", "", "", "",
                "", "", "",
                "", "", "",
                "", "", ""
            ];
        }
        responsesSheet.appendRow(newRow);
        
        // Actualiza el estado del estudiante.
        const studentsSheet = spreadsheet.getSheetByName(STUDENTS_SHEET_NAME);
        studentsSheet.getRange(studentData.row, COL.ESTADO).setValue("Completado");
        studentsSheet.getRange(studentData.row, COL.FECHA_COMPLETADO).setValue(new Date());

        return { status: "success", message: "Respuestas guardadas." };

    } catch (error) {
        Logger.log(error);
        return { status: "error", message: error.message };
    }
}

/**
 * Genera enlaces personalizados para los estudiantes.
 */
function generatePersonalizedLinks() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STUDENTS_SHEET_NAME);
    if (!sheet) return SpreadsheetApp.getUi().alert(`Hoja "${STUDENTS_SHEET_NAME}" no encontrada.`);
    
    const data = sheet.getDataRange().getValues();
    const webAppUrl = "https://script.google.com/macros/s/AKfycbwTHbfKeaurI9KITyjVyUO7s0Ypg-79BiZZ81FGZv3tq7woqg0--2T-G4590JJKF6VHvQ/exec";
    const mentorsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MENTORS_SHEET_NAME);
    const mentorMap = mentorsSheet ? buildMentorMap_(mentorsSheet) : {};

    for (let i = 1; i < data.length; i++) {
        const studentId = Utilities.getUuid();
        const link = `${webAppUrl}?studentId=${studentId}`;
        
        sheet.getRange(i + 1, COL.ID_UNICO).setValue(studentId);
        sheet.getRange(i + 1, COL.ENLACE).setValue(link);
        
        if (!sheet.getRange(i + 1, COL.ESTADO).getValue()) {
            sheet.getRange(i + 1, COL.ESTADO).setValue("Pendiente");
        }

        const mentorNombre = String(data[i][COL.MENTOR_NOMBRE - 1] || '').trim();
        const comunidadActual = String(data[i][COL.COMUNIDAD - 1] || '').trim();
        if (!comunidadActual && mentorNombre && mentorMap[normalizarClave_(mentorNombre)]) {
            sheet.getRange(i + 1, COL.COMUNIDAD).setValue(mentorMap[normalizarClave_(mentorNombre)]);
        }
    }
    SpreadsheetApp.getUi().alert("Se han generado los enlaces para todos los estudiantes.");
}

/**
 * Envía los correos de invitación inicial.
 */
function sendInitialEmails() {
    const subject = "Seguimos contigo en tu experiencia de transferencia";
    sendEmails_("Pendiente", "Invitación Enviada", subject, createInitialEmailBody_);
}

/**
 * Envía los correos de recordatorio.
 */
function sendReminderEmails() {
    const subject = "Recordatorio: tu encuesta de Bienvenida";
    sendEmails_("Invitación Enviada", "Recordatorio Enviado", subject, createReminderEmailBody_);
}

/**
 * Función genérica para enviar correos.
 */
function sendEmails_(targetStatus, newStatus, subject, bodyFunction) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STUDENTS_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    let emailsSent = 0;

    for (let i = 1; i < data.length; i++) {
        const rowData = data[i];
        if (rowData[COL.ESTADO - 1] === targetStatus) {
            const student = {
                nombre: rowData[COL.NOMBRE - 1],
                email: rowData[COL.EMAIL - 1],
                enlace: rowData[COL.ENLACE - 1]
            };

            if (!student.email || !student.enlace) continue;

            const htmlBody = bodyFunction(student);
            MailApp.sendEmail({
                to: student.email,
                subject: subject,
                htmlBody: htmlBody,
                name: "Mentoría Estudiantil, Campus Monterrey"
            });

            sheet.getRange(i + 1, COL.ESTADO).setValue(newStatus);
            const dateCol = (newStatus === "Invitación Enviada") ? COL.FECHA_INVITACION : COL.FECHA_RECORDATORIO;
            sheet.getRange(i + 1, dateCol).setValue(new Date());
            emailsSent++;
        }
    }
    SpreadsheetApp.getUi().alert(`Se enviaron ${emailsSent} correos.`);
}

/**
 * Busca datos de un estudiante por su ID.
 */
function getStudentData_(studentId) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STUDENTS_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (data[i][COL.ID_UNICO - 1] === studentId) {
            return {
                row: i + 1,
                matricula: data[i][COL.MATRICULA - 1],
                nombre: data[i][COL.NOMBRE - 1],
                email: data[i][COL.EMAIL - 1],
                estado: data[i][COL.ESTADO - 1],
                mentor_nombre: data[i][COL.MENTOR_NOMBRE - 1],
                comunidad: data[i][COL.COMUNIDAD - 1]
            };
        }
    }
    return null;
}

/**
 * Crea el cuerpo del email de invitación desde la plantilla.
 */
function createInitialEmailBody_(student) {
    const template = HtmlService.createTemplateFromFile('Email_Template_Invitacion');
    template.student_name = student.nombre;
    template.survey_link = student.enlace;
    return template.evaluate().getContent();
}

/**
 * Crea el cuerpo del email de recordatorio desde la plantilla.
 */
function createReminderEmailBody_(student) {
    const template = HtmlService.createTemplateFromFile('Email_Template_Recordatorio');
    template.student_name = student.nombre;
    template.survey_link = student.enlace;
    return template.evaluate().getContent();
}

function normalizarClave_(value) {
    return value
        ? value.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
        : '';
}

function buildMentorMap_(sheet) {
    const data = sheet.getDataRange().getValues();
    const map = {};
    for (let i = 1; i < data.length; i++) {
        const nombre = String(data[i][COL_MENTORES.NOMBRE - 1] || '').trim();
        const comunidad = String(data[i][COL_MENTORES.COMUNIDAD - 1] || '').trim();
        if (nombre && comunidad) {
            map[normalizarClave_(nombre)] = comunidad;
        }
    }
    return map;
}

function crearDashboard() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const responses = ss.getSheetByName(RESPONSES_SHEET_NAME);
    const students = ss.getSheetByName(STUDENTS_SHEET_NAME);
    if (!responses || !students) {
        SpreadsheetApp.getUi().alert('Faltan hojas Estudiantes o Respuestas.');
        return;
    }
    let dash = ss.getSheetByName(DASHBOARD_SHEET_NAME);
    if (!dash) dash = ss.insertSheet(DASHBOARD_SHEET_NAME);
    dash.clear();

    dash.getRange('A1').setValue('Dashboard · Encuesta de Salida');
    dash.getRange('A3').setValue('Total de encuestas enviadas');
    dash.getRange('A4').setValue('% completadas');
    dash.getRange('A5').setValue('Asistencia al evento (Sí)');
    dash.getRange('A6').setValue('Asistencia al evento (No)');
    dash.getRange('A7').setValue('Pendientes por responder');
    dash.getRange('A9').setValue('Resultados por Comunidad');
    dash.getRange('A15').setValue('Áreas más contactadas');
    dash.getRange('A21').setValue('Lo que más gustó');
    dash.getRange('A27').setValue('Impacto dinámica de integración');

    dash.getRange('B3').setFormula(`=COUNTIF(${STUDENTS_SHEET_NAME}!F:F,\"Invitación Enviada\")+COUNTIF(${STUDENTS_SHEET_NAME}!F:F,\"Recordatorio Enviado\")+COUNTIF(${STUDENTS_SHEET_NAME}!F:F,\"Completado\")+COUNTIF(${STUDENTS_SHEET_NAME}!F:F,\"Pendiente\")`);
    dash.getRange('B4').setFormula(`=IF(B3=0,0,COUNTIF(${STUDENTS_SHEET_NAME}!F:F,\"Completado\")/B3)`);
    dash.getRange('B5').setFormula(`=COUNTIF(${RESPONSES_SHEET_NAME}!F:F,\"Sí\")`);
    dash.getRange('B6').setFormula(`=COUNTIF(${RESPONSES_SHEET_NAME}!F:F,\"No\")`);
    dash.getRange('B7').setFormula(`=COUNTIF(${STUDENTS_SHEET_NAME}!F:F,\"Pendiente\")`);

    dash.getRange('A10').setValue('Comunidad');
    dash.getRange('B10').setValue('Respuestas');
    dash.getRange('A11').setFormula(`=SORT(UNIQUE(FILTER(${RESPONSES_SHEET_NAME}!E:E,${RESPONSES_SHEET_NAME}!E:E<>\"\")))`);
    dash.getRange('B11').setFormula(`=ARRAYFORMULA(IF(A11:A=\"\",\"\",COUNTIF(${RESPONSES_SHEET_NAME}!E:E,A11:A)))`);

    dash.getRange('A16').setValue('Área');
    dash.getRange('B16').setValue('Respuestas');
    dash.getRange('A17').setFormula(`=UNIQUE(TRANSPOSE(SPLIT(TEXTJOIN(\",\",TRUE,${RESPONSES_SHEET_NAME}!L:L),\",\")))`);
    dash.getRange('B17').setFormula(`=ARRAYFORMULA(IF(A17:A=\"\",\"\",COUNTIF(${RESPONSES_SHEET_NAME}!L:L,\"*\"&A17:A&\"*\")))`);

    dash.getRange('A22').setValue('Gusto');
    dash.getRange('B22').setValue('Respuestas');
    dash.getRange('A23').setFormula(`=UNIQUE(TRANSPOSE(SPLIT(TEXTJOIN(\",\",TRUE,${RESPONSES_SHEET_NAME}!Q:Q),\",\")))`);
    dash.getRange('B23').setFormula(`=ARRAYFORMULA(IF(A23:A=\"\",\"\",COUNTIF(${RESPONSES_SHEET_NAME}!Q:Q,\"*\"&A23:A&\"*\")))`);

    dash.getRange('A28').setValue('Integración');
    dash.getRange('B28').setValue('Respuestas');
    dash.getRange('A29').setFormula(`=UNIQUE(TRANSPOSE(SPLIT(TEXTJOIN(\",\",TRUE,${RESPONSES_SHEET_NAME}!S:S),\",\")))`);
    dash.getRange('B29').setFormula(`=ARRAYFORMULA(IF(A29:A=\"\",\"\",COUNTIF(${RESPONSES_SHEET_NAME}!S:S,\"*\"&A29:A&\"*\")))`);

    dash.getRange('B4').setNumberFormat('0.0%');
    dash.setFrozenRows(1);
    dash.setColumnWidths(1, 2, 260);
}
