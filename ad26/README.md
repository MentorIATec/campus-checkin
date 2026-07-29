# Campus Check-in AD26

Documentacion de rediseño, robustecimiento y operacion del registro presencial para la Bienvenida de Transferencias AD26.

## Evento

- Fecha: viernes 7 de agosto de 2026.
- Horario: 15:00 a 17:30.
- Lugar: Centro de Congresos, Campus Monterrey.
- Volumen de referencia: hasta 400 preregistros; el acceso onsite no tendra limite duro.
- Proyecto Vercel propuesto: `campus-checkin-ad26`.

## Documentos

- `DECISIONES_Y_ARQUITECTURA.md`: decisiones aprobadas, separacion de datos y captura manual de incidencias.
- `CHECKLIST_ROBUSTECIMIENTO.md`: checklist tecnico, funcional y operativo.
- `AUDITORIA_REFRESH_AD25.md`: causa probable del borrado/refresco observado en AD25 y controles preventivos.
- `INVENTARIO_ASSETS_Y_DESPLIEGUES.md`: catalogo de mentores, imagenes y estrategia de archivado en Vercel.
- `ARQUITECTURA_INTEGRADA_TRANSFERENCIAS_AD26.md`: relacion entre preregistro, invitacion y check-in presencial.
- `INPUTS_PENDIENTES.md`: insumos externos necesarios antes del ensayo y despliegue.
- `mentor-assets.expected.txt`: referencias esperadas del catalogo AD26.
- `scripts/validate-mentor-assets.mjs`: validacion exacta de imagenes con `npm run validate:mentor-assets`.
- `REGISTRO_MANUAL_INCIDENCIAS.md`: instrucciones de captura y conteo final.
- `apps-script/Code.js`: Web App de lookup y check-in idempotente.
- `apps-script/Setup.js`: preparacion no destructiva de hojas.
- `apps-script/Dashboard.js`: dashboard manual inspirado en la version FJ26.
- `apps-script/Snapshot.js`: previsualizacion e importacion controlada desde el preregistro.

## Secuencia de fotografia operativa

El dia del evento se usa la misma secuencia que en los ensayos:

1. Ejecutar `configurePreregistrationSourceAD26` solo si cambio el spreadsheet fuente.
2. Ejecutar `previewPreregistrationSnapshotAD26` y verificar totales, duplicados, mentores sin foto, cruces academicos y escuelas por clasificar.
3. Ejecutar `importPreregistrationSnapshotAD26` para reemplazar unicamente `Poblacion_AD26` y `Mentores_AD26`.
4. Hacer consultas de prueba en el frontend antes de publicar el QR.

La importacion no borra `Checkins_AD26`, `Incidencias_AD26`, intentos ni errores. `setupAD26` no forma parte de cada importacion; se reserva para preparar o migrar el esquema.

## Dashboard

- El dashboard se actualiza unicamente al ejecutar `Actualizar dashboard (manual)`; no usa formulas volatiles, timer ni trigger por minuto.
- Conserva la estructura operativa de FJ26: tarjetas de total, unicos, pendientes, duplicados y sin mentor; Top 5 de comunidades, mentores y carreras; metricas y desgloses completos.
- Agrega desgloses por escuela, campus, carrera y hora, ademas de los ultimos diez registros.
- Los registros manuales de `Incidencias_AD26` se suman sin duplicar matriculas. Sus datos se enriquecen con `Poblacion_AD26` cuando existe coincidencia.
- Pendientes se calcula contra el padron activo; una incidencia de alguien fuera del padron suma asistencia, pero no reduce pendientes.

## Cruce academico

- La fotografia consulta `Importacion_Raw_Verano26` y `Importacion_Raw_AD26` por matricula antes de construir `Poblacion_AD26`.
- La clave de carrera se conserva en `siglas_carrera`; `carrera` contiene el nombre legible y `escuela` se deriva de un catalogo estable.
- `Importacion_Raw_AD26` tiene prioridad sobre Verano 26 cuando una matricula aparece en ambas fuentes.
- No se debe aceptar una fotografia final con valores reportados en `escuelas_por_clasificar` sin revisar esas matriculas.

## Fuentes privadas

- Check-in AD26: `B | Campus Check-in AD26`
  `https://docs.google.com/spreadsheets/d/1HA6Vz3He1kcPENdnl4IIl1Y-Dc927qb7UQvegXeeqOk/edit`
- Preregistro AD26: `A | Pre-registro Transferencias Campus Monterrey | AD26`
  `https://docs.google.com/spreadsheets/d/1jHE0OAX7EXTyo5Try8Jh5J_xwP0g_PEztxxiQBuGwZU/edit`
- Catalogo recibido: `DATOSME_CURSOR.xlsx`.

El workbook de mentores contiene correos y telefonos institucionales. No debe copiarse al repositorio publico. Solo se documentan su esquema y las validaciones necesarias.

## Estado

- El spreadsheet de check-in AD26 ya existe y se encuentra vacio, con una pestaña inicial `Hoja 1`.
- El esquema operativo incluye carrera legible, siglas de carrera y escuela derivada de las fuentes originales.
- El preregistro ya cuenta con `Asignaciones`, `Datos mentor`, `Respuestas`, `Configuracion`, `Log_Envios`, `Resumen` y `Errores`.
- La implementacion se encuentra en la rama `ad26`; FJ26 se conserva como referencia historica.
