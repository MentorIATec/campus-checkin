// Campus Check-in - Frontend con Registro Arreglado
const CONFIG = {
  API_BASE: '', // Relativo a la misma app
  API_KEY: 'cc_checkin_2025_karen_secure_xyz789abc123',
  GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbz0_8hWuFGaZ9LjA1tK1iUlpu8aDFqA71-J9bz2wfG8joKtapNrABpvmQ3IbhOAH3mx2g/exec"
};

let estudianteActual = null;
const registrosCache = new Set();

// Función principal: buscar estudiante via API
async function buscarEstudiante() {
  limpiarError();
  const input = document.getElementById('matriculaInput').value.trim().toUpperCase();
  
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
  const errorElement = document.getElementById('errorMsg');
  errorElement.style.display = 'block';
  errorElement.textContent = '🔍 Buscando estudiante...';
  errorElement.style.color = '#0062cc';

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
      mostrarDatosEstudiante(result.data);
      limpiarError();
      console.log('✅ Estudiante encontrado:', result.data.nameEstudiante);
    } else {
      throw new Error('Estudiante no encontrado');
    }

  } catch (error) {
    console.error('❌ Error buscando estudiante:', error);
    mostrarError(`❌ ${error.message}`);
  }
}

async function mostrarDatosEstudiante(estudiante) {
  // Actualizar mentor
  document.getElementById('mentorFullname').textContent = estudiante.mentorFullname || 'Sin asignar';

  // Manejar foto del mentor
const foto = document.getElementById('fotoMentor');
const placeholder = document.getElementById('fotoPlaceholder');

if (estudiante.fotoMentor) {
  // Mostrar loading state
  foto.className = 'mentor-foto loading';
  foto.style.display = 'block';
  placeholder.style.display = 'none';
  
  // Precargar imagen
  const img = new Image();
  img.onload = () => {
    // Imagen cargada exitosamente
    foto.src = estudiante.fotoMentor;
    foto.alt = `Foto de ${estudiante.mentorNickname || estudiante.mentorFullname}`;
    foto.className = 'mentor-foto'; // Remover loading
    console.log('✅ Foto de mentor cargada:', estudiante.fotoMentor);
  };
  
  img.onerror = () => {
    // Error cargando imagen
    console.warn('⚠️ Error cargando foto del mentor:', estudiante.fotoMentor);
    foto.style.display = 'none';
    placeholder.style.display = 'flex';
    placeholder.title = `Foto no disponible para ${estudiante.mentorNickname}`;
  };
  
  // Timeout si tarda mucho
  setTimeout(() => {
    if (foto.className.includes('loading')) {
      console.warn('⏰ Timeout cargando foto del mentor');
      foto.style.display = 'none';
      placeholder.style.display = 'flex';
      placeholder.title = `Foto no disponible para ${estudiante.mentorNickname}`;
    }
  }, 5000);
  
  img.src = estudiante.fotoMentor;
  
} else {
  // No hay foto configurada
  foto.style.display = 'none';
  placeholder.style.display = 'flex';
  placeholder.title = `${estudiante.mentorNickname || estudiante.mentorFullname}`;
}

  // Aplicar estilo de comunidad
  const studentCard = document.getElementById('studentCardBg');
  const comunidadKey = (estudiante.comunidad || '').replace(/ /g, '');
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
  } else {
    btn.disabled = false;
    btn.textContent = '✅ Confirmar Asistencia';
  }

  document.getElementById('mensajeExito').classList.add('hidden');
  mostrarTarjeta();
}

