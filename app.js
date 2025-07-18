let mentoresData = [];
let mentorActual = null;

// Cargar datos al iniciar
fetch('mentores.json')
  .then(res => res.json())
  .then(data => mentoresData = data);

function buscarMentor() {
  const input = document.getElementById('matriculaInput');
  const matricula = input.value.trim().toUpperCase();
  document.getElementById('errorMsg').textContent = '';
  const mentor = mentoresData.find(m => m.matricula === matricula);
  if (!mentor) {
    document.getElementById('errorMsg').textContent = 'Matrícula no encontrada.';
    return;
  }
  mentorActual = mentor;
  mostrarTarjetaMentor();
}

function mostrarTarjetaMentor() {
  document.getElementById('ingresoMatricula').classList.add('hidden');
  document.getElementById('tarjetaMentor').classList.remove('hidden');

  // Set card color by comunidad
  const comunidadKey = mentorActual.comunidad.trim().toLowerCase();
  const tarjeta = document.getElementById('comunidadBox');
  tarjeta.className = 'tarjeta-comunidad comunidad-' + comunidadKey;

  document.getElementById('fotoMentor').src = mentorActual.urlFoto;
  document.getElementById('nombreMentor').textContent = mentorActual.nombreCompleto;
  document.getElementById('comunidadMentor').textContent = mentorActual.comunidad;
}

function registrarAsistencia() {
  // Aquí va el código para enviar a Google Sheets o Airtable
  // Ejemplo de Google Forms: fetch(URL, { method: 'POST', body: ... })
  document.getElementById('mensajeExito').classList.remove('hidden');
  document.getElementById('asistenciaBtn').style.display = 'none';
}

function resetForm() {
  document.getElementById('tarjetaMentor').classList.add('hidden');
  document.getElementById('ingresoMatricula').classList.remove('hidden');
  document.getElementById('matriculaInput').value = '';
  document.getElementById('mensajeExito').classList.add('hidden');
  document.getElementById('asistenciaBtn').style.display = '';
}
