/**
 * @OnlyCurrentDoc
 */

// Nombres de las hojas de cálculo utilizadas en el proyecto.
const STUDENTS_SHEET_NAME = "Estudiantes";
const RESPONSES_SHEET_NAME = "Respuestas";

// Índices de las columnas en la hoja "Estudiantes" (basado en 1 para facilitar la lectura).
const COL = {
    MATRICULA: 1,
    NOMBRE: 2,
    EMAIL: 3,
    ID_UNICO: 4,
    ENLACE: 5,
    ESTADO: 6,
    MENTOR_NOMBRE: 7,
    MENTOR_NICKNAME: 8,
    WHATSAPP: 9,
    EMAIL_MENTOR: 10,
    FECHA_INVITACION: 11,
    FECHA_RECORDATORIO: 12,
    FECHA_COMPLETADO: 13,
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
        
        // Define todas las cabeceras posibles.        const headers = [
            "Timestamp", "Matrícula", "Nombre Estudiante", "Mentor Asignado", "Asistió al Evento", 
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
                new Date(), studentData.matricula, studentData.nombre, studentData.mentor_nombre, "Sí",
                "", "", "", "",
                formObject.q2_mentor_contacto, formObject.q3_areas, formObject.q3_otro_area,
                formObject.q6_recorrido, formObject.q7_apoyo, formObject.q7_otro_apoyo,
                formObject.q8_gusto, formObject.q8_otro_gusto,
                formObject.q9_integracion, formObject.q9_comentario, formObject.q10_experiencia
            ];
        } else {
            newRow = [
                new Date(), studentData.matricula, studentData.nombre, studentData.mentor_nombre, "No",
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
    const webAppUrl = "https://script.google.com/macros/s/AKfycbzJ3IltUuYyJ7uRhWufZ-OVl5zTaQaf9jyNFd7FDFa5Mnvf-tHghC_dLMHiVOYl6tt2/exec";

    for (let i = 1; i < data.length; i++) {
        const studentId = Utilities.getUuid();
        const link = `${webAppUrl}?studentId=${studentId}`;
        
        sheet.getRange(i + 1, COL.ID_UNICO).setValue(studentId);
        sheet.getRange(i + 1, COL.ENLACE).setValue(link);
        
        if (!sheet.getRange(i + 1, COL.ESTADO).getValue()) {
            sheet.getRange(i + 1, COL.ESTADO).setValue("Pendiente");
        }
    }
    SpreadsheetApp.getUi().alert("Se han generado los enlaces para todos los estudiantes.");
}

/**
 * Envía los correos de invitación inicial.
 */
function sendInitialEmails() {
    const subject = "Recordatorio: Encuesta de cierre FJ26";
    sendEmails_("Pendiente", "Invitación Enviada", subject, createInitialEmailBody_);
}

/**
 * Envía los correos de recordatorio.
 */
function sendReminderEmails() {
    const subject = "¿Cómo vas en el Tec? Un recordatorio y una sorpresa para ti";
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
                enlace: rowData[COL.ENLACE - 1],
                mentor_nombre: rowData[COL.MENTOR_NOMBRE - 1],
                mentor_nickname: rowData[COL.MENTOR_NICKNAME - 1],
                whatsapp: rowData[COL.WHATSAPP - 1],
                email_mentor: rowData[COL.EMAIL_MENTOR - 1]
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
                mentor_nombre: data[i][COL.MENTOR_NOMBRE - 1]
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
    template.mentor_nickname = student.mentor_nickname;
    template.mentor_fullname = student.mentor_nombre;
    template.mentor_email = student.email_mentor;
    template.mentor_whatsapp = student.whatsapp;
    template.survey_link = student.enlace;
    return template.evaluate().getContent();
}

/**
 * Crea el cuerpo del email de recordatorio desde la plantilla.
 */
function createReminderEmailBody_(student) {
    const template = HtmlService.createTemplateFromFile('Email_Template_Recordatorio');
    template.student_name = student.nombre;
    template.mentor_nickname = student.mentor_nickname;
    template.survey_link = student.enlace;
    return template.evaluate().getContent();
}

