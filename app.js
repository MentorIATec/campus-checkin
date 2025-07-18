let estudiantesData = [];
let estudianteActual = null;

async function cargarDatos() {
  try {
    const res = await fetch('estudiantes.json');
    estudiantesData = await res.json();
    estudiantesData.forEach(e => {
      e.matricula = (e.matricula || e["matrícula"]).trim().toUpperCase();
      e.comunidad = e.comunidad.trim();
      e.nameEstudiante = e.nameEstudiante?.trim() || '';
      e.fullnameEstudiante = e.fullnameEstudiante?.trim() || '';
      e.mentorFullname = e.mentorFullname?.trim() || '';
      e.mentorNickname = e.mentorNickname?.trim() || '';
      e.fotoMentor = e.fotoMentor?.trim() || '';
      e.campusOrigen = e.campusOrigen?.trim() || '';
    });
  } catch {
    mostrarError('No se pudo cargar la base de estudiantes. Actualiza la página.');
  }
}

// UI helpers
function mostrarError(msg) {
  document.getElementById('errorMsg').innerText = msg;
}
function limpiarError() {
  document.getElementById('errorMsg').innerText = '';
}
function mostrarTarjeta() {
  document.getElementById('tarjetaEstudiante').classList.remove('hidden');
  document.getElementById('checkin-section').style.display = 'none';
}
function ocultarTarjeta() {
  document.getElementById('tarjetaEstudiante').classList.add('hidden');
  document.getElementById('checkin-section').style.display = 'block';
}

// Stats bar
function actualizarStatsBar() {
  let total = 0, lastCheckin = '--:--';
  estudiantesData.forEach(e => {
    if (localStorage.getItem(`checkin_${e.matricula}`) === '1') total++;
  });
  document.getElementById('totalCheckins').text
