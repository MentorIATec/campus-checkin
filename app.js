/************************************************
 * CONFIG
 ************************************************/
const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyhoxSaOweOvZXy133krD6AN1lZDhhjYGFC3jNyocLxx5R5m9KeTiyL-XTMPCPnluo8Cw/exec';  // 
const JSON_PATH = '/estudiantes.json';              // ruta del archivo plano

/************************************************
 * ESTADO
 ************************************************/
let estudiantes = [];
let estudianteActual = null;
let cargado = false;

/************************************************
 * HELPERS
 ************************************************/
const $ = id => document.getElementById(id);
const show = el => el && el.classList.remove('hidden');
const hide = el => el && el.classList.add('hidden');

function normalizeMatricula(m) {
  return (m || "")
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function limpiarErrores() {
  $('errorMsg').textContent = '';
  $('errorMsg').classList.remove('visible');
}

function mostrarError(msg) {
  $('errorMsg').textContent = msg;
  $('errorMsg').classList.add('visible');
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value ?? '';
}

/************************************************
 * CARGA INICIAL
 ************************************************/
document.addEventListener('DOMContentLoaded', () => {
  cargarDatosEstudiantes();
  cargarEstadisticas();
  wiringEventos();
});

async function cargarDatosEstudiantes() {
  try {
    const resp = await fetch(`${JSON_PATH}?_=${Date.now()}`);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error('El JSON no es un array plano');

    estudiantes = data
      .map(est => {
        const mat = est.matrícula || est.matricula || est.Matricula;
        if (!mat) return null;
        return {
          matricula: normalizeMatricula(mat),
          fullname: (est.fullnameEstudiante || est.nombre || '').trim(),
          comunidad: (est.comunidad || '').trim(),
          mentor: (est.mentorFullname || est.mentor || '').trim(),
          campus: (est.campusOrigen || est.campus || '').trim(),
          carrera: (est.carrera || '').trim(),
          entrada: (est.entrada || '').trim()
        };
      })
      .filter(Boolean);

    console.log('✅ Estudiantes cargados:', estudiantes.length);
    cargado = true;
  } catch (err) {
    console.error('❌ Error cargando estudiantes:', err);
    mostrarError('No se pudieron cargar los datos de estudiantes.');
  }
}

/************************************************
 * ESTADÍSTICAS
 ************************************************/
async function cargarEstadisticas() {
  try {
    const resp = await fetch(GAS_ENDPOINT);
    if (!resp.ok) return;
    const stats = await resp.json();
    if (typeof stats.checkins !== 'undefined') {
      setText('totalCheckins', stats.checkins);
    }
    if (stats.lastCheckinTime) {
      setText('lastCheckinTime', stats.lastCheckinTime);
    }
  } catch (e) {
    console.warn('No se pudieron cargar estadísticas', e);
  }
}

/************************************************
 * BÚSQUEDA
 ************************************************/
function buscarEstudiante() {
  limpiarErrores();
  hide($('mensajeExito'));

  const val = normalizeMatricula($('matriculaInput').value);
  if (!val) {
    mostrarError('Ingresa una matrícula.');
    return;
  }
  if (!cargado) {
    mostrarError('Datos todavía cargándose. Intenta de nuevo en unos segundos.');
    return;
  }

  const est = estudiantes.find(e => e.matricula === val);
  if (!est) {
    mostrarError('Matrícula no encontrada.');
    hide($('tarjetaEstudiante'));
    $('resetBtn').disabled = true;
    estudianteActual = null;
    return;
  }

  estudianteActual = est;
  renderTarjeta(est);
  $('resetBtn').disabled = false;
}

function renderTarjeta(est) {
  setText('fullnameEstudiante', est.fullname || est.matricula);
  setText('matriculaEstudiante', est.matricula);
  setText('mentorFullname', est.mentor || '—');
  setText('campusEstudiante', est.campus || '—');
  setText('carreraEstudiante', est.carrera || '—');

  const badge = $('comunidadBadge');
  if (badge) {
    badge.textContent = est.comunidad || '—';
    badge.className = 'badge'; // reset base
    if (est.comunidad) {
      badge.classList.add('comu-' + est.comunidad.toLowerCase().replace(/\s+/g, '-'));
    }
  }

  hide($('mensajeExito'));
  show($('tarjetaEstudiante'));
  const btn = $('asistenciaBtn');
  if (btn) {
    btn.disabled = false;
    btn.textContent = '¡Ya llegué!';
  }
}

/************************************************
 * REGISTRO DE ASISTENCIA
 ************************************************/
async function registrarAsistencia() {
  if (!estudianteActual) {
    mostrarError('Primero busca una matrícula válida.');
    return;
  }
  limpiarErrores();

  const btn = $('asistenciaBtn');
  btn.disabled = true;
  btn.textContent = 'Registrando...';

  const payload = {
    matricula: estudianteActual.matricula,
    fullnameEstudiante: estudianteActual.fullname,
    comunidad: estudianteActual.comunidad,
    mentorFullname: estudianteActual.mentor,
    campusOrigen: estudianteActual.campus,
    carrera: estudianteActual.carrera
  };

  try {
    const resp = await fetch(GAS_ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    let data;
    try {
      data = await resp.json();
    } catch {
      throw new Error('Respuesta no es JSON válido');
    }

    if (data.result === 'success') {
      mostrarExito(data.lastCheckinTime);
    } else if (data.result === 'duplicate') {
      // En tu GAS puedes devolver lastCheckinTime también para duplicados
      mostrarExito(data.lastCheckinTime, true);
    } else {
      mostrarError(data.message || 'Error guardando asistencia.');
      btn.disabled = false;
      btn.textContent = '¡Ya llegué!';
      return;
    }

    cargarEstadisticas(); // actualiza stats tras registrar
  } catch (e) {
    console.error(e);
    mostrarError('No se pudo registrar. Intenta de nuevo.');
    btn.disabled = false;
    btn.textContent = '¡Ya llegué!';
  }
}

function mostrarExito(hora, esDuplicado = false) {
  const box = $('mensajeExito');
  if (!box) return;
  const comunidadSpan = $('kitComunidad');
  if (comunidadSpan) comunidadSpan.textContent = estudianteActual.comunidad || '';
  show(box);

  // Ajusta mensaje según duplicado
  if (esDuplicado) {
    box.querySelector('p').innerHTML = `
      ⚠️ Esta matrícula ya estaba registrada.<br>
      <b>Kit de ${estudianteActual.comunidad || ''} ya entregado / verificar.</b><br>
      <span class="small-note">Último registro: ${hora || '--:--'} · Si hay duda acude al staff.</span>
    `;
  } else {
    box.querySelector('p').innerHTML = `
      ✅ Registro de asistencia realizado.<br>
      <b>¡Entrega el kit de ${estudianteActual.comunidad || ''}!</b><br>
      <span class="small-note">Hora: ${hora || '--:--'} · Muestra esta pantalla al staff.</span>
    `;
  }

  const btn = $('asistenciaBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = esDuplicado ? 'Duplicado' : 'Registrado';
  }
}

/************************************************
 * RESET
 ************************************************/
function resetFormulario() {
  estudianteActual = null;
  hide($('tarjetaEstudiante'));
  hide($('mensajeExito'));
  limpiarErrores();
  const input = $('matriculaInput');
  if (input) {
    input.value = '';
    input.focus();
  }
  $('resetBtn').disabled = true;
}

/************************************************
 * EVENTOS
 ************************************************/
function wiringEventos() {
  $('matriculaInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') buscarEstudiante();
  });
}

/************************************************
 * EXPONE FUNCIONES (si usas inline handlers)
 ************************************************/
window.buscarEstudiante = buscarEstudiante;
window.registrarAsistencia = registrarAsistencia;
window.resetFormulario = resetFormulario;
window.cargarEstadisticas = cargarEstadisticas;
