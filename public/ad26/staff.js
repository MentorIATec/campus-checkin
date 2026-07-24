const form = document.getElementById('incidentForm');
const submitButton = document.getElementById('incidentSubmit');
const resultBox = document.getElementById('incidentResult');
const reasonSelect = document.getElementById('incidentMotivo');
const otherReasonWrap = document.getElementById('otherReasonWrap');

restoreStaffSession();

reasonSelect.addEventListener('change', () => {
  otherReasonWrap.hidden = reasonSelect.value !== 'OTRO';
});

document.getElementById('incidentReset').addEventListener('click', resetIncident);

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitButton.disabled) return;

  const pin = document.getElementById('staffPin').value;
  const staffId = document.getElementById('staffId').value.trim();
  const payload = {
    matricula: document.getElementById('incidentMatricula').value.trim().toUpperCase(),
    nombre: document.getElementById('incidentNombre').value.trim(),
    campusOrigen: document.getElementById('incidentCampus').value.trim(),
    motivo: reasonSelect.value,
    detalleOtro: document.getElementById('incidentOther').value.trim(),
    staffId
  };

  if (!/^[A-Z]\d{8}$/.test(payload.matricula) || !payload.nombre || !payload.campusOrigen || !pin) {
    showResult('Completa PIN, matrícula, nombre y campus.', false);
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Registrando...';
  resultBox.className = 'staff-result';

  try {
    const response = await fetch('/api/incidencia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-staff-pin': pin
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No fue posible registrar');

    sessionStorage.setItem('checkinAD26StaffId', staffId);
    showResult(result.alreadyRegistered
      ? 'Acceso autorizado. La matrícula ya contaba con check-in.'
      : 'Acceso autorizado e incidencia registrada.', true);
    clearStudentFields();
  } catch (error) {
    showResult(error.message, false);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Autorizar acceso y registrar';
  }
});

function restoreStaffSession() {
  document.getElementById('staffId').value = sessionStorage.getItem('checkinAD26StaffId') || '';
}

function clearStudentFields() {
  document.getElementById('incidentMatricula').value = '';
  document.getElementById('incidentNombre').value = '';
  document.getElementById('incidentCampus').value = '';
  document.getElementById('incidentOther').value = '';
  reasonSelect.value = 'TRANSFERENCIA_TARDIA';
  otherReasonWrap.hidden = true;
  document.getElementById('incidentMatricula').focus();
}

function resetIncident() {
  clearStudentFields();
  resultBox.className = 'staff-result';
  resultBox.textContent = '';
}

function showResult(message, success) {
  resultBox.textContent = message;
  resultBox.className = `staff-result ${success ? 'ok' : 'error'}`;
}
