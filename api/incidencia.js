import { clearRateLimit, consumeRateLimit } from '../lib/rate-limit.js';

// Registro rapido de incidencias operado exclusivamente por staff.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido' });
  if (!isAllowedOrigin(req)) return res.status(403).json({ error: 'Origen no permitido' });

  const configuredPin = process.env.STAFF_PIN;
  const suppliedPin = String(req.headers['x-staff-pin'] || '');
  if (!configuredPin || !safeEqual(suppliedPin, configuredPin)) {
    const rate = consumeRateLimit(req, {
      namespace: 'staff-auth-failure',
      limit: 8,
      windowMs: 15 * 60 * 1000,
      ipOnly: true
    });
    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfter));
      return res.status(429).json({ error: 'Acceso bloqueado temporalmente por intentos fallidos' });
    }
    return res.status(401).json({ error: 'Acceso de staff no autorizado' });
  }
  clearRateLimit(req, 'staff-auth-failure');

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const matricula = String(body.matricula || '').trim().toUpperCase();
    const nombre = String(body.nombre || '').trim();
    const campusOrigen = String(body.campusOrigen || '').trim();
    const motivo = String(body.motivo || '').trim().toUpperCase();
    const detalleOtro = String(body.detalleOtro || '').trim();
    const staffId = String(body.staffId || '').trim();

    if (!/^[A-Z]\d{8}$/.test(matricula) || !nombre || !campusOrigen || !['TRANSFERENCIA_TARDIA', 'OTRO'].includes(motivo)) {
      return res.status(400).json({ error: 'Completa matricula, nombre, campus y motivo' });
    }

    const result = await callAppsScript({
      action: 'incident',
      matricula,
      nombre,
      campusOrigen,
      motivo,
      detalleOtro,
      staffId,
      source: 'STAFF_INCIDENCIA'
    });

    if (result.status >= 400 || result.error) {
      return res.status(result.status || 500).json({ error: result.error || 'No fue posible registrar la incidencia' });
    }

    return res.status(200).json({
      success: true,
      accessAuthorized: true,
      alreadyRegistered: !!result.alreadyRegistered,
      checkinId: result.checkinId || ''
    });
  } catch (error) {
    console.error('Error registrando incidencia:', error);
    return res.status(502).json({ error: 'No fue posible registrar la incidencia' });
  }
}

async function callAppsScript(payload) {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  const scriptKey = process.env.GOOGLE_SCRIPT_KEY;
  if (!scriptUrl || !scriptKey) throw new Error('Apps Script no configurado');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, api_key: scriptKey }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Apps Script ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function isAllowedOrigin(req) {
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  const origin = req.headers.origin;
  return allowed.length === 0 || !origin || allowed.includes(origin);
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}
