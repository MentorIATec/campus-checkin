# 📋 Campus Check-in

> Sistema inteligente de registro de asistencia para estudiantes transferidos

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
![Platform](https://img.shields.io/badge/platform-Vercel-black.svg)

---

## 🎯 **Descripción**

**Campus Check-in** es un sistema web moderno y seguro para el registro de asistencia de estudiantes transferidos al Campus Monterrey del Tecnológico de Monterrey. 

### **Características Principales**
- ✅ **Interfaz intuitiva** para registro rápido por matrícula
- 🔒 **API segura** con autenticación y rate limiting
- 🎨 **Branding dinámico** por comunidades estudiantiles
- 📊 **Estadísticas en tiempo real** de registros
- 📱 **Diseño responsivo** para desktop y móvil
- 🔗 **Integración** con Google Apps Script y Sheets

---

## 🏗️ **Arquitectura del Sistema**

```
Frontend (Vanilla JS)
    ↓
API Backend (/api/estudiante & /api/checkin)
    ↓
Gist Secret (GitHub) ← Datos seguros
    ↓
Google Apps Script ← Registro de asistencia
    ↓
Google Sheets ← Almacenamiento
```

---

## 🚀 **Instalación y Configuración**

### **Prerrequisitos**
- Node.js 18+ 
- Cuenta de GitHub
- Cuenta de Vercel
- Cuenta de Google (para Apps Script)

### **1. Clonar y configurar**
```bash
git clone https://github.com/MentorIATec/campus-checkin.git
cd campus-checkin
npm install
```

### **2. Configurar variables de entorno**
Crear archivo `.env.local`:
```bash
# API Security
API_KEY_CHECKIN=cc_checkin_2025_karen_secure_xyz789abc123

# Data Source (Gist Secret URL)
GIST_URL=https://gist.githubusercontent.com/TU_USUARIO/GIST_ID/raw/HASH/estudiantes.json

# Google Apps Script (opcional)
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### **3. Crear Gist Secret**
1. Ve a https://gist.github.com
2. Crea un **Gist Secret** (privado)
3. Sube tu archivo `estudiantes.json`
4. Copia la URL del raw file
5. Actualiza `GIST_URL` en `.env.local`

### **4. Deploy en Vercel**
```bash
# Instalar Vercel CLI
npm i -g vercel

# Configurar variables en Vercel
vercel env add API_KEY_CHECKIN
vercel env add GIST_URL
vercel env add GOOGLE_SCRIPT_URL

# Deploy
vercel --prod
```

---

## 🎨 **Comunidades Estudiantiles**

El sistema soporta **10 comunidades** con branding dinámico:

| Comunidad | Color Principal | Gradiente |
|-----------|----------------|-----------|
| **Talenta** | #EC008C | Hot Pink |
| **Revo** | #C4829A | Dusty Pink |
| **Kresko** | #0DCCCC | Blue Mist |
| **Pasio** | #CC0202 | Ruby Red |
| **Energio** | #FD8204 | Tangerine |
| **Krei** | #79858B | Iron Grey |
| **Reflekto** | #FFDE17 | Yellow |
| **Forta** | #870074 | Red Plum |
| **Spirita** | #5B0F8B | Purple |
| **Ekvilibro** | #6FD34A | Green |

---

## 🔒 **Seguridad Implementada**

### **Medidas de Protección**
- ✅ **API Key Authentication** - Validación en cada request
- ✅ **Rate Limiting** - Prevención de spam y scraping
- ✅ **CORS restrictivo** - Solo dominios autorizados
- ✅ **Validación de entrada** - Formato de matrícula obligatorio
- ✅ **Datos privados** - Archivo JSON en Gist Secret
- ✅ **Logs de auditoría** - Registro de accesos

### **Datos Protegidos**
- ❌ **No se exponen** datos de estudiantes en repositorio público
- ❌ **No se almacenan** credenciales en código fuente
- ✅ **Acceso controlado** via API con autenticación
- ✅ **Transferencia segura** HTTPS en todas las comunicaciones

---

## 📊 **API Endpoints**

### **POST /api/estudiante**
Buscar estudiante por matrícula

**Headers:**
```
Content-Type: application/json
x-api-key: TU_API_KEY
```

**Body:**
```json
{
  "matricula": "A01234567"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "matricula": "A01234567",
    "fullnameEstudiante": "Juan Pérez García",
    "nameEstudiante": "Juan",
    "mentorFullname": "María González López",
    "mentorNickname": "María",
    "comunidad": "Talenta",
    "campusOrigen": "Campus Guadalajara"
  },
  "timestamp": "2025-08-04T12:00:00.000Z"
}
```

### **POST /api/checkin**
Registrar asistencia de estudiante

**Headers:**
```
Content-Type: application/json
x-api-key: TU_API_KEY
```

**Body:**
```json
{
  "matricula": "A01234567",
  "fullnameEstudiante": "Juan Pérez García",
  "comunidad": "Talenta",
  "mentorFullname": "María González López",
  "campusOrigen": "Campus Guadalajara",
  "carrera": "Ingeniero en Sistemas"
}
```

---

## 🎯 **Uso del Sistema**

### **Para Estudiantes (Frontend)**
1. **Acceder** a la URL del campus check-in
2. **Ingresar matrícula** en formato A########
3. **Verificar datos** mostrados (mentor, comunidad)
4. **Confirmar asistencia** con un clic
5. **Mostrar pantalla** de confirmación al staff

### **Para Staff (Administración)**
1. **Monitorear** estadísticas en tiempo real
2. **Verificar registros** en Google Sheets
3. **Entregar kits** según comunidad mostrada
4. **Resolver incidencias** usando logs de la API

---

## 📈 **Métricas y Monitoreo**

### **Estadísticas Disponibles**
- 📊 **Total de registros** - Contador en tiempo real
- ⏰ **Último check-in** - Hora del registro más reciente
- 🕐 **Hora actual** - Sincronizada con servidor

### **Logs y Auditoría**
```javascript
// Ejemplo de log de API
{
  "timestamp": "2025-08-04T12:00:00.000Z",
  "ip": "192.168.1.xxx",
  "matricula": "A01234567",
  "success": true,
  "response_time": "250ms"
}
```

---

## 🛠️ **Desarrollo y Mantenimiento**

### **Estructura del Proyecto**
```
campus-checkin/
├── api/
│   ├── estudiante.js    # Endpoint de búsqueda
│   └── checkin.js       # Endpoint de registro
├── public/
│   ├── index.html       # Frontend principal
│   ├── app.js          # JavaScript principal
│   └── styles.css      # Estilos CSS
├── .env.local          # Variables de entorno
├── package.json        # Dependencies
└── vercel.json         # Config de Vercel
```

### **Comandos de Desarrollo**
```bash
# Desarrollo local
npm run dev

