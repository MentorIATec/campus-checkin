const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzObP4Lw78TEfnhbvz2MPPltBIY-goU2HL7V8LvGpL_s8afqhLeJmIAIogL1cfCKFB0iA/exec";
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
      e.carrera = e.carrera?.trim() || '';
    });
  } catch {
    mostrarError('No se pudo cargar la base de estudiantes. Actualiza la página.');
  }
}

function mostrarError(msg) {
  document.getElementById('errorMsg').innerText = msg;
}
function limpiarError() {
  document.getElementById('errorMsg').innerText = '';
}
function mostrarTarjeta() {
  document.getElementById('tarjetaEstudiante').classList.remove('hidden');
  document.getElementById('checkin-section').style.display = 'none';
  document.getElementById('leyendaMatricula').style.display = 'none';
}
function ocultarTarjeta() {
  document.getElementById('tarjetaEstudiante').classList.add('hidden');
  document.getElementById('checkin-section').style.display = 'block';
  document.getElementById('leyendaMatricula').style.display = '';
}

async function actualizarStatsBar() {
  try {
    const res = await fetch(GOOGLE_SCRIPT_URL);
    const info = await res.json();
    document.getElementById('totalCheckins').textContent = info.checkins || 0;
  } catch {
    document.getElementById('totalCheckins').textContent = "—";
  }
}
function actualizarHoraActual() {
  const ahora = new Date();
  const h = ahora.getHours().toString().padStart(2,'0');
  const m = ahora.getMinutes().toString().padStart(2,'0');
  document.getElementById('currentTime').textContent = `${h}:${m}`;
}

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
  document.getElementById('mentorFullname').textContent = e.mentorFullname;

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

  const studentCard = document.getElementById('studentCardBg');
  const comunidadKey = e.comunidad.replace(/ /g, '');
  studentCard.className = 'student-card bg-' + comunidadKey;

  document.getElementById('fullnameEstudiante').textContent = e.fullnameEstudiante;
  const comunidadBadge = document.getElementById('comunidadBadge');
  comunidadBadge.textContent = e.comunidad;
  comunidadBadge.setAttribute('data-comunidad', e.comunidad);

  document.getElementById('matriculaEstudiante').textContent = e.matricula;
  document.getElementById('campusEstudiante').textContent = e.campusOrigen;
  document.getElementById('carreraEstudiante').textContent = e.carrera;

  const btn = document.getElementById('asistenciaBtn');
  btn.disabled = true;
  btn.textContent = 'Verificando...';

  // Checar si ya hizo check-in antes de permitirlo
  checkMatriculaRegistrada(e.matricula).then(yaRegistrado => {
    btn.disabled = yaRegistrado;
    btn.textContent = yaRegistrado ? '✓ Ya registrado' : '¡Ya llegué!';
  });

  document.getElementById('mensajeExito').classList.add('hidden');
  mostrarTarjeta();
}

// Consulta el endpoint para ver si ya existe matrícula
async function checkMatriculaRegistrada(matricula) {
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?matricula=${encodeURIComponent(matricula)}`);
    const info = await res.json();
    return !!info.registered;
  } catch {
    return false;
  }
}

async function registrarAsistencia() {
  if (!estudianteActual) return;
  const data = {
    matricula: estudianteActual.matricula,
    fullnameEstudiante: estudianteActual.fullnameEstudiante,
    comunidad: estudianteActual.comunidad,
    mentorFullname: estudianteActual.mentorFullname,
    campusOrigen: estudianteActual.campusOrigen,
    carrera: estudianteActual.carrera,
  };

  const btn = document.getElementById('asistenciaBtn');
  btn.disabled = true;
  btn.textContent = 'Registrando...';

  try {
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json"
      }
    });
    const result = await res.json();
    if (result.result === "duplicate") {
      btn.disabled = true;
      btn.textContent = '✓ Ya registrado';
      mostrarError('Este estudiante ya hizo check-in.');
    } else if (result.result === "success") {
      document.getElementById('mensajeExito').classList.remove('hidden');
      document.getElementById('kitComunidad').textContent = estudianteActual.comunidad;
      btn.disabled = true;
      btn.textContent = '✓ Ya registrado';
      actualizarStatsBar();
    } else {
      throw new Error("Error desconocido");
    }
  } catch (e) {
    mostrarError("Error al registrar. Intenta de nuevo.");
    btn.disabled = false;
    btn.textContent = '¡Ya llegué!';
  }
}

function resetCheckin() {
  estudianteActual = null;
  ocultarTarjeta();
  document.getElementById('matriculaInput').value = '';
  limpiarError();
  setTimeout(() => { document.getElementById('matriculaInput').focus(); }, 250);
}

document.addEventListener('DOMContentLoaded', async () => {
  await cargarDatos();
  document.getElementById('matriculaInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') buscarEstudiante();
  });
  actualizarStatsBar();
  setInterval(actualizarHoraActual, 1000);
  resetCheckin();
});
