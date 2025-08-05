// api/checkin.js - Registrar asistencia
export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://campus-checkin.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Validar API Key
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY_CHECKIN) {
      return res.status(401).json({ error: 'Acceso no autorizado' });
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

      // Registrar en Google Apps Script (si está configurado)
      const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;
      if (googleScriptUrl) {
        const registroData = {
          matricula,
          fullnameEstudiante,
          comunidad,
          mentorFullname,
          campusOrigen,
          carrera,
          timestamp: new Date().toISOString(),
          horaCheckin: new Date().toLocaleTimeString('es-MX', { 
            timeZone: 'America/Mexico_City',
            hour12: false 
          }),
          fechaCheckin: new Date().toLocaleDateString('es-MX', {
            timeZone: 'America/Mexico_City'
          })
        };

        try {
          await fetch(googleScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(registroData)
          });
          console.log('✅ Check-in registrado:', matricula);
        } catch (error) {
          console.error('⚠️ Error enviando a Google Script:', error);
          // No fallar por esto - continuar
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Check-in registrado exitosamente',
        data: {
          matricula,
          nombre: fullnameEstudiante,
          comunidad,
          timestamp: new Date().toISOString()
        }
      });

    } else if (req.method === 'GET') {
      // VERIFICAR SI ESTÁ REGISTRADO (implementar según necesidad)
      const { matricula } = req.query;
      
      if (!matricula) {
        return res.status(400).json({ error: 'Matrícula requerida' });
      }

      // Aquí podrías verificar en la base de datos si ya está registrado
      // Por ahora retornamos que no está registrado
      return res.status(200).json({
        matricula,
        registered: false, // Cambiar según lógica real
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('🔥 Error en API check-in:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
}
