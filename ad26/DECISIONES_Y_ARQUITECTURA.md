# Decisiones y arquitectura AD26

## Decisiones confirmadas

1. No se mezclaran registros de FJ26 y AD26.
2. El limite de 400 aplica al preregistro, no al acceso presencial.
3. El check-in conservara dos pasos para permitir verificar nombre y matricula antes de registrar.
4. El dashboard no usara un trigger de actualizacion cada minuto.
5. El frontend tendra una sola ruta de escritura: Vercel API -> Apps Script -> Sheets.
6. La ruta directa adicional desde el navegador hacia Apps Script se eliminara.
7. Las personas fuera del padron seran atendidas por un flujo rapido de staff y siempre se autorizara su acceso.
8. Escuela de Salud se mostrara como `Comunidades Academicas / Escuela de Salud`, sin mentor asignado.
9. Los datos de preregistro y check-in permaneceran en workbooks separados.

## Workbooks

### A | Preregistro AD26

Fuente de invitaciones y respuestas previas. La pestaña `Respuestas` usa actualmente:

`response_id`, `event_id`, `timestamp`, `matricula`, `asistira`, `tipo_poblacion`, `comunidad`, `mentor_id`, `email`, `email_status`, `source`.

Esta fuente no se consultara en vivo durante el evento. Antes del 7 de agosto se generara una fotografia consolidada de preregistro.

### B | Campus Check-in AD26

Workbook operativo exclusivo. Se propone reemplazar `Hoja 1` por:

- `Config_AD26`
- `Poblacion_AD26`
- `Mentores_AD26`
- `Checkins_AD26`
- `Incidencias_AD26`
- `Dashboard_AD26`
- `Catalogos_AD26`

No se ejecutaran funciones de setup que borren hojas existentes.

## Modelo de datos propuesto

### Poblacion_AD26

- `matricula`
- `nombres`
- `apellidos`
- `email`
- `campus_origen`
- `escuela`
- `carrera`
- `tipo_poblacion`
- `mentor_id`
- `mentor_nombre`
- `comunidad`
- `foto_mentor`
- `preregistrado`
- `respuesta_preregistro`
- `fecha_preregistro`
- `activo`
- `periodo`
- `fecha_importacion`

Los encabezados definitivos se cerraran cuando Coordinacion entregue la sabana AD26.

### Checkins_AD26

- `checkin_id`: `matricula|bienvenida-transferencias-ad26`
- `event_id`
- `timestamp`
- `matricula`
- `nombre`
- `campus_origen`
- `escuela`
- `mentor_id`
- `mentor_nombre`
- `comunidad`
- `preregistrado`
- `respuesta_preregistro`
- `en_padron_original`
- `ruta_registro`: `AUTOSERVICIO` o `STAFF_INCIDENCIA`
- `staff_id`
- `source`

La hoja es append-only. Las correcciones se registran como eventos auditables; no se editan silenciosamente filas historicas.

### Incidencias_AD26

Captura minima para no detener la fila:

- `incident_id`
- `timestamp`
- `matricula_capturada`
- `nombre`
- `campus_origen`
- `motivo`: `TRANSFERENCIA_TARDIA` u `OTRO`
- `detalle_otro` opcional
- `staff_id`
- `acceso_autorizado`: siempre `SI` bajo la politica actual
- `checkin_id_generado`

Si la persona no aparece en el padron, el staff registra la incidencia y el sistema crea tambien su check-in con `en_padron_original=NO`, `preregistrado=NO` y `ruta_registro=STAFF_INCIDENCIA`.

## Flujo de autoservicio

1. Paso 1: capturar y buscar matricula.
2. Mostrar nombre, matricula, mentor/comunidad y campus.
3. Mensaje persistente: `Aun no has registrado tu entrada. Verifica tus datos.`
4. Paso 2: `Registrar mi check-in`.
5. Backend valida nuevamente la matricula, resuelve los datos desde la fuente privada y registra de forma idempotente.
6. Resultado: `Registro confirmado`, `Ya contabas con check-in` o `Solicita apoyo al staff`.

No se aceptaran nombre, mentor o comunidad como datos confiables enviados por el navegador.

## Salud

La regla no dependera exclusivamente de que el campo mentor contenga `Salud`. Se aplicara en este orden:

1. `tipo_poblacion = SALUD`, o
2. escuela normalizada contiene `salud`, o
3. mentor normalizado es `escuela de salud` como compatibilidad con FJ26.

Salida visual:

- Comunidad: `Comunidades Academicas`.
- Representacion: `Escuela de Salud`.
- Mentor: vacio / no asignado.
- Imagen: `/mentores/Salud.jpg`.

## Dashboard sin timer

`Dashboard_AD26` usara formulas, `COUNTIFS`, `COUNTUNIQUE`, `QUERY` y tablas dinamicas sobre rangos acotados. No escribira en `Checkins_AD26` ni adquirira locks.

Metricas:

- check-ins unicos;
- ultimo check-in;
- preregistrados que acudieron;
- preregistrados que no acudieron;
- asistentes sin preregistro;
- asistentes fuera del padron;
- desglose por mentor, comunidad, escuela y campus;
- incidencias por motivo;
- intentos duplicados rechazados;
- errores operativos recientes.

Se conservara una opcion manual de regeneracion como recuperacion, no como mecanismo principal.
