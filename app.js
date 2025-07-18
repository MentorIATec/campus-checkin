/* =========================
   CONFIGURACIÓN
========================= */

// URL del WebApp de Google Apps Script (termina en /exec)
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbyhoxSaOweOvZXy133krD6AN1lZDhhjYGFC3jNyocLxx5R5m9KeTiyL-XTMPCPnluo8Cw/exec'; 

// Archivo JSON con la data de estudiantes (en la raíz del deploy)
const JSON_URL = '/estudiantes.json';


/* =========================
   ESTADO
========================= */
let estudiantesData = [];
let estudianteActual = null;


/* =========================
   REFERENCIAS DOM
========================= */
const $ = sel => document.querySelector(sel);

const errorMsgEl       = $('#errorMsg');
const tarjetaEl        = $('#tarjetaEstudiante');
const btnReset         = $('#resetBtn');
const btnAsistencia    = $('#asistenciaBtn');
const mensajeExitoEl   = $('#mensajeExito');
const kitComunidadEl   = $('#kitComunidad');
const totalCheckinsEl  = $('#totalCheckins');
const lastCheckinEl    = $('#lastCheckinTime');
const matriculaInputEl = $('#matriculaInput');


/* =========================
   EVENTOS INICIALES
========================= */
document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    cargarEstadisticas();
});

matriculaInputEl.addEventListener('keypress', e => {
    if (e.key === 'Enter') buscarEstudiante();
});


/* =========================
   CARGA DE ESTUDIANTES
========================= */
async function cargarDatos() {
    try {
        const resp = await fetch(JSON_URL);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();

        estudiantesData = [];
        Object.keys(data).forEach(periodo => {
            if (Array.isArray(data[periodo])) {
                data[periodo].forEach(est => {
                    if (est && est.Matricula) {
                        estudiantesData.push({
                            matricula: (est.Matricula || '').trim().toUpperCase(),
                            nombre: (est['Nombre del alumno'] || '').trim(),
                            mentor: (est['Mentor Asignado Verano 25'] || est['Mentor'] || '').trim(),
                            whatsapp: (est.Whatsapp || '').trim(),
                            comunidad: (est.Comunidad || '').trim(),
                            email: (est['Email del alumno'] || '').trim(),
                            campusOrigen: (est['Campus origen'] || '').trim(),
                            carrera: (est['Carrera de egreso'] || est['Carrera'] || '').trim()
                        });
                    }
                });
            }
        });

        console.log('✅ Estudiantes cargados:', estudiantesData.length);
    } catch (e) {
        console.error('Error cargando JSON:', e);
        mostrarError('No se pudieron cargar los datos.');
    }
}


/* =========================
   ESTADÍSTICAS (GET al Apps Script)
========================= */
async function cargarEstadisticas() {
    if (!ENDPOINT || ENDPOINT.startsWith('TU_URL_WEBAPP')) {
        console.warn('ENDPOINT no configurado para estadísticas.');
        return;
    }
    try {
        const url = ENDPOINT + '?_=' + Date.now(); // cache buster
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();
        if (typeof data.checkins !== 'undefined') {
            totalCheckinsEl.textContent = data.checkins;
            lastCheckinEl.textContent   = data.lastCheckinTime || '--:--';
        }
    } catch (e) {
        console.warn('No se pudieron cargar estadísticas', e);
    }
}
window.cargarEstadisticas = cargarEstadisticas; // por si lo llamas con botón


/* =========================
   BÚSQUEDA
========================= */
function buscarEstudiante() {
    limpiarError();
    const val = (matriculaInputEl.value || '').trim().toUpperCase();
    if (!val) {
        mostrarError('Ingresa una matrícula.');
        return;
    }

    const encontrado = estudiantesData.find(e => e.matricula === val);
    if (!encontrado) {
        mostrarError('Matrícula no encontrada.');
        tarjetaEl.classList.add('hidden');
        estudianteActual = null;
        return;
    }

    estudianteActual = encontrado;
    poblarTarjeta(encontrado);
    btnReset.disabled = false;
}


