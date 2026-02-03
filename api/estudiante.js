// api/estudiante.js - Campus Check-in API
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Validar API Key
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
      console.error('❌ API Key inválida recibida');
      return res.status(401).json({ 
        error: 'Acceso no autorizado',
        timestamp: new Date().toISOString()
      });
    }

    // 2. Validar método y datos
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    // 3. Parsear solicitud
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
      return res.status(400).json({ error: 'Cuerpo de solicitud inválido' });
    }

    const { matricula } = body;

    // 4. Validar matrícula
    if (!matricula || !/^[A-Z]\d{8}$/.test(matricula.trim())) {
      return res.status(400).json({ 
        error: 'Formato de matrícula inválido',
        formato: 'Debe ser: A########'
      });
    }

    // 5. Consultar Apps Script (lookup seguro)
    const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
    const scriptKey = process.env.GOOGLE_SCRIPT_KEY;

    if (!scriptUrl || !scriptKey) {
      console.error('❌ GOOGLE_SCRIPT_URL/GOOGLE_SCRIPT_KEY no configurados');
      return res.status(500).json({ error: 'Configuración del servidor incompleta' });
    }

    console.log('🔍 Buscando estudiante:', matricula);
    console.log('🔍 Consultando Apps Script');

    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'lookup',
        matricula: matricula.trim().toUpperCase(),
        api_key: scriptKey
      })
    });

    if (!response.ok) {
      console.error('❌ Error Apps Script:', response.status, response.statusText);
      throw new Error(`Error Apps Script: ${response.status}`);
    }

    const result = await response.json();
    if (result.status >= 400 || result.error) {
      return res.status(result.status || 500).json({ error: result.error || 'Error en lookup' });
    }

    const safeData = result.data || {};
    console.log('✅ Estudiante encontrado:', matricula, '-', safeData.nameEstudiante);

    return res.status(200).json({
      success: true,
      data: safeData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🔥 Error en API estudiante:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: 'Por favor intenta de nuevo',
      debug: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