async function registrarAsistencia() {
  console.log("🌐 Iniciando registro de asistencia...");
  
  if (!estudianteActual) {
    console.error('❌ No hay estudiante actual');
    return;
  }
  
  const btn = document.getElementById('asistenciaBtn');
  const mensajeExito = document.getElementById('mensajeExito');
  
  // Prevenir doble clic
  if (btn.disabled || registrosCache.has(estudianteActual.matricula)) {
    console.log('⚠️ Registro ya procesado o en proceso');
    return;
  }
  
  // ⚡ ACTUALIZAR UI INMEDIATAMENTE (SIN ESPERAR APIS)
  btn.disabled = true;
  btn.textContent = '✓ Ya registrado';
  btn.className = 'btn-checkin checked';
  
  // Agregar a cache local inmediatamente
  registrosCache.add(estudianteActual.matricula);
  
  // Mostrar mensaje de éxito INMEDIATAMENTE
  mensajeExito.classList.remove('hidden');
  mensajeExito.innerHTML = `
    <p>✅ Registro de asistencia realizado<br>
      <b>¡Entrega el kit de ${estudianteActual.comunidad}!</b><br>
      <span class="small-note">Muestra esta pantalla al staff</span>
    </p>
  `;
  
  // Actualizar estadísticas localmente
  actualizarStatsLocal();
  
  limpiarError();
  console.log("✅ UI actualizada inmediatamente");

  // 📡 ENVIAR A APIS EN SEGUNDO PLANO (SIN BLOQUEAR UI)
  enviarRegistroEnSegundoPlano(estudianteActual);
}

// Nueva función para manejar APIs en segundo plano
async function enviarRegistroEnSegundoPlano(estudiante) {
  console.log('📤 Enviando registro en segundo plano para:', estudiante.matricula);

  // MÉTODO 1: API Interna (sin esperar)
  fetch('/api/checkin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.API_KEY
    },
    body: JSON.stringify({
      matricula: estudiante.matricula,
      fullnameEstudiante: estudiante.fullnameEstudiante,
      comunidad: estudiante.comunidad,
      mentorFullname: estudiante.mentorFullname,
      campusOrigen: estudiante.campusOrigen,
      carrera: estudiante.carrera
    })
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      console.log("✅ API interna completada exitosamente");
    } else {
      console.warn('⚠️ API interna falló:', result.error);
    }
  })
  .catch(error => {
    console.warn('⚠️ Error en API interna:', error.message);
  });

  // MÉTODO 2: Google Apps Script (sin esperar)
  if (CONFIG.GOOGLE_SCRIPT_URL) {
    const data = {
      matricula: estudiante.matricula,
      fullnameEstudiante: estudiante.fullnameEstudiante,
      comunidad: estudiante.comunidad,
      mentorFullname: estudiante.mentorFullname,
      campusOrigen: estudiante.campusOrigen,
      carrera: estudiante.carrera,
      timestamp: new Date().toISOString(),
      horaCheckin: new Date().toLocaleTimeString('es-MX', { 
        timeZone: 'America/Mexico_City',
        hour12: false 
      })
    };
    
    fetch(CONFIG.GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })
    .then(() => {
      console.log("✅ Google Script enviado exitosamente");
    })
    .catch(error => {
      console.warn('⚠️ Error en Google Script:', error.message);
    });
  }

  // Actualizar stats del servidor después (sin bloquear)
  setTimeout(() => {
    actualizarStatsBar();
  }, 3000);
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
    const res = await fetch(CONFIG.GOOGLE_SCRIPT_URL + '?t=' + Date.now(), {
      method: 'GET',
      cache: 'no-cache'
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
    // No mostrar error al usuario, solo en consola
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
  }
}

function limpiarError() {
  const errorElement = document.getElementById('errorMsg');
  if (errorElement) {
    errorElement.innerText = '';
    errorElement.style.display = 'none';
  }
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

function resetCheckin() {
  estudianteActual = null;
  ocultarTarjeta();
  document.getElementById('matriculaInput').value = '';
  limpiarError();
  
  const mensajeExito = document.getElementById('mensajeExito');
  if (mensajeExito) {
    mensajeExito.classList.add('hidden');
  }
  
  setTimeout(() => {
    const input = document.getElementById('matriculaInput');
    if (input) input.focus();
  }, 250);
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Iniciando Campus Check-in...");
  
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
  
  // Actualizar estadísticas cada 30 segundos
  setInterval(actualizarStatsBar, 30000);
  
  // Reset inicial
  resetCheckin();
  
  console.log("✅ Campus Check-in listo");
});
