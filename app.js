let estudiantesData = [];
let estudianteActual = null;

// Carga el JSON de estudiantes al iniciar
window.onload = async function() {
    const res = await fetch('estudiantes.json');
    estudiantesData = await res.json();
};

function buscarEstudiante() {
    const input = document.getElementById('matriculaInput');
    const matricula = input.value.trim().toUpperCase();
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.textContent = '';
    estudianteActual = estudiantesData.find(e =>
        (e.matricula || e["matrícula"] || "").trim().toUpperCase() === matricula
    );
    if (!estudianteActual) {
        errorMsg.textContent = 'Matrícula no encontrada. Intenta de nuevo.';
        return;
    }
    mostrarTarjetaEstudiante();
}

function mostrarTarjetaEstudiante() {
    document.getElementById('checkin-section').classList.add('hidden');
    document.getElementById('tarjetaEstudiante').classList.remove('hidden');

    // Nombre estudiante (nombre corto o completo)
    document.getElementById('nombreEstudiante').textContent = estudianteActual.nameEstudiante || estudianteActual.fullnameEstudiante;

    // Comunidad (colores)
    const comunidadKey = (estudianteActual.comunidad || "").toLowerCase();
    const card = document.getElementById('comunidadCard');
    card.className = 'card-comunidad comunidad-' + comunidadKey;

    document.getElementById('comunidadBadge').textContent = estudianteActual.comunidad;

    // Mentor/a
    document.getElementById('nombreMentor').textContent = estudianteActual.mentorFullname + (estudianteActual.mentorNickname ? ` (${estudianteActual.mentorNickname})` : '');

    // Foto mentor/a
    document.getElementById('fotoMentor').src = estudianteActual.fotoMentor || 'default-mentor.png';
    document.getElementById('fotoMentor').alt = estudianteActual.mentorFullname;
}

function resetCheckin() {
    document.getElementById('tarjetaEstudiante').classList.add('hidden');
    document.getElementById('checkin-section').classList.remove('hidden');
    document.getElementById('matriculaInput').value = '';
    document.getElementById('errorMsg').textContent = '';
    estudianteActual = null;
}

// Puedes agregar aquí la función registrarAsistencia() cuando quieras registrar asistencia en Sheets, Airtable, etc.
