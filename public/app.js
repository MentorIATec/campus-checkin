// Campus Check-in - Frontend Actualizado
const CONFIG = {
  API_BASE: '',
  API_KEY: '',
  GOOGLE_SCRIPT_URL: '',
  ...(window.CHECKIN_CONFIG || {})
};

let estudianteActual = null;
const registrosCache = new Set();
const STORAGE_KEY = 'checkinCacheFJ26';
const IN_FLIGHT_STORAGE_KEY = 'checkinInFlightFJ26';
const isDesktop = window.matchMedia && window.matchMedia('(min-width: 900px)').matches;
let isSearching = false;
let isSubmitting = false;
let autoResetTimer = null;

// Función principal: buscar estudiante via API
async function buscarEstudiante() {
  if (isSearching) return;
  limpiarError();
  const inputEl = document.getElementById('matriculaInput');
  const input = inputEl.value.trim().toUpperCase();

  if (!CONFIG.API_KEY) {
    mostrarError('Configuración incompleta. Revisa la API key.');
    return;
  }
  
  if (!input) {
    mostrarError('Ingresa una matrícula');
    return;
  }

  // Validación local básica
  if (!/^[A-Z]\d{8}$/.test(input)) {
    mostrarError('Formato inválido. Debe ser: A########');
    return;
  }

  // Mostrar loading
  const btnBuscar = document.getElementById('buscarBtn');
  isSearching = true;
  inputEl.disabled = true;
  if (btnBuscar) {
    btnBuscar.disabled = true;
    btnBuscar.textContent = '🔎 Buscando...';
  }
  try {
    console.log('🔍 Buscando estudiante via API:', input);
    
    const response = await fetch('/api/estudiante', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.API_KEY
      },
      body: JSON.stringify({
        matricula: input
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Error en la búsqueda');
    }

    if (result.success && result.data) {
      estudianteActual = result.data;
      await mostrarDatosEstudiante(result.data);
      console.log('✅ Estudiante encontrado:', result.data.nameEstudiante);
    } else {
      throw new Error('Estudiante no encontrado');
    }

  } catch (error) {
    console.error('❌ Error buscando estudiante:', error);
    mostrarError(`❌ ${error.message}`);
  } finally {
    isSearching = false;
    inputEl.disabled = false;
    if (btnBuscar) {
      btnBuscar.disabled = false;
      btnBuscar.textContent = isDesktop ? '🔍 Buscar estudiante' : '🔍 Buscar Estudiante';
    }
  }
}

async function mostrarDatosEstudiante(estudiante) {
  // Actualizar mentor/comunidad
  const mentorTitle = document.getElementById('mentorTitle');
  const mentorFullname = document.getElementById('mentorFullname');
  if (estudiante.noMentorAsignado) {
    if (mentorTitle) mentorTitle.textContent = 'Comunidad académica:';
    if (mentorFullname) mentorFullname.textContent = estudiante.mentorFullname || 'Escuela de Salud';
  } else {
    if (mentorTitle) mentorTitle.textContent = isDesktop ? 'Mentor/a asignado/a:' : 'Tu mentor/a asignado:';
    if (mentorFullname) mentorFullname.textContent = estudiante.mentorFullname || 'Sin asignar';
  }

  // Manejar foto del mentor
  const foto = document.getElementById('fotoMentor');
  const placeholder = document.getElementById('fotoPlaceholder');
  
  if (estudiante.fotoMentor) {
    foto.src = estudiante.fotoMentor;
    foto.alt = estudiante.mentorNickname || 'Mentor';
    foto.style.display = 'block';
    placeholder.style.display = 'none';
    
    foto.onerror = () => {
      foto.style.display = 'none';
      placeholder.style.display = 'flex';
    };
  } else {
    foto.style.display = 'none';
    placeholder.style.display = 'flex';
  }

  // Aplicar estilo de comunidad
  const studentCard = document.getElementById('studentCardBg');
  const comunidadKey = normalizarComunidadClass(estudiante.comunidad || '');
  studentCard.className = 'student-card bg-' + comunidadKey;

  // Actualizar datos del estudiante
  document.getElementById('fullnameEstudiante').textContent = estudiante.fullnameEstudiante || 'Estudiante';
  
  const comunidadBadge = document.getElementById('comunidadBadge');
  comunidadBadge.textContent = estudiante.comunidad || 'Sin comunidad';
  comunidadBadge.setAttribute('data-comunidad', estudiante.comunidad || '');

  document.getElementById('matriculaEstudiante').textContent = estudiante.matricula;
  document.getElementById('campusEstudiante').textContent = estudiante.campusOrigen || 'Campus no especificado';
  document.getElementById('carreraEstudiante').textContent = estudiante.carrera || 'Carrera no especificada';

  // Verificar estado del botón
  const btn = document.getElementById('asistenciaBtn');
  
  // Verificar cache local primero
  if (registrosCache.has(estudiante.matricula)) {
    btn.disabled = true;
    btn.textContent = '✓ Ya registrado';
    document.getElementById('mensajeExito').classList.add('hidden');
  } else {
    // Verificar con el servidor si está registrado
    btn.disabled = true;
    btn.textContent = 'Verificando...';
    
    try {
      const yaRegistrado = await checkMatriculaRegistrada(estudiante.matricula);
      if (yaRegistrado) {
        registrosCache.add(estudiante.matricula);
        persistirCache();
        btn.disabled = true;
        btn.textContent = '✓ Ya registrado';
        document.getElementById('mensajeExito').classList.add('hidden');
      } else {
        btn.disabled = false;
        btn.textContent = '✅ Confirmar asistencia presencial';
      }
    } catch (error) {
      console.error('Error verificando registro:', error);
      // Si falla la verificación, permitir el registro
      btn.disabled = false;
      btn.textContent = '✅ Confirmar asistencia presencial';
    }
  }

  document.getElementById('mensajeExito').classList.add('hidden');
  mostrarTarjeta();
}

async function checkMatriculaRegistrada(matricula) {
  try {
    const res = await fetch(`/api/checkin?matricula=${encodeURIComponent(matricula)}&t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'x-api-key': CONFIG.API_KEY
      },
      cache: 'no-cache'
    });
    
    if (!res.ok) throw new Error('Error verificando registro');
    
    const info = await res.json();
    return !!info.registered;
  } catch (error) {
    console.error('Error verificando matrícula:', error);
    return false;
  }
}

async function registrarAsistencia() {
  console.log("🌐 Iniciando registro de asistencia...");
  
  if (!estudianteActual) return;
  if (isSubmitting) return;
  
  const btn = document.getElementById('asistenciaBtn');
  const mensajeExito = document.getElementById('mensajeExito');
  
  // Prevenir doble clic
  if (btn.disabled || registrosCache.has(estudianteActual.matricula)) {
    return;
  }
  
  isSubmitting = true;
  setCardBusy(true);
  btn.disabled = true;
  btn.textContent = 'Registrando...';
  limpiarError();
  guardarInFlight(estudianteActual);

  try {
    // Enviar a API propia
    const response = await fetch('/api/checkin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.API_KEY
      },
      body: JSON.stringify({
        matricula: estudianteActual.matricula,
        fullnameEstudiante: estudianteActual.fullnameEstudiante,
        comunidad: estudianteActual.comunidad,
        mentorFullname: estudianteActual.mentorFullname,
        campusOrigen: estudianteActual.campusOrigen,
        carrera: estudianteActual.carrera
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Error registrando asistencia');
    }

    console.log("✅ Registro exitoso via API");
    
    // También enviar a Google Apps Script como fallback
    if (CONFIG.GOOGLE_SCRIPT_URL) {
      try {
        const data = {
          matricula: estudianteActual.matricula,
          fullnameEstudiante: estudianteActual.fullnameEstudiante,
          comunidad: estudianteActual.comunidad,
          mentorFullname: estudianteActual.mentorFullname,
          campusOrigen: estudianteActual.campusOrigen,
          carrera: estudianteActual.carrera
        };
        
        await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });
        console.log("✅ También enviado a Google Script");
      } catch (error) {
        console.warn('⚠️ Google Script falló (no crítico):', error);
      }
    }
    
    // Agregar a cache local
    registrosCache.add(estudianteActual.matricula);
    persistirCache();
    limpiarInFlight();
    
    // Mostrar éxito corto para flujo continuo
    mensajeExito.classList.remove('hidden');
    mensajeExito.classList.add('toast-short');
    mensajeExito.innerHTML = `
      <p>✅ Registro guardado</p>
    `;
    
    btn.textContent = isDesktop ? '✓ Ya registrado' : '✅ Listo';
    btn.disabled = true;
    
    // Actualizar estadísticas localmente
    actualizarStatsLocal();
    
    // Actualizar stats del servidor después
    setTimeout(() => {
      actualizarStatsBar();
    }, 2000);

    clearTimeout(autoResetTimer);
    autoResetTimer = setTimeout(() => {
      resetCheckin();
    }, 1800);
    
  } catch (error) {
    console.error("❌ Error en registrarAsistencia:", error);
    
    // Remover de cache si hubo error
    registrosCache.delete(estudianteActual.matricula);
    limpiarInFlight();
    
    mostrarError(`❌ ${error.message}. Por favor intenta de nuevo.`);
    btn.disabled = false;
    btn.textContent = '✅ Confirmar asistencia presencial';
    setCardBusy(false);
    isSubmitting = false;
  }
}

// Función para actualizar stats localmente
function actualizarStatsLocal() {
  const horaActual = new Date().toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const lastElement = document.getElementById('lastCheckin');
  if (lastElement) {
    lastElement.textContent = horaActual;
  }
  
  const totalElement = document.getElementById('totalCheckins');
  if (totalElement) {
    const currentTotal = parseInt(totalElement.textContent) || 0;
    totalElement.textContent = currentTotal + 1;
  }
}

async function actualizarStatsBar() {
  try {
    if (!CONFIG.API_KEY) return;
    const res = await fetch(`/api/stats?t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'x-api-key': CONFIG.API_KEY
      }
    });
    
    if (!res.ok) throw new Error('Error en respuesta');
    
    const info = await res.json();
    
    // Actualizar contadores
    const totalElement = document.getElementById('totalCheckins');
    if (totalElement && info.checkins) {
      totalElement.textContent = info.checkins;
    }
    
    // Actualizar último check-in
    const lastElement = document.getElementById('lastCheckin');
    if (lastElement && info.lastCheckinTime) {
      lastElement.textContent = info.lastCheckinTime;
    }
    
    console.log(`📊 Stats actualizadas: ${info.checkins || 0} registros`);
  } catch (error) {
    console.error('Error actualizando stats:', error);
    const totalElement = document.getElementById('totalCheckins');
    if (totalElement && totalElement.textContent === '0') {
      totalElement.textContent = "—";
    }
  }
}

