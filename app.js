/************************************
 * CONFIG
 ************************************/
const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyhoxSaOweOvZXy133krD6AN1lZDhhjYGFC3jNyocLxx5R5m9KeTiyL-XTMPCPnluo8Cw/exec'; 
const JSON_PATH = '/estudiantes.json';

let estudiantesData = [];
let estudianteActual = null;

/************************************
 * HELPERS
 ************************************/

function normalizeMatricula(m) {
  return (m || "")
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function byId(id) {
  return document.getElementById(id);
}

function show(el) { el && el.classList.remove('hidden'); }
function hide(el) { el && el.classList.add('hidden'); }

function setText(id, txt) {
  const el = byId(id);
  if (el) el.textContent = txt == null ? "" : txt;
}

function limpiarMensajes() {
  hide(byId('errorGeneral'));
  setText('errorGeneral', '');
}

function mostrarError(msg) {
  const el = byId('errorGeneral');
  if (!el) return;
  setText('errorGeneral', msg);
  show(el);
}

/************************************
 * CARGA DE ESTUDIANTES
 ************************************/
async function cargarDatos() {
  try {
    const resp = await fetch(`${JSON_PATH}?cache=${Date.now()}`);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const raw = await resp.json();

    if (!Array.isArray(raw)) {
      throw new Error('El JSON no es un array (estructura esperada cambió).');
    }

    estudiantesData = raw
      .map(est => {
        const mat = est.matrícula || est.matricula || est.Matricula;
        if (!mat) return null;
        return {
          matricula: normalizeMatricula(mat),
            // Ajústalo a los nombres reales de tu JSON actual:
          nombreCompleto: (est.fullnameEstudiante || est.nombre || '').trim(),
          nombreCorto: (est.nameEstudiante || '').trim(),
          mentorNombre: (est.mentorFullname || est.mentor || '').trim(),
          comunidad: (est.comunidad || '').trim(),
          whatsappMentor: (est.whatsappMentor || est.whatsapp || '').trim(),
          campusOrigen: (est.campusOrigen || '').trim(),
          carrera: (est.carrera || '').trim(),
          entrada: (est.entrada || '').trim(),
          email: (est.email || (normalizeMatricula(mat) + '@tec.mx')).trim()
        };
      })
      .filter(Boolean);

    console.log('✅ Estudiantes cargados:', estudiantesData.length);
  } catch (err) {
    console.error('❌ Error cargando JSON:', err);
    mostrarError('No se pudieron cargar los datos de estudiantes.');
  } finally {
    const overlay = byId('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');
  }
}

/************************************
 * BÚSQUEDA
 ************************************/
function buscarEstudiante() {
  limpiarMensajes();
  hide(byId('studentInfo'));
  hide(byId('confirmationYes'));
  hide(byId('confirmationDuplicate'));

  const input = byId('matricula');
  const val = normalizeMatricula(input.value);

  if (!val) {
    mostrarError('Ingresa una matrícula.');
    return;
  }

  const est = estudiantesData.find(e => e.matricula === val);
  if (!est) {
    mostrarError('Matrícula no encontrada.');
    return;
  }

  estudianteActual = est;
  poblarFicha(est);
}

function poblarFicha(est) {
  const nombreMostrar = est.nombreCorto || est.nombreCompleto || est.matricula;
  setText('welcomeMessage', `¡Hola ${nombreMostrar}! 👋`);
  setText('mentorLine', `Mentor(a): ${est.mentorNombre || '—'}`);
  setText('comunidadLine', `Comunidad: ${est.comunidad || '—'}`);
  show(byId('studentInfo'));
  const btnRegistrar = byId('btnRegistrar');
  if (btnRegistrar) {
    btnRegistrar.disabled = false;
    btnRegistrar.textContent = 'Registrar llegada';
  }
}

/************************************
 * REGISTRO (POST Apps Script)
 ************************************/
async function registrarCheckin() {
  if (!estudianteActual) {
    mostrarError('Primero busca una matrícula.');
    return;
  }

  const btn = byId('btnRegistrar');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Registrando...';
  }

  try {
    const payload = {
      matricula: estudianteActual.matricula,
      fullnameEstudiante: estudianteActual.nombreCompleto,
      comunidad: estudianteActual.comunidad,
      mentorFullname: estudianteActual.mentorNombre,
      campusOrigen: estudianteActual.campusOrigen,
      carrera: estudianteActual.carrera
    };

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

    if (data.result === 'duplicate') {
      mostrarMensajeDuplicado(data);
    } else if (data.result === 'success') {
      mostrarMensajeExito(data);
    } else if (data.registered === true) {
      // Si tu endpoint GET devolviera esto… (fallback)
      mostrarMensajeDuplicado(data);
    } else {
      mostrarError(data.message || 'Error inesperado.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Registrar llegada';
      }
      return;
    }

    // Actualiza stats al final
    actualizarStats();

  } catch (err) {
    console.error(err);
    mostrarError('No se pudo registrar. Intenta de nuevo.');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Registrar llegada';
    }
  }
}

function mostrarMensajeExito(data) {
  hide(byId('studentInfo'));
  const hora = data.lastCheckinTime || '--:--';
  setText('horaRegistroExito', hora);
  if (estudianteActual) {
    setText('mentorExito', estudianteActual.mentorNombre || '—');
    setText('comunidadExito', estudianteActual.comunidad || '—');
  }
  show(byId('confirmationYes'));
}

function mostrarMensajeDuplicado(data) {
  hide(byId('studentInfo'));
  const hora = data.lastCheckinTime || '--:--';
  setText('horaRegistroDuplicado', hora);
  show(byId('confirmationDuplicate'));
}

/************************************
 * STATS (GET Apps Script)
 ************************************/
async function actualizarStats() {
  try {
    const resp = await fetch(GAS_ENDPOINT);
    if (!resp.ok) return;
    const data = await resp.json();
    if (typeof data.checkins !== 'undefined') {
      setText('statTotal', data.checkins);
    }
    if (data.lastCheckinTime) {
      setText('statUltimo', data.lastCheckinTime);
    }
  } catch (err) {
    console.warn('No se pudieron actualizar stats', err);
  }
}

/************************************
 * REINICIAR
 ************************************/
function reiniciar() {
  estudianteActual = null;
  limpiarMensajes();
  hide(byId('studentInfo'));
  hide(byId('confirmationYes'));
  hide(byId('confirmationDuplicate'));
  const input = byId('matricula');
  if (input) {
    input.value = '';
    input.focus();
  }
  show(byId('searchSection'));
}

/************************************
 * EVENTOS INICIALES
 ************************************/
document.addEventListener('DOMContentLoaded', () => {
  cargarDatos().then(() => {
    actualizarStats();
  });

  const input = byId('matricula');
  if (input) {
    input.addEventListener('keypress', e => {
      if (e.key === 'Enter') buscarEstudiante();
    });
  }

  byId('btnRefrescarStats')?.addEventListener('click', actualizarStats);
  byId('btnRegistrar')?.addEventListener('click', registrarCheckin);
  byId('btnReiniciarDesdeFicha')?.addEventListener('click', reiniciar);
  byId('btnOtroRegistro1')?.addEventListener('click', reiniciar);
  byId('btnOtroRegistro2')?.addEventListener('click', reiniciar);

  // Botón buscar (si lo tienes)
  const btnBuscar = document.querySelector('button.btn.btn-primary');
  if (btnBuscar && !btnBuscar.dataset.handler) {
    btnBuscar.dataset.handler = '1';
    btnBuscar.addEventListener('click', buscarEstudiante);
  }
});
