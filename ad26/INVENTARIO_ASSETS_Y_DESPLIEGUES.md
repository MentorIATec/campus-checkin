# Inventario de assets y deployments AD26

## Catalogo de mentores

Fuente revisada: `DATOSME_CURSOR.xlsx`.

- 47 registros de mentor.
- 47 nombres de imagen distintos.
- 19 referencias coinciden exactamente con archivos actuales de `public/mentores`.
- 28 referencias no tienen coincidencia exacta.

La diferencia se debe principalmente a que el catalogo nuevo usa nombres formales mientras el repositorio conserva nicknames, espacios o variantes, por ejemplo:

- `LeonardoEkvilibro.jpg` frente a `LeoEkvilibro.jpg`.
- `MarcoEnergio.jpg` frente a `VinnyEnergio.jpg`.
- `PamelaEnergio.jpg` frente a `PameEnergio.jpg`.
- `ChristopherSpirita.jpg` frente a `ChrisSpirita.jpg`.
- `MonserratPasio.jpg` frente a `MonsePasio.jpg`.

## Convencion AD26

La hoja privada guardara solo el nombre de archivo en `fotoMentor`, por ejemplo:

```text
ChristopherSpirita.jpg
```

El backend convertira ese valor en:

```text
/mentores/ChristopherSpirita.jpg
```

Los archivos deben vivir en:

```text
public/mentores/
```

La ruta es relativa al mismo deployment de Vercel. No se guardaran rutas locales ni URLs de previews temporales.

## Estrategia de actualizacion

1. Crear la rama `ad26`.
2. Incorporar las imagenes nuevas en `public/mentores` dentro de esa rama.
3. Renombrar o duplicar un asset solo cuando se confirme que corresponde a la misma persona.
4. No modificar la rama FJ26 solo para satisfacer nombres AD26.
5. Ejecutar una validacion automatica que compare `fotoMentor` con archivos existentes y falle si falta alguno.
6. Usar `Salud.jpg` para Escuela de Salud.

No debe asumirse que las 28 referencias faltantes pueden mapearse automaticamente: algunas pueden ser nuevos mentores y requieren imagen nueva.

## Vercel

Deployment historico conocido: `https://campus-checkin-fj26.vercel.app`.

Recomendacion:

- No renombrar ni reutilizar el proyecto FJ26 como AD26.
- Crear un proyecto separado `campus-checkin-ad26` conectado a la rama `ad26`.
- Conservar FJ26 temporalmente para auditoria, pero desactivar sus escrituras removiendo o rotando las variables que permiten escribir en Apps Script.
- Retirar el alias publico FJ26 o mostrar una pagina estatica `Version archivada` una vez validado el respaldo.
- No borrar deployments historicos hasta verificar que Sheets, Apps Script y documentacion fueron preservados.
- Documentar proyecto, rama, dominio, spreadsheet, deployment de Apps Script y fecha de cierre.

## Matriz de cierre de versiones

| Version | Rama | Dominio | Datos | Accion |
|---|---|---|---|---|
| AD25 | historica | por identificar | historicos | localizar, retirar escritura y archivar |
| FJ26 | `fj26` | `campus-checkin-fj26.vercel.app` | FJ26 | conservar lectura, desactivar escritura y archivar |
| AD26 | `ad26` | `campus-checkin-ad26.vercel.app` propuesto | workbook B AD26 | nuevo proyecto operativo |

## Archivos locales archivados

- `archive/verano-2025-checkin.html`: prototipo `checkin2`, no usado por AD26.
- `archive/fj26/debug.html`: diagnostico FJ26, retirado de la superficie publica.
- No se eliminaron; revisar y borrar manualmente solo cuando ya no se requiera auditoria historica.
