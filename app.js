const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz0_8hWuFGaZ9LjA1tK1iUlpu8aDFqA71-J9bz2wfG8joKtapNrABpvmQ3IbhOAH3mx2g/exec";
let estudiantesData = [];
let estudianteActual = null;

// Cache local para evitar verificaciones repetidas
const registrosCache = new Set();

async function cargarDatos() {
  try {
    const res = await fetch('estudiantes.json');
    if (!res.ok) throw new Error('Error al cargar datos');
    
    estudiantesData = await res.json();
    estudiantesData.forEach(e => {
      e.matricula = (e.matricula || e["matrícula"] || "").trim().toUpperCase();
      e.comunidad = (e.comunidad || "").trim();
      e.nameEstudiante = (e.nameEstudiante || "").trim();
      e.fullnameEstudiante = (e.fullnameEstudiante || "").trim();
      e.mentorFullname = (e.mentorFullname || "").trim();
      e.mentorNickname = (e.mentorNickname || "").trim();
      e.fotoMentor = (e.fotoMentor || "").trim();
      e.campusOrigen = (e.campusOrigen || "").trim();
      e.carrera = (e.carrera || "").trim();
    });
    console.log(`✅ Datos cargados: ${estudiantesData.length} estudiantes`);
  } catch (error) {
    console.error('❌ Error cargando datos:', error);
    mostrarError('No se pudo cargar la base de estudiantes. Actualiza la página.');
  }
}

function mostrarError(msg) {
  const errorElement = document.getElementById('errorMsg');
  if (errorElement) {
    errorElement.innerText = msg;
    errorElement.style.display = 'block';
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

async function actualizarStatsBar() {
  try {
    // No usar no-cors para GET porque necesitamos leer la respuesta
    const res = await fetch(GOOGLE_SCRIPT_URL + '?t=' + Date.now(), {
      method: 'GET',
      cache: 'no-cache'
    });
    
    if (!res.ok) throw new Error('Error en respuesta');
    
    const info = await res.json();
    
    // Actualizar contadores
    const totalElement = document.getElementById('totalCheckins');
    if (totalElement) {
      totalElement.textContent = info.checkins || 0;
    }
    
    // Actualizar último check-in
    const lastElement = document.getElementById('lastCheckin');
    if (lastElement && info.lastCheckinTime) {
      lastElement.textContent = info.lastCheckinTime;
    }
    
    console.log(`📊 Stats actualizadas: ${info.checkins} registros`);
  } catch (error) {
    console.error('Error actualizando stats:', error);
    document.getElementById('totalCheckins').textContent = "—";
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

function buscarEstudiante() {
  limpiarError();
  const input = document.getElementById('matriculaInput').value.trim().toUpperCase();
  
  if (!input) {
    mostrarError('Ingresa una matrícula');
    return;
  }
  
  const estudiante = estudiantesData.find(x => x.matricula === input);
  
  if (!estudiante) {
    mostrarError('Matrícula no encontrada');
    return;
  }
  
  estudianteActual = estudiante;
  mostrarDatosEstudiante(estudiante);
}

async function mostrarDatosEstudiante(e) {
  // Actualizar mentor
  document.getElementById('mentorFullname').textContent = e.mentorFullname;

  // Manejar foto del mentor
  const foto = document.getElementById('fotoMentor');
  const placeholder = document.getElementById('fotoPlaceholder');
  
  if (e.fotoMentor) {
    foto.src = e.fotoMentor;
    foto.alt = e.mentorNickname;
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
  const comunidadKey = e.comunidad.replace(/ /g, '');
  studentCard.className = 'student-card bg-' + comunidadKey;

  // Actualizar datos del estudiante
  document.getElementById('fullnameEstudiante').textContent = e.fullnameEstudiante;
  
  const comunidadBadge = document.getElementById('comunidadBadge');
  comunidadBadge.textContent = e.comunidad;
  comunidadBadge.setAttribute('data-comunidad', e.comunidad);

  document.getElementById('matriculaEstudiante').textContent = e.matricula;
  document.getElementById('campusEstudiante').textContent = e.campusOrigen;
  document.getElementById('carreraEstudiante').textContent = e.carrera;

  // Verificar estado del botón
  const btn = document.getElementById('asistenciaBtn');
  
  // Primero verificar cache local
  if (registrosCache.has(e.matricula)) {
    btn.disabled = true;
    btn.textContent = '✓ Ya registrado';
  } else {
    // Si no está en cache, verificar en servidor
    btn.disabled = true;
    btn.textContent = 'Verificando...';
    
    try {
      const yaRegistrado = await checkMatriculaRegistrada(e.matricula);
      if (yaRegistrado) {
        registrosCache.add(e.matricula);
        btn.disabled = true;
        btn.textContent = '✓ Ya registrado';
      } else {
        btn.disabled = false;
        btn.textContent = '¡Ya llegué!';
      }
    } catch (error) {
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
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?matricula=${encodeURIComponent(matricula)}&t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-cache'
    });
    
    if (!res.ok) throw new Error('Error en respuesta');
    
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
    // Preparar datos
    const data = {
      matricula: estudianteActual.matricula,
      fullnameEstudiante: estudianteActual.fullnameEstudiante,
      comunidad: estudianteActual.comunidad,
      mentorFullname: estudianteActual.mentorFullname,
      campusOrigen: estudianteActual.campusOrigen,
      carrera: estudianteActual.carrera
    };
    
    // Enviar registro con no-cors
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    console.log("✅ Petición enviada");
    
    // Agregar a cache local inmediatamente
    registrosCache.add(estudianteActual.matricula);
    
    // Mostrar éxito inmediatamente (optimista)
    mensajeExito.classList.remove('hidden');
    mensajeExito.innerHTML = `
      <p>✅ Registro de asistencia realizado<br>
        <b>¡Entrega el kit de ${estudianteActual.comunidad}!</b><br>
        <span class="small-note">Muestra esta pantalla al staff</span>
      </p>
    `;
    
    btn.textContent = '✓ Ya registrado';
    btn.disabled = true;
    
    // Actualizar hora local
    const horaActual = new Date().toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const lastElement = document.getElementById('lastCheckin');
    if (lastElement) {
      lastElement.textContent = horaActual;
    }
    
    // Actualizar contador localmente (incrementar)
    const totalElement = document.getElementById('totalCheckins');
    if (totalElement) {
      const currentTotal = parseInt(totalElement.textContent) || 0;
      totalElement.textContent = currentTotal + 1;
    }
    
    // Actualizar stats del servidor después de 2 segundos
    setTimeout(() => {
      actualizarStatsBar();
    }, 2000);
    
  } catch (error) {
    console.error("❌ Error en registrarAsistencia:", error);
    
    // Remover de cache si hubo error
    registrosCache.delete(estudianteActual.matricula);
    
    mostrarError("Error al registrar. Por favor intenta de nuevo.");
    btn.disabled = false;
    btn.textContent = '¡Ya llegué!';
  }
}

function resetCheckin() {
  estudianteActual = null;
  ocultarTarjeta();
  document.getElementById('matriculaInput').value = '';
  limpiarError();
  
  // Ocultar mensaje de éxito si está visible
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
  console.log("🚀 Iniciando aplicación...");
  
  // Cargar datos
  await cargarDatos();
  
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
  
  // Actualizar estadísticas cada 15 segundos (más frecuente)
  setInterval(actualizarStatsBar, 15000);
  
  // Reset inicial
  resetCheckin();
  
  console.log("✅ Aplicación lista");
});