function actualizarHoraActual() {
  const ahora = new Date();
  const h = ahora.getHours().toString().padStart(2, '0');
  const m = ahora.getMinutes().toString().padStart(2, '0');
  const timeElement = document.getElementById('currentTime');
  if (timeElement) {
    timeElement.textContent = `${h}:${m}`;
  }
}

// Funciones auxiliares (sin cambios)
function mostrarError(msg) {
  const errorElement = document.getElementById('errorMsg');
  if (errorElement) {
    errorElement.innerText = msg;
    errorElement.style.display = 'block';
    errorElement.style.color = '#c92e2e';
    errorElement.classList.remove('status-info');
  }
}

function limpiarError() {
  const errorElement = document.getElementById('errorMsg');
  if (errorElement) {
    errorElement.innerText = '';
    errorElement.style.display = 'none';
    errorElement.classList.remove('status-info');
  }
}

function mostrarTarjeta() {
  document.getElementById('tarjetaEstudiante').classList.remove('hidden');
  document.getElementById('checkin-section').style.display = 'none';
  document.getElementById('leyendaMatricula').style.display = 'none';
  limpiarError();
}

function ocultarTarjeta() {
  document.getElementById('tarjetaEstudiante').classList.add('hidden');
  document.getElementById('checkin-section').style.display = 'block';
  document.getElementById('leyendaMatricula').style.display = '';
}

