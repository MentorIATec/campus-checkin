// api/estudiante.js - Campus Check-in API
export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://campus-checkin.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Validar API Key
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY_CHECKIN) {
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

    // 5. Cargar datos desde Gist Secret
    const gistUrl = process.env.GIST_URL;
    if (!gistUrl) {
      console.error('❌ GIST_URL no configurada');
      return res.status(500).json({ error: 'Configuración del servidor incompleta' });
    }

    console.log('🔍 Buscando estudiante:', matricula);
    
    const response = await fetch(gistUrl, {
      headers: {
        'User-Agent': 'Campus-Checkin-API/1.0'
      }
    });

    if (!response.ok) {
      console.error('❌ Error cargando datos:', response.status);
      throw new Error('Error al cargar base de datos');
    }

    const estudiantes = await response.json();

    // 6. Buscar estudiante
    const estudiante = estudiantes.find(e => 
      (e.matricula || e.matrícula)?.trim().toUpperCase() === matricula.trim().toUpperCase()
    );

    if (!estudiante) {
      console.log('❌ Estudiante no encontrado:', matricula);
      return res.status(404).json({ 
        error: 'Estudiante no encontrado',
        matricula: matricula
      });
    }

    // 7. Preparar respuesta segura
    const safeData = {
      matricula: estudiante.matricula || estudiante.matrícula,
      fullnameEstudiante: estudiante.fullnameEstudiante?.trim(),
      nameEstudiante: estudiante.nameEstudiante?.trim(),
      mentorFullname: estudiante.mentorFullname?.trim(),
      mentorNickname: estudiante.mentorNickname?.trim(),
      fotoMentor: estudiante.fotoMentor?.trim(),
      comunidad: estudiante.comunidad?.trim(),
      campusOrigen: estudiante.campusOrigen?.trim(),
      carrera: estudiante.carrera?.trim(),
      whatsappMentor: estudiante.whatsappMentor?.trim()
    };

    // 8. Log exitoso (parcial para privacidad)
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
      timestamp: new Date().toISOString()
    });
  }
}
