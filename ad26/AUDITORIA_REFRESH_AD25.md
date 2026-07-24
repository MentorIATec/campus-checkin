# Auditoria de la incidencia de refresh AD25

## Incidencia reportada

En AD25 algunos estudiantes observaban que la pantalla se refrescaba o que la matricula desaparecia cuando comenzaban a escribir.

No existe evidencia en el historial revisado de una llamada explicita a `location.reload()`, un service worker o un elemento `<form>` que enviara automaticamente la pagina.

## Causa probable identificada

El flujo de inicializacion historico y el actual contienen una condicion de carrera:

1. Se carga el DOM.
2. Se ejecuta y espera `actualizarStatsBar()`.
3. Mientras la llamada de red sigue pendiente, el input ya esta visible y el estudiante puede empezar a escribir.
4. Cuando termina la consulta de estadisticas, se ejecuta `resetCheckin()`.
5. `resetCheckin()` asigna `''` al input.

Esto produce visualmente el mismo efecto que un refresh, aunque la pagina no se haya recargado.

Referencias actuales:

- `public/app.js:463`: espera de estadisticas durante `DOMContentLoaded`.
- `public/app.js:473`: reset posterior a la espera.
- `public/app.js:425`: limpieza del valor de matricula.

La misma secuencia existia en la version de agosto de 2025, por lo que es la explicacion tecnica mas consistente con el comportamiento reportado.

## Correccion requerida para AD26

La inicializacion de la UI debe ser completamente sincrona antes de solicitudes de red:

```js
document.addEventListener('DOMContentLoaded', () => {
  resetCheckin();
  configurarEventos();
  actualizarHoraActual();
  void actualizarStatsBar();
});
```

`actualizarStatsBar()` no debe bloquear ni limpiar el estado del formulario cuando responda.

## Controles preventivos adicionales

- Declarar `type="text"` en el input.
- Declarar `type="button"` en buscar, confirmar y corregir.
- Si en el futuro se utiliza `<form>`, escuchar `submit` y ejecutar `event.preventDefault()`.
- Mantener `preventDefault()` para Enter.
- No ejecutar `resetCheckin()` desde polling, callbacks de estadisticas o recuperaciones de red.
- No activar `CONTINUOUS_MODE` en celulares de estudiantes.
- Mantener el borrador de matricula mientras haya una solicitud en curso.
- Registrar `pageshow`, `visibilitychange` y errores no controlados durante pruebas para distinguir un reload real de un reset de UI.

## Prueba de regresion

1. Simular una respuesta de estadisticas con 5 a 10 segundos de demora.
2. Comenzar a escribir inmediatamente al abrir la pagina.
3. Confirmar que la matricula permanece intacta cuando responde stats.
4. Repetir con Enter, teclado movil, cambio de orientacion y retorno desde segundo plano.
5. Confirmar mediante `performance.getEntriesByType('navigation')` que no ocurrio una navegacion nueva.

La causa se considera probable, no demostrada de forma forense, porque no existe una traza del dispositivo AD25. Debe tratarse como defecto reproducible del orden de inicializacion y quedar cubierto por prueba automatizada.
