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
  document.getElementById('totalCheckins').textContent = total;
  const hora = localStorage.getItem('lastCheckinTime');
  if (hora) lastCheckin = hora;
  document.getElementById('lastCheckin').textContent = lastCheckin;
}
function actualizarHoraActual() {
  const ahora = new Date();
  const h = ahora.getHours().toString().padStart(2,'0');
  const m = ahora.getMinutes().toString().padStart(2,'0');
  document.getElementById('currentTime').textContent = `${h}:${m}`;
}

// Búsqueda de estudiante
function buscarEstudiante() {
  limpiarError();
  const input = document.getElementById('matriculaInput').value.trim().toUpperCase();
  if (!input) {
    mostrarError('Ingresa una matrícula');
    return;
  }
  const e = estudiantesData.find(x => x.matricula === input);
  if (!e) {
    mostrarError('Matrícula no encontrada');
    return;
  }
  estudianteActual = e;
  mostrarDatosEstudiante(e);
}

function mostrarDatosEstudiante(e) {
  // Chip comunidad
  const comunidadBadge = document.getElementById('comunidadBadge');
  comunidadBadge.textContent = e.comunidad;
  comunidadBadge.setAttribute('data-comunidad', e.comunidad);

  // Datos estudiante
  document.getElementById('nombreEstudiante').textContent = e.nameEstudiante;
  document.getElementById('matriculaEstudiante').textContent = e.matricula;
  document.getElementById('campusEstudiante').textContent = e.campusOrigen;
  document.getElementById('nombreMentor').textContent = e.mentorFullname;

  // Mentor foto o placeholder
  const foto = document.getElementById('fotoMentor');
  const placeholder = document.getElementById('fotoPlaceholder');
  if (e.fotoMentor) {
    foto.src = e.fotoMentor;
    foto.alt = e.mentorNickname;
    foto.style.display = '';
    placeholder.style.display = 'none';
    foto.onerror = () => { foto.style.display = 'none'; placeholder.style.display = ''; }
  } else {
    foto.style.display = 'none';
    placeholder.style.display = '';
  }

  // Botón asistencia: ya registrado?
  const btn = document.getElementById('asistenciaBtn');
  const registrado = localStorage.getItem(`checkin_${e.matricula}`) === '1';
  btn.disabled = registrado;
  btn.textContent = registrado ? '✓ Ya registrado' : '¡Ya llegué!';

  // Mensaje éxito fuera
  document.getElementById('mensajeExito').classList.add('hidden');

  mostrarTarjeta();
}

// Confirmar asistencia
function registrarAsistencia() {
  if (!estudianteActual) return;
  localStorage.setItem(`checkin_${estudianteActual.matricula}`, '1');
  // Hora último checkin
  const ahora = new Date();
  const h = ahora.getHours().toString().padStart(2,'0');
  const m = ahora.getMinutes().toString().padStart(2,'0');
  localStorage.setItem('lastCheckinTime', `${h}:${m}`);
  // Mensaje éxito
  document.getElementById('mensajeExito').classList.remove('hidden');
  document.getElementById('kitComunidad').textContent = estudianteActual.comunidad;
  // Botón disable
  const btn = document.getElementById('asistenciaBtn');
  btn.disabled = true;
  btn.textContent = '✓ Ya registrado';
  actualizarStatsBar();
}

// Volver a buscar
function resetCheckin() {
  estudianteActual = null;
  ocultarTarjeta();
  document.getElementById('matriculaInput').value = '';
  limpiarError();
  setTimeout(() => { document.getElementById('matriculaInput').focus(); }, 250);
}

// Enter = buscar
document.addEventListener('DOMContentLoaded', async () => {
  await cargarDatos();
  document.getElementById('matriculaInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') buscarEstudiante();
  });
  actualizarStatsBar();
  setInterval(actualizarHoraActual, 1000);
  resetCheckin();
});
