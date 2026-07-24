import { consumeRateLimit } from '../lib/rate-limit.js';

// Resumen operativo ligero; el dashboard principal vive en Sheets.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metodo no permitido' });
  if (!isAllowedOrigin(req)) return res.status(403).json({ error: 'Origen no permitido' });

  const rate = consumeRateLimit(req, {
    namespace: 'stats-read',
    limit: 5,
    windowMs: 5 * 60 * 1000,
    ipOnly: true
  });
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfter));
    return res.status(429).json({ error: 'Estadisticas temporalmente limitadas' });
  }

  try {
    const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
    const scriptKey = process.env.GOOGLE_SCRIPT_KEY;
    if (!scriptUrl || !scriptKey) throw new Error('Apps Script no configurado');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stats', api_key: scriptKey }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) throw new Error(`Apps Script ${response.status}`);
    const result = await response.json();
    if (result.status >= 400 || result.error) throw new Error(result.error || 'Stats no disponibles');

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      checkins: result.checkins || 0,
      lastCheckinTime: result.lastCheckinTime || '—'
    });
  } catch (error) {
    console.error('Error consultando stats:', error);
    return res.status(502).json({ error: 'Estadisticas no disponibles' });
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
