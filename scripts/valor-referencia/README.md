# Valor de referencia del terreno por barrio

La sección «Datos de tu zona» (S10, ADR 018) muestra el **valor de referencia del metro cuadrado de terreno** del
barrio. Sale del dataset abierto **«Valor de referencia por metro cuadrado de terreno»** de Catastro Bogotá (UAECD),
con licencia **Creative Commons Atribución 4.0 (CC BY 4.0)**.

- **Qué es:** la mediana del valor comercial del m² de **terreno**, por **manzana** (41 858 manzanas en la vigencia
  2026). **No** es el precio de un inmueble ni un avalúo, y jamás se mezcla con el rango de oferta.
- **De la manzana al barrio:** los 6 primeros dígitos del código de manzana (`MANCODIGO`) son el código de sector catastral
  del catálogo de barrios de la app (ADR 014). El valor del barrio es la **mediana de las medianas** de sus manzanas, con
  cuántas manzanas son.
- **Cobertura (vigencia 2026):** 983 de los 1 000 barrios urbanos (98,3 %) y ninguno rural: los 17 urbanos sin valor
  son parques, corredores y similares. 14 manzanas (0,03 %) no caen en ningún barrio del catálogo y se descartan.
- **Descargado:** 2026-10-19.
- **Atribución, obligatoria donde aparezca el dato:** «Valor de referencia: Catastro Bogotá (CC BY 4.0)».

## Archivos

| Archivo                                  | Qué es                                                                                                                          | ¿Se versiona?            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `descargar.mjs`                          | Baja las manzanas (`MANCODIGO`, `V_REF`) del servicio público de Catastro, sin geometría.                                       | Sí                       |
| `crudo/valor-ref-2026.json`              | Las 41 858 parejas `[manzana, valor]` tal como se bajan.                                                                        | No (`.gitignore`, ~1 MB) |
| `convertir.mjs`                          | Agrupa por barrio y escribe la salida de abajo. Determinista: la misma entrada da los mismos bytes.                             | Sí                       |
| `src/engine/zonas/valor-referencia.json` | `{ vigencia, fuente, licencia, descargado, medida, filas: [código, mediana, manzanas] }` (~23 KB). Solo lo importa el servidor. | Sí                       |

## Cómo regenerar

1. `node scripts/valor-referencia/descargar.mjs`
2. `node scripts/valor-referencia/convertir.mjs AAAA-MM-DD` (la fecha de la descarga).
3. Si cambia la vigencia, se cambia `VIGENCIA` en los dos scripts, en su test y en el texto de la atribución.

`tests/unit/valor-referencia.test.ts` prueba el convertidor sobre un fixture de juguete y vigila el resultado
generado (catálogo, orden, cobertura ≥ 95 % de los barrios urbanos).
