// api/stats.js - Stats proxy
export default async function handler(req, res) {
  // Configurar CORS
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const requestOrigin = req.headers.origin;

  if (allowedOrigins.length > 0) {
    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
    }
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    // Validar API Key
    const apiKey = req.headers['x-api-key'];
    const validKeys = (
      process.env.API_KEY_CHECKIN_LIST ||
      process.env.API_KEY_CHECKIN ||
      ''
    )
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean);

    if (validKeys.length === 0) {
      console.error('❌ API_KEY_CHECKIN no configurada');
      return res.status(500).json({ error: 'Configuración del servidor incompleta' });
    }

    if (!apiKey || !validKeys.includes(apiKey)) {
      console.error('❌ API Key inválida en stats');
      return res.status(401).json({ error: 'Acceso no autorizado' });
    }

    const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
    const scriptKey = process.env.GOOGLE_SCRIPT_KEY;
    if (!scriptUrl || !scriptKey) {
      console.error('❌ GOOGLE_SCRIPT_URL/GOOGLE_SCRIPT_KEY no configurados');
      return res.status(500).json({ error: 'Configuración del servidor incompleta' });
    }

    const scriptResponse = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'stats',
        api_key: scriptKey
      })
    });

    if (!scriptResponse.ok) {
      console.error('❌ Error Apps Script:', scriptResponse.status, scriptResponse.statusText);
      return res.status(502).json({ error: 'Error consultando stats' });
    }

    const scriptResult = await scriptResponse.json();
    if (scriptResult.status >= 400 || scriptResult.error) {
      return res.status(scriptResult.status || 500).json({ error: scriptResult.error || 'Error consultando stats' });
    }

    return res.status(200).json({
      checkins: scriptResult.checkins || 0,
      lastCheckinTime: scriptResult.lastCheckinTime || '—'
    });
  } catch (error) {
    console.error('🔥 Error en API stats:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      debug: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
