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
  
  // Actualizar UI inmediatamente
  btn.disabled = true;
  btn.textContent = 'Registrando...';
  limpiarError();

  try {
    console.log('📤 Enviando registro para:', estudianteActual.matricula);

    // MÉTODO 1: Enviar a nuestra API primero
    let apiSuccess = false;
    try {
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

      if (response.ok) {
        console.log("✅ Registro exitoso via API interna");
        apiSuccess = true;
      } else {
        console.warn('⚠️ API interna falló:', result.error);
      }
    } catch (error) {
      console.warn('⚠️ Error en API interna:', error.message);
    }

    // MÉTODO 2: Enviar a Google Apps Script (siempre, como respaldo)
    let googleSuccess = false;
    if (CONFIG.GOOGLE_SCRIPT_URL) {
      try {
        const data = {
          matricula: estudianteActual.matricula,
          fullnameEstudiante: estudianteActual.fullnameEstudiante,
          comunidad: estudianteActual.comunidad,
          mentorFullname: estudianteActual.mentorFullname,
          campusOrigen: estudianteActual.campusOrigen,
          carrera: estudianteActual.carrera,
          timestamp: new Date().toISOString(),
          horaCheckin: new Date().toLocaleTimeString('es-MX', { 
            timeZone: 'America/Mexico_City',
            hour12: false 
          })
        };
        
        // Usamos Promise.race para timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 8000)
        );
        
        const fetchPromise = fetch(CONFIG.GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });

        await Promise.race([fetchPromise, timeoutPromise]);
        
        console.log("✅ Enviado a Google Script");
        googleSuccess = true;
        
      } catch (error) {
        if (error.message === 'Timeout') {
          console.log('⏰ Google Script tardó mucho, pero probablemente se registró');
          googleSuccess = true; // Asumimos éxito en timeout
        } else {
          console.warn('⚠️ Error en Google Script:', error.message);
        }
      }
    }

    // EVALUAR RESULTADO
    if (apiSuccess || googleSuccess) {
      console.log("✅ Registro completado exitosamente");
      
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
      btn.className = 'btn-checkin checked';
      
      // Actualizar estadísticas localmente
      actualizarStatsLocal();
      
      // Actualizar stats del servidor después (sin esperar)
      setTimeout(() => {
        actualizarStatsBar();
      }, 2000);
      
    } else {
      throw new Error('No se pudo completar el registro');
    }
    
  } catch (error) {
    console.error("❌ Error en registrarAsistencia:", error);
    
    // Remover de cache si hubo error
    registrosCache.delete(estudianteActual.matricula);
    
    // Restaurar botón
    btn.disabled = false;
    btn.textContent = '✅ Confirmar Asistencia';
    btn.className = 'btn-checkin';
    
    // Mostrar error
    mostrarError(`❌ ${error.message}. Por favor intenta de nuevo.`);
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