# Deploy a producción
npm run deploy

# Logs de producción
vercel logs
```

### **Testing Local**
```bash
# Iniciar servidor de desarrollo
vercel dev

# Probar endpoints
curl -X POST http://localhost:3000/api/estudiante \
  -H "Content-Type: application/json" \
  -H "x-api-key: TU_API_KEY" \
  -d '{"matricula": "A01234567"}'
```

---

## 🐛 **Troubleshooting**

### **Problemas Comunes**

#### **❌ Error 401: Acceso no autorizado**
- Verificar que `API_KEY_CHECKIN` esté configurada
- Confirmar que el header `x-api-key` sea correcto

#### **❌ Error 404: Estudiante no encontrado** 
- Verificar formato de matrícula (A########)
- Confirmar que el estudiante existe en el Gist
- Revisar URL del Gist Secret

#### **❌ Error 500: Error interno del servidor**
- Revisar logs con `vercel logs`
- Verificar conectividad con GitHub Gist
- Confirmar variables de entorno en producción

### **Verificación de Health**
```bash
# Verificar que la API responda
curl -I https://tu-app.vercel.app/api/estudiante

# Debería retornar 405 Method Not Allowed (esperado para GET)
```

---

## 👥 **Contribución**

### **Equipo de Desarrollo**
- **Desarrolladora Principal:** Karen Ariadna Guzmán Vega
- **Área:** Mentoría y Bienestar Estudiantil
- **Institución:** Tecnológico de Monterrey, Campus Monterrey

### **Cómo Contribuir**
1. Fork del repositorio
2. Crear rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Crear Pull Request

---

## 📝 **Changelog**

### **v2.0.0 (2025-08-04)**
- ✅ Migración a **Campus Check-in**
- ✅ API backend segura con autenticación
- ✅ Datos protegidos en Gist Secret
- ✅ Rate limiting y validaciones
- ✅ Branding actualizado y mejorado
- ✅ Documentación completa

### **v1.0.0 (2024-07-01)**
- ✅ Sistema original **NodoxCheckin**
- ✅ Integración básica con Google Forms
- ✅ Frontend con comunidades estudiantiles

---

## 📞 **Soporte**

### **Contacto**
- **Email:** kareng@tec.mx
- **Institución:** Tecnológico de Monterrey
- **Campus:** Monterrey
- **Área:** Mentoría y Bienestar Estudiantil

### **URLs del Sistema**
- **Producción:** https://campus-checkin.vercel.app
- **Documentación:** Este README
- **Repositorio:** https://github.com/MentorIATec/campus-checkin

---

## 📄 **Licencia**

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

---

**Campus Check-in v2.0.0** | Desarrollado con ❤️ por Karen Ariadna Guzmán Vega  
*MentorIA Tools - Automatización Inteligente para Bienestar Estudiantil*
