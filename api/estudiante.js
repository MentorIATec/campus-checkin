// api/estudiante.js - Campus Check-in API
export default async function handler(req, res) {
  // Configurar CORS - PERMITIR AMBOS DOMINIOS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Validar API Key - PERMITIR MÚLTIPLES KEYS
    const apiKey = req.headers['x-api-key'];
    const validKeys = [
      process.env.API_KEY_CHECKIN,                    // Key del .env
      'cc_checkin_2025_karen_secure_xyz789abc123',    // Key hardcoded para GitHub
      'cc_checkin_2025_public_frontend',              // Key del debug
      'test_key_github'                               // Key de prueba
    ].filter(Boolean);
    
    if (!apiKey || !validKeys.includes(apiKey)) {
      console.error('❌ API Key inválida recibida:', apiKey);
      console.error('❌ Keys válidas:', validKeys);
      return res.status(401).json({ 
        error: 'Acceso no autorizado',
        debug: `Key recibida: ${apiKey?.substring(0, 20)}...`,
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
    const gistUrl = process.env.GIST_URL || "https://gist.githubusercontent.com/MentorIATec/294ad6050de3384eb8806360294e49b3/raw/626a0573adcdac7a643eabba4f32f8890be19e08/estudiantes.json";
    
    if (!gistUrl.includes('gist.githubusercontent.com')) {
      console.error('❌ GIST_URL inválida:', gistUrl);
      return res.status(500).json({ error: 'Configuración del servidor incompleta' });
    }

    console.log('🔍 Buscando estudiante:', matricula);
    console.log('🔍 Usando Gist URL:', gistUrl.substring(0, 80) + '...');
    
    const response = await fetch(gistUrl, {
      headers: {
        'User-Agent': 'Campus-Checkin-API/1.0'
      }
    });

    if (!response.ok) {
      console.error('❌ Error cargando datos:', response.status, response.statusText);
      throw new Error(`Error al cargar base de datos: ${response.status}`);
    }

    const estudiantes = await response.json();
    console.log('✅ Datos cargados:', estudiantes.length, 'estudiantes');

    // 6. Buscar estudiante
    const estudiante = estudiantes.find(e => 
      (e.matricula || e.matrícula)?.trim().toUpperCase() === matricula.trim().toUpperCase()
    );

    if (!estudiante) {
      console.log('❌ Estudiante no encontrado:', matricula);
      console.log('📋 Matrículas disponibles:', estudiantes.slice(0, 3).map(e => e.matricula || e.matrícula));
      return res.status(404).json({ 
        error: 'Estudiante no encontrado',
        matricula: matricula,
        totalEstudiantes: estudiantes.length
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
      debug: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