function resetCheckin() {
  clearTimeout(autoResetTimer);
  estudianteActual = null;
  isSubmitting = false;
  setCardBusy(false);
  ocultarTarjeta();
  document.getElementById('matriculaInput').value = '';
  limpiarError();
  setResetButtonLabel('⬅️ Corregir matrícula');
  
  const mensajeExito = document.getElementById('mensajeExito');
  if (mensajeExito) {
    mensajeExito.classList.add('hidden');
    mensajeExito.classList.remove('toast-short');
  }
  
  setTimeout(() => {
    const input = document.getElementById('matriculaInput');
    if (input) input.focus();
  }, 250);
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Iniciando Campus Check-in...");

  cargarCache();
  restaurarInFlight();
  ajustarCopyPorDispositivo();
  
  // Configurar evento Enter en el input
  const inputMatricula = document.getElementById('matriculaInput');
  if (inputMatricula) {
    inputMatricula.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        buscarEstudiante();
      }
    });
  }
  
  // Actualizar estadísticas iniciales
  await actualizarStatsBar();
  
  // Actualizar hora cada segundo
  actualizarHoraActual();
  setInterval(actualizarHoraActual, 1000);
  
  // Actualizar estadísticas cada 15 segundos
  setInterval(actualizarStatsBar, isDesktop ? 15000 : 40000);
  
  // Reset inicial
  resetCheckin();
  
  console.log("✅ Campus Check-in listo");
});

