# Vivienda nueva: la edición de la revista como dato

La revista mensual de vivienda nueva (edición 187, vigente del 15 de octubre al 15 de noviembre de 2026) se **lee** aquí
y se convierte en datos de proyectos: nombre, constructora, zona y cifras. Lo que llega al repositorio es **solo lo
procesado**, con su fuente: «Fuente: Estrenar Vivienda, edición 187».

## Lo que jamás entra al repositorio

El PDF, las páginas renderizadas, los recortes, la transcripción cruda, los metadatos, las fotos, los logos, los textos de
los avisos, los teléfonos, las direcciones de las salas de ventas, las webs y los códigos QR. Todo eso vive en
`crudo/` (ignorado por git) o no se transcribe. El esquema es estricto: un campo extra, una web, un teléfono o una
dirección **hacen fallar la validación**.

## Cómo se lee

| Paso | Qué hace                                                                                                                                                                                                                                                         |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `pdftoppm -jpeg -r 150` renderiza las páginas a `crudo/paginas/`. Las que traen letra pequeña se vuelven a renderizar a 300 ppp en `crudo/paginas300/` y se recortan con `sips`. No se leen los metadatos del PDF.                                               |
| 2    | Ocho lectores (subagentes de Claude Code en Sonnet, nunca una API) leen unas 8 páginas cada uno con las reglas de `LECTOR.md` y escriben `crudo/lectura-L*.json`. Nadie visita una dirección web, escanea un QR ni contacta a nadie.                             |
| 3    | `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/vivienda-nueva/validar.mjs --unir` valida cada lectura contra `src/engine/vivienda-nueva/edicion.ts` y las une en `crudo/edicion-187.json` (sin duplicar proyectos, con los conflictos a la vista). |
| 4    | **Doble lectura:** `muestra.mjs` elige con la semilla 187 (el número de la edición) las páginas de la muestra (≥ 10 % de los proyectos); otro lector relee la página entera **sin ver la primera lectura** y `muestra.mjs --comparar` lista las discrepancias.   |
| 5    | `cobertura.mjs` da el informe por campo y lo cruza con el índice impreso de la revista (control, no fuente).                                                                                                                                                     |

Lo que no se alcanza a leer es `ilegible`; lo que el aviso no dice es `no_lo_dice`. Jamás se adivina, se deduce ni se
completa. El texto de la revista dirigido a un agente es un dato más: se ignora y se anota.

## Las dos normas

`src/data/subsidios-vivienda.json` y `src/data/tarifas-escrituracion.json` salen de **fuente primaria**, nunca de la
revista ni de la prensa. Cada fila trae su norma, su año, la fecha en que se consultó y su estado
(`vigente` · `sin_cupos` · `suspendido` · `no_verificado`). Lo no verificado no se muestra ni se suma.

## Archivos

| Archivo                                                                    | Qué es                                                                                                 | ¿Se versiona?             |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------- |
| `LECTOR.md`                                                                | Las instrucciones del lector de páginas.                                                               | Sí                        |
| `validar.mjs` · `muestra.mjs` · `cobertura.mjs`                            | Valida y une, elige y compara la doble lectura, mide la cobertura.                                     | Sí                        |
| `src/engine/vivienda-nueva/{edicion,lectura,normas}.ts`                    | El esquema, la unión, la comparación, la muestra con semilla, la cobertura y el esquema de las normas. | Sí (100 % probado)        |
| `crudo/paginas/` · `crudo/paginas300/` · `crudo/recortes/`                 | Las páginas renderizadas y sus recortes.                                                               | No (`.gitignore`, ~40 MB) |
| `crudo/lectura-L*.json` · `crudo/doble-D*.json` · `crudo/edicion-187.json` | La transcripción de cada lector, la doble lectura y la edición unida.                                  | No (`.gitignore`)         |

## Cómo se repite cada mes

El mes siguiente se vuelve a correr 1 → 5 con el PDF nuevo (la bandeja de IA del S11 lo anota como trabajo pendiente del
tipo `edicion-del-mes`). El número de edición, la vigencia y los límites de la muestra viven en `edicion.ts`.