/* =========================
   RENDER DE TARJETA
========================= */
function poblarTarjeta(est) {
    $('#fullnameEstudiante').textContent = est.nombre || '—';
    $('#matriculaEstudiante').textContent = est.matricula || '—';
    $('#mentorFullname').textContent = est.mentor || '—';
    $('#campusEstudiante').textContent = est.campusOrigen || '—';
    $('#carreraEstudiante').textContent = est.carrera || '—';

    const badge = $('#comunidadBadge');
    badge.textContent = est.comunidad || 'Sin comunidad';
    badge.className = 'badge ' + (est.comunidad || '');

    // Reset de mensaje y botón
    mensajeExitoEl.classList.add('hidden');
    kitComunidadEl.textContent = '';
    btnAsistencia.disabled = false;
    btnAsistencia.textContent = '¡Ya llegué!';
    btnAsistencia.classList.remove('btn-registrado');
    btnAsistencia.dataset.loading = '0';
    const notaDup = document.getElementById('notaDuplicado');
    if (notaDup) notaDup.remove();

    tarjetaEl.classList.remove('hidden');
}


/* =========================
   REGISTRO (POST)
========================= */
async function registrarAsistencia() {
    if (!estudianteActual) {
        mostrarError('Busca primero una matrícula válida.');
        return;
    }
    if (!ENDPOINT || ENDPOINT.startsWith('TU_URL_WEBAPP')) {
        mostrarError('Configura el ENDPOINT del Apps Script.');
        return;
    }
    if (btnAsistencia.dataset.loading === '1') return;

    limpiarError();
    btnAsistencia.dataset.loading = '1';
    const originalText = btnAsistencia.textContent;
    btnAsistencia.disabled = true;
    btnAsistencia.innerHTML = '<span class="loader-inline"></span> Enviando...';

    const payload = {
        matricula: estudianteActual.matricula,
        fullnameEstudiante: estudianteActual.nombre,
        comunidad: estudianteActual.comunidad,
        mentorFullname: estudianteActual.mentor,
        campusOrigen: estudianteActual.campusOrigen,
        carrera: estudianteActual.carrera
    };

    try {
        const resp = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);

        const data = await resp.json();
        console.log('Respuesta servidor:', data);

        if (data.result === 'success') {
            mostrarMensajeExito('success', data);
            cargarEstadisticas(); // refresca contador
        } else if (data.result === 'duplicate') {
            mostrarMensajeExito('duplicate', data);
            cargarEstadisticas();
        } else if (data.result === 'error') {
            throw new Error(data.message || 'Error servidor');
        } else {
            throw new Error('Respuesta inesperada');
        }

    } catch (err) {
        console.error(err);
        mostrarError('No se pudo registrar. Intenta nuevamente.');
        btnAsistencia.disabled = false;
        btnAsistencia.textContent = originalText;
        btnAsistencia.dataset.loading = '0';
    }
}

function mostrarMensajeExito(tipo, data) {
    if (estudianteActual?.comunidad) {
        kitComunidadEl.textContent = estudianteActual.comunidad;
    }
    btnAsistencia.textContent = (tipo === 'duplicate') ? 'Ya registrado ✓' : 'Registrado ✓';
    btnAsistencia.classList.add('btn-registrado');
    btnAsistencia.disabled = true;
    btnAsistencia.dataset.loading = '0';

    mensajeExitoEl.classList.remove('hidden');

    if (tipo === 'duplicate' && !document.getElementById('notaDuplicado')) {
        const nota = document.createElement('div');
        nota.id = 'notaDuplicado';
        nota.textContent = 'Esta matrícula ya estaba registrada.'
            + (data.firstCheckinTime ? ' (Hora original: ' + data.firstCheckinTime + ')' : '');
        mensajeExitoEl.appendChild(nota);
    }
}


/* =========================
   UTILIDADES
========================= */
function mostrarError(msg) {
    errorMsgEl.textContent = msg;
}
function limpiarError() {
    errorMsgEl.textContent = '';
}

function resetFormulario() {
    limpiarError();
    matriculaInputEl.value = '';
    estudianteActual = null;
    tarjetaEl.classList.add('hidden');
    btnReset.disabled = true;
    mensajeExitoEl.classList.add('hidden');
    btnAsistencia.textContent = '¡Ya llegué!';
    btnAsistencia.disabled = false;
    btnAsistencia.classList.remove('btn-registrado');
    const notaDup = document.getElementById('notaDuplicado');
    if (notaDup) notaDup.remove();
    matriculaInputEl.focus();
}


/* =========================
   EXPONER FUNCIONES (si usas onclick)
========================= */
window.buscarEstudiante   = buscarEstudiante;
window.registrarAsistencia = registrarAsistencia;
window.resetFormulario     = resetFormulario;
