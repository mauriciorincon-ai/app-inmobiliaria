// Convierte el «Valor de referencia por metro cuadrado de terreno» de Catastro Bogotá (UAECD, CC BY 4.0) en
// una mediana por barrio, para la sección «Datos de tu zona» de la app (S10, ADR 018). No es código de
// producto: se corre a mano cuando Catastro publica una vigencia nueva (ver scripts/valor-referencia/README.md)
// y su salida se versiona.
//
// Entrada (gitignored, scripts/valor-referencia/crudo/valor-ref-<año>.json): el arreglo `[MANCODIGO, V_REF]` que
// deja descargar.mjs, una pareja por manzana.
// Salida (determinista: misma entrada ⇒ mismos bytes): src/engine/zonas/valor-referencia.json.
//
// El valor es de TERRENO, por MANZANA (mediana del valor comercial por m² de terreno). Aquí se agrupa por barrio con
// los 6 primeros dígitos del código de manzana, que son el código de sector catastral del catálogo de barrios de la
// app (ADR 014); el valor del barrio es la mediana de las medianas de sus manzanas. Jamás es el precio de un
// inmueble ni entra al rango de oferta.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const VIGENCIA = 2026;
const ENTRADA = `scripts/valor-referencia/crudo/valor-ref-${VIGENCIA}.json`;
const CATALOGO = "src/engine/zonas/sectores.json";
const SALIDA = "src/engine/zonas/valor-referencia.json";

export const FUENTE =
  "Catastro Bogotá (UAECD) — Valor de referencia por metro cuadrado de terreno";
export const LICENCIA = "CC BY 4.0";

// Mediana de una lista de enteros; si es par, el promedio de los dos centrales redondeado al entero.
export function mediana(valores) {
  const v = [...valores].sort((a, b) => a - b);
  const n = v.length;
  if (n === 0) return null;
  const m = n >> 1;
  return n % 2 === 1 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
}

// manzanas: [[MANCODIGO, V_REF], …]. codigos: los códigos de barrio del catálogo. Devuelve las filas
// `[codigo, mediana, nManzanas]` de los barrios que tienen al menos una manzana con valor, ordenadas por código.
export function porBarrio(manzanas, codigos) {
  const catalogo = new Set(codigos);
  const grupos = new Map();
  let sinBarrio = 0;
  for (const [man, valor] of manzanas) {
    const v = Number(valor);
    if (!Number.isFinite(v) || v <= 0) continue;
    const codigo = String(man).slice(0, 6);
    if (!catalogo.has(codigo)) {
      sinBarrio += 1;
      continue;
    }
    const lista = grupos.get(codigo);
    if (lista) lista.push(Math.round(v));
    else grupos.set(codigo, [Math.round(v)]);
  }
  const filas = [...grupos.keys()]
    .sort()
    .map((c) => [c, mediana(grupos.get(c)), grupos.get(c).length]);
  return { filas, sinBarrio };
}

export function documento(filas, descargado) {
  return {
    vigencia: VIGENCIA,
    fuente: FUENTE,
    licencia: LICENCIA,
    descargado,
    medida:
      "mediana de los valores de referencia de las manzanas del barrio (COP por m² de terreno)",
    filas,
  };
}

function principal() {
  const manzanas = JSON.parse(readFileSync(ENTRADA, "utf8"));
  const codigos = JSON.parse(readFileSync(CATALOGO, "utf8")).map((f) => f[0]);
  const { filas, sinBarrio } = porBarrio(manzanas, codigos);
  const descargado = process.argv[2];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(descargado ?? "")) {
    console.error("Uso: node scripts/valor-referencia/convertir.mjs AAAA-MM-DD  (fecha de la descarga)");
    process.exit(1);
  }
  writeFileSync(SALIDA, JSON.stringify(documento(filas, descargado)) + "\n");
  console.log(
    `manzanas: ${manzanas.length} · barrios con valor: ${filas.length} de ${codigos.length} · manzanas fuera del catálogo: ${sinBarrio}`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) principal();
