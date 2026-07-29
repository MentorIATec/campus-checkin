# Registro manual de incidencias AD26

`Incidencias_AD26` es el espacio de captura rápida para estudiantes que no aparecen en `Poblacion_AD26`. No existe un flujo de autorización: el objetivo es registrar su asistencia sin detener el acceso.

## Captura mínima

Completar una fila por estudiante:

- `incident_id`: valor único; sugerencia `AD26-<matricula>`.
- `event_id`: `bienvenida-transferencias-ad26`.
- `timestamp`: fecha y hora de captura.
- `matricula`: formato `A########`.
- `nombre`.
- `campus_origen`.
- `motivo`: `TRANSFERENCIA_TARDIA` u `OTRO`.
- `detalle`: opcional.
- `registrado_por`: iniciales o nombre del integrante de staff.
- `observaciones`: opcional.

## Conteo

El resumen combina `Checkins_AD26` e `Incidencias_AD26` y deduplica por matrícula. Si una matrícula aparece en ambas hojas, cuenta como una sola persona.

## Operación

1. Mantener abierta la pestaña `Incidencias_AD26` en un equipo de staff.
2. Capturar únicamente los campos indispensables durante la fila de acceso.
3. No editar ni borrar registros digitales en `Checkins_AD26`.
4. Regenerar `Dashboard_AD26` manualmente solo si las fórmulas fueron alteradas.