function ajustarCopyPorDispositivo() {
  const leyendaMatricula = document.getElementById('leyendaMatricula');
  const leyendaStaff = document.getElementById('leyendaStaff');
  const mentorTitle = document.getElementById('mentorTitle');
  const buscarBtn = document.getElementById('buscarBtn');

  if (isDesktop) {
    if (leyendaMatricula) leyendaMatricula.classList.add('hidden');
    if (leyendaStaff) leyendaStaff.classList.remove('hidden');
    if (mentorTitle) mentorTitle.textContent = 'Mentor/a asignado/a:';
    if (buscarBtn) buscarBtn.textContent = '🔍 Buscar estudiante';
  } else {
    if (leyendaStaff) leyendaStaff.classList.add('hidden');
    if (leyendaMatricula) leyendaMatricula.classList.remove('hidden');
    if (mentorTitle) mentorTitle.textContent = 'Tu mentor/a asignado:';
    if (buscarBtn) buscarBtn.textContent = '🔍 Buscar Estudiante';
  }
}

function cargarCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return;
    items.forEach(item => {
      if (item && item.matricula) {
        registrosCache.add(String(item.matricula).trim().toUpperCase());
      }
    });
  } catch (error) {
    console.warn('⚠️ No se pudo cargar cache local:', error);
  }
}

function persistirCache() {
  try {
    const data = Array.from(registrosCache).slice(-200).map(m => ({
      matricula: m,
      ts: Date.now()
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('⚠️ No se pudo guardar cache local:', error);
  }
}

function mostrarMensajeYaRegistrado() {
  const mensajeExito = document.getElementById('mensajeExito');
  if (!mensajeExito) return;
  mensajeExito.classList.remove('hidden');
  mensajeExito.classList.remove('toast-short');
  mensajeExito.innerHTML = `
    <p>✓ Este estudiante ya cuenta con registro<br>
      <span class="small-note">Si necesitas corregir, vuelve a buscar la matrícula</span>
    </p>
  `;
}

function setResetButtonLabel(text) {
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.textContent = text;
  }
}

function normalizarComunidadClass(value) {
  if (!value) return 'SinComunidad';
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');
}

function setCardBusy(busy) {
  const card = document.getElementById('studentCardBg');
  const input = document.getElementById('matriculaInput');
  const buscarBtn = document.getElementById('buscarBtn');
  const resetBtn = document.getElementById('resetBtn');
  if (card) {
    card.classList.toggle('card-busy', !!busy);
  }
  if (input) input.disabled = !!busy;
  if (buscarBtn) buscarBtn.disabled = !!busy || isSearching;
  if (resetBtn) resetBtn.disabled = !!busy;
}

function guardarInFlight(estudiante) {
  try {
    sessionStorage.setItem(IN_FLIGHT_STORAGE_KEY, JSON.stringify({
      matricula: estudiante.matricula,
      ts: Date.now()
    }));
  } catch (error) {
    console.warn('⚠️ No se pudo guardar inFlight:', error);
  }
}

function limpiarInFlight() {
  try {
    sessionStorage.removeItem(IN_FLIGHT_STORAGE_KEY);
  } catch (error) {
    console.warn('⚠️ No se pudo limpiar inFlight:', error);
  }
}

async function restaurarInFlight() {
  try {
    const raw = sessionStorage.getItem(IN_FLIGHT_STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || !data.matricula) return;
    limpiarInFlight();
    const input = document.getElementById('matriculaInput');
    if (input) input.value = data.matricula;
    const yaRegistrado = await checkMatriculaRegistrada(data.matricula);
    if (yaRegistrado) {
      registrosCache.add(data.matricula);
      persistirCache();
      mostrarError('✅ Registro previo detectado. Puedes continuar con otra matrícula.');
      const errorElement = document.getElementById('errorMsg');
      if (errorElement) {
        errorElement.classList.add('status-info');
        errorElement.style.color = '#0062cc';
      }
    }
  } catch (error) {
    console.warn('⚠️ No se pudo restaurar inFlight:', error);
  }
}
