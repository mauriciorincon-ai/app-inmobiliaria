# Sectores catastrales de Bogotá

Los barrios de Innmobiliaria salen del dataset abierto **«Sector catastral»** de Catastro Bogotá (UAECD), publicado
en el portal de datos abiertos de Bogotá con licencia **Creative Commons Atribución 4.0 (CC BY 4.0)**.

- **Contenido:** 1 230 sectores (urbanos, rurales y mixtos) con su código `SCACODIGO`, su nombre `SCANOMBRE` y su
  tipo `SCATIPO`.
- **Archivo:** GeoJSON en WGS84 (CRS84), de unos 18 MB.
- **Descargado:** 2026-10-17, versión «09.26».
- **Atribución, obligatoria en cada mapa:** «Barrios: Catastro Bogotá (CC BY 4.0)».

## Archivos

| Archivo                       | Qué es                                                                                                     | ¿Se versiona?            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------ |
| `crudo/SECTOR.geojson`        | El archivo tal como se descarga (dentro del zip `sector.geojson.09.26.zip` del dataset).                   | No (`.gitignore`, 18 MB) |
| `crudo/localidades.esri.json` | Las 20 localidades (dataset «Localidad. Bogotá D.C.», CC BY 4.0), para asignar cada sector a su localidad. | No                       |
| `nombres.mjs`                 | `SCANOMBRE` en mayúsculas sin tildes → nombre legible («Chicó Norte II Sector»).                           | Sí                       |
| `geometria.mjs`               | Geometría plana compartida (Douglas-Peucker, centroide, punto en polígono, punto interior).                | Sí                       |
| `convertir.mjs`               | Genera el catálogo de barrios de la app (ver abajo).                                                       | Sí                       |
| `mapa-maqueta.mjs`            | Genera el mapa de la maqueta del comprador (`docs/diseno/comprador/assets/mapa-datos.js`).                 | Sí                       |

## Cómo regenerar

1. Descarga los dos archivos crudos del portal de datos abiertos de Bogotá: «Sector catastral» en GeoJSON y
   «Localidad. Bogotá D.C.» en GeoJSON.
2. Déjalos en `scripts/sectores/crudo/`.
3. Corre `node scripts/sectores/mapa-maqueta.mjs`. Es determinista: la misma entrada da los mismos bytes.

## El catálogo de la app (S6, ADR 014)

`node scripts/sectores/convertir.mjs` lee los dos archivos de `crudo/` y reescribe, de forma determinista:

| Salida                                                   | Para qué                                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/engine/zonas/sectores.json`                         | El catálogo `[código, nombre, localidad, tipo]` que lee el wizard (select de barrios). |
| `public/datos/sectores.geojson`                          | La forma de cada sector para el mapa (~690 KB, solo el código en las propiedades).     |
| Bloque `-- BEGIN/END GENERADO: sectores` de la migración | Los `insert` de la tabla `sectores`, con el punto interior de cada sector.             |

La localidad de cada sector es la que contiene su punto interior; los nombres que se repiten dentro de una
localidad llevan « (2)», « (3)» por orden de código. Si Catastro publica una versión nueva, se regenera y se
agrega una migración nueva (la que ya está aplicada no se edita).

`tests/unit/catalogo-sectores.test.ts` cruza las tres salidas; `tests/unit/convertir-sectores.test.ts` prueba el
convertidor sobre un fixture de juguete.
