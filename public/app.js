// Campus Check-in - Frontend Actualizado
const CONFIG = {
  API_BASE: '', // Relativo a la misma app
  API_KEY: 'cc_checkin_2025_public_frontend', // Key pública para frontend
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
    // Verificar con el servidor si está registrado
    btn.disabled = true;
    btn.textContent = 'Verificando...';
    
    try {
      const yaRegistrado = await checkMatriculaRegistrada(estudiante.matricula);
      if (yaRegistrado) {
        registrosCache.add(estudiante.matricula);
        btn.disabled = true;
        btn.textContent = '✓ Ya registrado';
      } else {
        btn.disabled = false;
        btn.textContent = '¡Ya llegué!';
      }
    } catch (error) {
      console.error('Error verificando registro:', error);
      // Si falla la verificación, permitir el registro
      btn.disabled = false;
      btn.textContent = '¡Ya llegué!';
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
  
  const btn = document.getElementById('asistenciaBtn');
  const mensajeExito = document.getElementById('mensajeExito');
  
  // Prevenir doble clic
  if (btn.disabled || registrosCache.has(estudianteActual.matricula)) {
    return;
  }
  
  btn.disabled = true;
  btn.textContent = 'Registrando...';
  limpiarError();

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
    
    // Mostrar éxito
    mensajeExito.classList.remove('hidden');
    mensajeExito.innerHTML = `
      <p>✅ Registro de asistencia realizado<br>
        <b>¡Entrega el kit de ${estudianteActual.comunidad}!</b><br>
        <span class="small-note">Muestra esta pantalla al staff</span>
      </p>
    `;
    
    btn.textContent = '✓ Ya registrado';
    btn.disabled = true;
    
    // Actualizar estadísticas localmente
    actualizarStatsLocal();
    
    // Actualizar stats del servidor después
    setTimeout(() => {
      actualizarStatsBar();
    }, 2000);
    
  } catch (error) {
    console.error("❌ Error en registrarAsistencia:", error);
    
    // Remover de cache si hubo error
    registrosCache.delete(estudianteActual.matricula);
    
    mostrarError(`❌ ${error.message}. Por favor intenta de nuevo.`);
    btn.disabled = false;
    btn.textContent = '¡Ya llegué!';
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
  
  // Actualizar estadísticas cada 15 segundos
  setInterval(actualizarStatsBar, 15000);
  
  // Reset inicial
  resetCheckin();
  
  console.log("✅ Campus Check-in listo");
});

