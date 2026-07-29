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
- `apps-script/Setup.js`: preparacion no destructiva de hojas y resumen operativo.
- `apps-script/Snapshot.js`: previsualizacion e importacion controlada desde el preregistro.

## Fuentes privadas

- Check-in AD26: `B | Campus Check-in AD26`
  `https://docs.google.com/spreadsheets/d/1HA6Vz3He1kcPENdnl4IIl1Y-Dc927qb7UQvegXeeqOk/edit`
- Preregistro AD26: `A | Pre-registro Transferencias Campus Monterrey | AD26`
  `https://docs.google.com/spreadsheets/d/1jHE0OAX7EXTyo5Try8Jh5J_xwP0g_PEztxxiQBuGwZU/edit`
- Catalogo recibido: `DATOSME_CURSOR.xlsx`.

El workbook de mentores contiene correos y telefonos institucionales. No debe copiarse al repositorio publico. Solo se documentan su esquema y las validaciones necesarias.

## Estado

- El spreadsheet de check-in AD26 ya existe y se encuentra vacio, con una pestaña inicial `Hoja 1`.
- Los encabezados definitivos de la poblacion AD26 siguen pendientes.
- El preregistro ya cuenta con `Asignaciones`, `Datos mentor`, `Respuestas`, `Configuracion`, `Log_Envios`, `Resumen` y `Errores`.
- La implementacion se encuentra en la rama `ad26`; FJ26 se conserva como referencia historica.
