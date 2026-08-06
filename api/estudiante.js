import { consumeRateLimit } from '../lib/rate-limit.js';

// Lookup seguro. El navegador solo proporciona la matricula.
export default async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido' });
  if (!isAllowedOrigin(req)) return res.status(403).json({ error: 'Origen no permitido' });

  const rate = consumeRateLimit(req, {
    namespace: 'student-lookup',
    limit: 60,
    windowMs: 5 * 60 * 1000
  });
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfter));
    return res.status(429).json({ error: 'Demasiadas consultas. Espera un momento e intenta nuevamente.' });
  }

  try {
    const body = parseBody(req.body);
    const matricula = String(body.matricula || '').trim().toUpperCase();
    if (!/^[A-Z]\d{8}$/.test(matricula)) {
      return res.status(400).json({ error: 'Formato de matricula invalido' });
    }

    const result = await callAppsScript({ action: 'lookup', matricula });
    if (result.status >= 400 || result.error) {
      return res.status(result.status || 500).json({ error: publicError(result) });
    }

    return res.status(200).json({
      success: true,
      data: result.data || {},
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en lookup:', error);
    return res.status(502).json({ error: 'No fue posible consultar la matricula. Intenta nuevamente.' });
  }
}

function parseBody(body) {
  if (!body) return {};
  return typeof body === 'string' ? JSON.parse(body) : body;
}

function publicError(result) {
  if (result.status === 404) {
    return 'No encontramos tu matricula. Acercate con el staff para registrar tu acceso.';
  }
  return result.error || 'Error consultando estudiante';
}

async function callAppsScript(payload) {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  const scriptKey = process.env.GOOGLE_SCRIPT_KEY;
  if (!scriptUrl || !scriptKey) throw new Error('Apps Script no configurado');

  const controller = new AbortController();
  // Leave enough margin for Apps Script cold starts without reaching Vercel's limit.
  const timeout = setTimeout(() => controller.abort(), 12000);
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

function applyCors(req, res, methods) {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(req)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Checkin-Client');
}
