# Checklist de robustecimiento AD26

## Repositorio y aislamiento

- [ ] Resguardar o confirmar los cambios locales de `automation/encuesta_salida` antes de cambiar de rama.
- [x] Crear rama `ad26` desde la base funcional vigente.
- [x] No copiar bases con telefonos, correos o datos personales al repositorio publico.
- [x] Mover `checkin2` y el debug FJ26 fuera de `public` al archivo historico.
- [ ] Mantener FJ26 como referencia de solo lectura.
- [x] Actualizar los textos, cache keys y `event_id` del frontend operativo a AD26.

## Spreadsheet B | Campus Check-in AD26

- [x] Reutilizar `Hoja 1` solo si esta vacia, sin usar un setup destructivo.
- [x] Preparar creacion no destructiva de `Config_AD26`.
- [ ] Crear `Poblacion_AD26` cuando se reciban encabezados definitivos.
- [ ] Crear `Mentores_AD26` desde la fuente privada validada.
- [x] Preparar creacion de `Checkins_AD26` append-only.
- [x] Preparar creacion de `Incidencias_AD26` append-only.
- [x] Preparar creacion de `Dashboard_AD26`.
- [x] Preparar `Catalogos_AD26` para motivos y valores controlados.
- [x] Configurar zona horaria `America/Monterrey` desde el setup.
- [x] Agregar proteccion de advertencia a encabezados, formulas y configuracion.

## Datos y pipeline

- [ ] Recibir encabezados definitivos de la sabana AD26.
- [ ] Normalizar matriculas a `A########`.
- [ ] Detectar duplicados en la fuente antes de importar.
- [ ] Consolidar preregistro desde el workbook A.
- [ ] Crear indicadores `preregistrado` y `respuesta_preregistro`.
- [ ] Conservar fecha y lote de importacion.
- [ ] Validar mentor, comunidad y Escuela de Salud.
- [ ] Generar reporte de filas incompletas antes del evento.
- [ ] Congelar una fotografia operativa de la poblacion antes de abrir el check-in.

## Seguridad y backend

- [ ] Rotar llaves FJ26 expuestas.
- [x] Guardar el secreto de Apps Script en `PropertiesService`.
- [x] Mantener secretos Vercel solo en variables de entorno.
- [x] No tratar una llave incluida en JavaScript publico como control de seguridad.
- [x] Enviar al endpoint de registro solamente la matricula.
- [x] Resolver nombre, mentor, comunidad y campus en backend.
- [x] Usar `checkin_id = matricula|bienvenida-transferencias-ad26`.
- [x] Aplicar `ScriptLock` solo durante verificacion y append.
- [x] Eliminar el fallback navegador -> Apps Script.
- [x] Registrar intentos duplicados en `Intentos_AD26`.
- [x] Registrar errores tecnicos en `Errores_AD26` sin guardar secretos.
- [x] Evitar mensajes `debug` con detalles internos en produccion.
- [x] Aplicar limite defensivo por cliente a lookup y check-in.
- [x] Bloquear temporalmente intentos fallidos de PIN de staff.
- [x] Exigir `activo=TRUE` y `periodo=AD26` en la poblacion operativa.
- [ ] Configurar rate limiting distribuido en Vercel Firewall antes de produccion.

## Frontend y UX

- [x] Mantener dos pasos para detectar errores de captura.
- [x] Etiquetar `Paso 1 de 2` y `Paso 2 de 2`.
- [x] Despues del lookup, ocultar la captura y hacer scroll a la tarjeta.
- [x] Mostrar nombre y matricula antes de habilitar check-in.
- [x] Destacar `Aun no has registrado tu entrada`.
- [x] Usar CTA principal `Registrar mi check-in`.
- [x] Usar CTA secundario `Corregir matricula`.
- [x] Dar a todos los botones `type="button"`.
- [x] Manejar Enter con `preventDefault()`.
- [x] Inicializar/resetear el formulario antes de cualquier `await`.
- [x] No limpiar el input desde callbacks tardios de estadisticas.
- [x] Evitar una segunda consulta de estadisticas despues de cada check-in.
- [x] Desactivar la consulta publica de estadisticas al cargar la pagina.
- [x] Reintentar con espera aleatoria los errores transitorios 502/503.
- [x] Deshabilitar botones durante solicitudes.
- [x] Diferenciar `Registro confirmado` de `Ya contabas con check-in`.
- [ ] Mostrar ruta clara de apoyo cuando no existe la matricula.

## Incidencias staff

- [x] Crear ruta separada y protegida para staff.
- [x] Capturar solo nombre, matricula, campus de procedencia y motivo.
- [x] Ofrecer motivos `Transferencia tardia` y `Otro`.
- [x] Autorizar acceso en todos los casos identificados, conforme a la politica indicada.
- [x] Crear check-in automaticamente al guardar la incidencia.
- [x] Evitar incidencias duplicadas si un append parcial requiere reintento.
- [x] Evitar que la captura de incidencia bloquee la fila principal.
- [ ] Probar operacion en telefono y computadora del staff.

## Mentores e imagenes

- [ ] Importar los 47 registros del catalogo recibido a la hoja privada.
- [x] Mantener `fotoMentor` como nombre de archivo, no como ruta absoluta.
- [x] Servir imagenes desde `/mentores/<fotoMentor>`.
- [ ] Agregar o renombrar assets en la rama `ad26`, no en FJ26.
- [ ] Resolver las 28 referencias que hoy no tienen coincidencia exacta en `public/mentores`.
- [x] Agregar validador de mayusculas, espacios y acentos para sistemas case-sensitive.
- [ ] Mantener `/mentores/Salud.jpg` como fallback de Salud.

## Dashboard

- [x] Implementar formulas y tablas dinamicas sin trigger cada minuto.
- [x] Acotar rangos, por ejemplo hasta 2,000 filas.
- [x] Mostrar unicos, no solo filas totales.
- [x] Separar preregistro, asistencia y fuera de padron.
- [x] Mostrar incidencias staff e intentos duplicados.
- [x] Conservar funcion manual de regeneracion como respaldo.
- [x] Mantener el dashboard sin escrituras sobre `Checkins_AD26`.

## Pruebas

- [ ] Matricula valida pendiente de check-in.
- [ ] Matricula valida ya registrada.
- [ ] Error de dedo que coincide con otro estudiante: verificar identidad y corregir.
- [ ] Matricula inexistente y flujo staff.
- [ ] Transferencia tardia.
- [ ] Escuela de Salud sin mentor.
- [ ] Doble clic.
- [ ] Enter en el input.
- [ ] Refresh antes, durante y despues del registro.
- [ ] Perdida de respuesta despues de guardar y reintento idempotente.
- [ ] Conexion lenta y timeout.
- [ ] 20 a 30 solicitudes concurrentes.
- [ ] Recuperacion manual del dashboard.
- [ ] Validacion visual de todas las fotos de mentores.

## Produccion y operacion

- [ ] Crear proyecto Vercel `campus-checkin-ad26`.
- [ ] Configurar dominio AD26 sin reutilizar el alias FJ26.
- [ ] Configurar variables de entorno Production y Preview.
- [ ] Desplegar primero con datos de prueba.
- [ ] Ejecutar ensayo con staff.
- [ ] Congelar version operativa 24 horas antes del evento.
- [ ] Preparar QR y URL de contingencia.
- [ ] Preparar procedimiento manual si Vercel, Apps Script o red fallan.
- [ ] Al finalizar, cerrar escrituras y archivar el deployment.
