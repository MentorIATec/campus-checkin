// app.js - Código mejorado para el cliente
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbychVfr3mDDgGqZEFkZbGM94YDxP6OiC9GPfcVEUD4Gi-02eA08C41do4qkfwpWROmyUA/exec";
let estudiantesData = [];
let estudianteActual = null;

// Función fetchWithTimeout que faltaba
async function fetchWithTimeout(url, options = {}) {
  const { timeout = 15000 } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function cargarDatos() {
  try {
    const res = await fetch('estudiantes.json');
    if (!res.ok) throw new Error('Error al cargar datos');
    
    estudiantesData = await res.json();
    
    // Normalizar datos
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
    const res = await fetchWithTimeout(GOOGLE_SCRIPT_URL, {
      method: 'GET',
      timeout: 10000
    });
    
    if (!res.ok) throw new Error('Error en respuesta');
    
    const info = await res.json();
    
    // Actualizar contadores
    document.getElementById('totalCheckins').textContent = info.checkins || 0;
    
    // Actualizar último check-in si está disponible
    if (info.lastCheckinTime) {
      document.getElementById('lastCheckin').textContent = info.lastCheckinTime;
    }
  } catch (error) {
    console.error('Error actualizando stats:', error);
    document.getElementById('totalCheckins').textContent = "—";
  }
}

function actualizarHoraActual() {
  const ahora = new Date();
  const h = ahora.getHours().toString().padStart(2, '0');
  const m = ahora.getMinutes().toString().padStart(2, '0');
  document.getElementById('currentTime').textContent = `${h}:${m}`;
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

function mostrarDatosEstudiante(e) {
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

  // Resetear botón y verificar estado
  const btn = document.getElementById('asistenciaBtn');
  btn.disabled = true;
  btn.textContent = 'Verificando...';

  // Verificar si ya hizo check-in
  checkMatriculaRegistrada(e.matricula).then(yaRegistrado => {
    btn.disabled = yaRegistrado;
    btn.textContent = yaRegistrado ? '✓ Ya registrado' : '¡Ya llegué!';
  }).catch(() => {
    // Si falla la verificación, permitir el registro
    btn.disabled = false;
    btn.textContent = '¡Ya llegué!';
  });

  document.getElementById('mensajeExito').classList.add('hidden');
  mostrarTarjeta();
}

async function checkMatriculaRegistrada(matricula) {
  try {
    const res = await fetchWithTimeout(`${GOOGLE_SCRIPT_URL}?matricula=${encodeURIComponent(matricula)}`, {
      method: 'GET',
      timeout: 10000
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
  console.log("🌐 registrarAsistencia: iniciada");
  
  if (!estudianteActual) return;
  
  const data = {
    matricula: estudianteActual.matricula,
    fullnameEstudiante: estudianteActual.fullnameEstudiante,
    comunidad: estudianteActual.comunidad,
    mentorFullname: estudianteActual.mentorFullname,
    campusOrigen: estudianteActual.campusOrigen,
    carrera: estudianteActual.carrera
  };
  
  const btn = document.getElementById('asistenciaBtn');
  btn.disabled = true;
  btn.textContent = 'Registrando...';

  try {
    const res = await fetchWithTimeout(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // Importante para Google Apps Script
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      timeout: 15000
    });
    
    // Con mode: 'no-cors', no podemos leer la respuesta
    // Asumimos éxito y verificamos después
    console.log("✅ Petición enviada (modo no-cors)");
    
    // Esperar un momento y verificar si se registró
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const yaRegistrado = await checkMatriculaRegistrada(estudianteActual.matricula);
    
    if (yaRegistrado) {
      // Éxito confirmado
      document.getElementById('mensajeExito').classList.remove('hidden');
      document.getElementById('kitComunidad').textContent = estudianteActual.comunidad;
      btn.textContent = '✓ Ya registrado';
      
      // Actualizar último check-in
      const horaActual = new Date().toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      document.getElementById('lastCheckin').textContent = horaActual;
      
      // Actualizar estadísticas
      actualizarStatsBar();
    } else {
      throw new Error("No se pudo confirmar el registro");
    }
    
  } catch (error) {
    console.error("❌ Error en registrarAsistencia:", error);
    
    // Intentar verificar si se registró a pesar del error
    try {
      const yaRegistrado = await checkMatriculaRegistrada(estudianteActual.matricula);
      if (yaRegistrado) {
        // Se registró a pesar del error
        document.getElementById('mensajeExito').classList.remove('hidden');
        document.getElementById('kitComunidad').textContent = estudianteActual.comunidad;
        btn.textContent = '✓ Ya registrado';
        actualizarStatsBar();
        return;
      }
    } catch (e) {
      console.error("Error verificando registro:", e);
    }
    
    // Si llegamos aquí, hubo un error real
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
  actualizarStatsBar();
  
  // Actualizar hora cada segundo
  actualizarHoraActual();
  setInterval(actualizarHoraActual, 1000);
  
  // Actualizar estadísticas cada 30 segundos
  setInterval(actualizarStatsBar, 30000);
  
  // Reset inicial
  resetCheckin();
  
  console.log("✅ Aplicación lista");
});
