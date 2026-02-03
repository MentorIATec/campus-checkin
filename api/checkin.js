// api/checkin.js - Registrar asistencia
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
      console.error('❌ API Key inválida en checkin');
      return res.status(401).json({ 
        error: 'Acceso no autorizado'
      });
    }

    if (req.method === 'POST') {
      // REGISTRAR CHECK-IN
      let body;
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } catch (e) {
        return res.status(400).json({ error: 'Datos inválidos' });
      }

      const { 
        matricula, 
        fullnameEstudiante, 
        comunidad, 
        mentorFullname,
        campusOrigen,
        carrera 
      } = body;

      // Validar datos requeridos
      if (!matricula || !fullnameEstudiante || !comunidad) {
        return res.status(400).json({ 
          error: 'Datos incompletos',
          required: ['matricula', 'fullnameEstudiante', 'comunidad']
        });
      }

      // Registrar en Apps Script (idempotente)
      const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
      const scriptKey = process.env.GOOGLE_SCRIPT_KEY;
      if (!scriptUrl || !scriptKey) {
        console.error('❌ GOOGLE_SCRIPT_URL/GOOGLE_SCRIPT_KEY no configurados');
        return res.status(500).json({ error: 'Configuración del servidor incompleta' });
      }

      const registroData = {
        action: 'checkin',
        api_key: scriptKey,
        matricula,
        fullnameEstudiante,
        comunidad,
        mentorFullname,
        campusOrigen,
        carrera,
        source: 'onsite'
      };

      const scriptResponse = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registroData)
      });

      if (!scriptResponse.ok) {
        console.error('❌ Error Apps Script:', scriptResponse.status, scriptResponse.statusText);
        return res.status(502).json({ error: 'Error registrando asistencia' });
      }

      const scriptResult = await scriptResponse.json();
      if (scriptResult.status >= 400 || scriptResult.error) {
        return res.status(scriptResult.status || 500).json({ error: scriptResult.error || 'Error registrando asistencia' });
      }

      return res.status(200).json({
        success: true,
        message: 'Check-in registrado exitosamente',
        data: {
          matricula,
          nombre: fullnameEstudiante,
          comunidad,
          timestamp: scriptResult.timestamp || new Date().toISOString(),
          alreadyRegistered: !!scriptResult.alreadyRegistered
        }
      });

    } else if (req.method === 'GET') {
      // VERIFICAR SI ESTÁ REGISTRADO
      const { matricula } = req.query;
      
      if (!matricula) {
        return res.status(400).json({ error: 'Matrícula requerida' });
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
          action: 'lookup',
          api_key: scriptKey,
          matricula
        })
      });

      if (!scriptResponse.ok) {
        return res.status(502).json({ error: 'Error consultando estado' });
      }

      const scriptResult = await scriptResponse.json();
      if (scriptResult.status >= 400 || scriptResult.error) {
        return res.status(scriptResult.status || 500).json({ error: scriptResult.error || 'Error consultando estado' });
      }

      return res.status(200).json({
        matricula,
        registered: !!(scriptResult.data && scriptResult.data.yaRegistrado),
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('🔥 Error en API check-in:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      debug: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
