# Decisiones y arquitectura AD26

## Decisiones confirmadas

1. No se mezclaran registros de FJ26 y AD26.
2. El limite de 400 aplica al preregistro, no al acceso presencial.
3. El check-in conservara dos pasos para permitir verificar nombre y matricula antes de registrar.
4. El dashboard no usara un trigger de actualizacion cada minuto.
5. El frontend tendra una sola ruta de escritura: Vercel API -> Apps Script -> Sheets.
6. La ruta directa adicional desde el navegador hacia Apps Script se eliminara.
7. Las personas fuera del padron se registraran manualmente en `Incidencias_AD26`; no existe un flujo digital de autorizacion de acceso.
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

Espacio de captura manual en Google Sheets para no detener la fila:

- `incident_id`
- `event_id`
- `timestamp`
- `matricula`
- `nombre`
- `campus_origen`
- `motivo`: `TRANSFERENCIA_TARDIA` u `OTRO`
- `detalle` opcional
- `registrado_por`
- `observaciones`

No se solicita ni registra una decision de acceso. Estas filas cuentan como asistencia manual y el total final deduplica por matricula contra `Checkins_AD26`.

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

`Dashboard_AD26` se regenerara manualmente mediante Apps Script, siguiendo la estructura operativa validada en FJ26. No usara formulas volatiles, no escribira en `Checkins_AD26`, no adquirira locks durante el registro y no tendra un apartado especializado de gestion de incidencias.

Metricas:

- check-ins digitales unicos;
- registros manuales unicos;
- total de asistentes unicos entre ambas fuentes;
- ultimo check-in digital;
- preregistrados que acudieron;
- preregistrados que no acudieron;
- asistentes sin preregistro;
- desglose por mentor, comunidad, escuela y campus;
- intentos duplicados rechazados;
- errores operativos recientes.

Se conservara una opcion manual de regeneracion como recuperacion, no como mecanismo principal.
