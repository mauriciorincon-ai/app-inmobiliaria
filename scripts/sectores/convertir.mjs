// Convierte el «Sector catastral» de Catastro Bogotá (UAECD, CC BY 4.0) en el catálogo de barrios de la
// app. No es código de producto: se corre a mano cuando Catastro publica una versión nueva (ver
// scripts/sectores/README.md) y su salida se versiona.
//
// Entrada (gitignored, scripts/sectores/crudo/): SECTOR.geojson y localidades.esri.json.
// Salidas (deterministas: misma entrada ⇒ mismos bytes):
//   1. public/datos/sectores.geojson        — la forma de cada sector para el mapa (Douglas-Peucker, 5
//                                              decimales, solo el anillo exterior, de mayor a menor área
//                                              para que el pequeño dibuje encima del grande).
//   2. src/engine/zonas/sectores.json       — el catálogo: [código, nombre, localidad, tipo] por sector.
//   3. el bloque de `insert` de la migración 20261019000001_sectores_y_busqueda.sql, entre las marcas
//      «-- BEGIN GENERADO: sectores» y «-- END GENERADO: sectores».
//
// Un sector queda en la localidad que contiene su punto interior (el centroide; si el sector es
// cóncavo y el centroide cae fuera, un punto de su interior). Ese mismo punto es el que guarda la BD
// como `centroide` y el que decide si un anuncio cae dentro de la zona dibujada por el comprador.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  areaAnillo,
  enAnillos,
  puntoInterior,
  simplificar,
} from "./geometria.mjs";
import { nombreLegible } from "./nombres.mjs";

const ENTRADA_SECTOR = "scripts/sectores/crudo/SECTOR.geojson";
const ENTRADA_LOCALIDADES = "scripts/sectores/crudo/localidades.esri.json";
const SALIDA_GEOJSON = "public/datos/sectores.geojson";
const SALIDA_CATALOGO = "src/engine/zonas/sectores.json";
const SALIDA_MIGRACION =
  "supabase/migrations/20261019000001_sectores_y_busqueda.sql";
const MARCA_INICIO = "-- BEGIN GENERADO: sectores";
const MARCA_FIN = "-- END GENERADO: sectores";

// Tolerancia de Douglas-Peucker en grados (0,00012° ≈ 13 m en Bogotá).
const TOLERANCIA = 0.00012;

// LocCodigo de Catastro → nombre exacto de `LOCALIDADES` (src/engine/zonas/localidades.ts) más Sumapaz,
// que es rural y la app no ofrece en el wizard. Por código, no por nombre: el nombre trae Ñ, tildes y
// «CANDELARIA» sin artículo.
export const LOCALIDAD_POR_CODIGO = {
  "01": "Usaquén",
  "02": "Chapinero",
  "03": "Santa Fe",
  "04": "San Cristóbal",
  "05": "Usme",
  "06": "Tunjuelito",
  "07": "Bosa",
  "08": "Kennedy",
  "09": "Fontibón",
  10: "Engativá",
  11: "Suba",
  12: "Barrios Unidos",
  13: "Teusaquillo",
  14: "Los Mártires",
  15: "Antonio Nariño",
  16: "Puente Aranda",
  17: "La Candelaria",
  18: "Rafael Uribe Uribe",
  19: "Ciudad Bolívar",
  20: "Sumapaz",
};

const TIPO_POR_SCATIPO = { 0: "urbano", 1: "rural", 2: "mixto" };

// Sin tildes, minúsculas, solo letras y números: la clave con la que el trigger de la BD empareja el
// barrio escrito con el del catálogo.
export function clave(texto) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Dentro de una localidad el nombre es la llave del trigger: si Catastro repite un nombre, el segundo y
// siguientes (por código) llevan « (2)», « (3)». Recibe y devuelve sectores ordenados por código.
export function desambiguar(sectores) {
  const vistos = new Map();
  return sectores.map((s) => {
    const k = `${s.localidad}|${clave(s.nombre)}`;
    const n = (vistos.get(k) ?? 0) + 1;
    vistos.set(k, n);
    return n === 1 ? s : { ...s, nombre: `${s.nombre} (${n})` };
  });
}

function anillosExteriores(geom) {
  const polis = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  return polis.map((p) => p[0]);
}

const r5 = (v) => Math.round(v * 1e5) / 1e5;
const r6 = (v) => Math.round(v * 1e6) / 1e6;

// Anillo simplificado y redondeado; nunca menos de un triángulo cerrado.
function anilloParaMapa(anillo) {
  let simple = simplificar(anillo, TOLERANCIA);
  if (simple.length < 4) simple = simplificar(anillo, TOLERANCIA / 10);
  if (simple.length < 4) simple = anillo;
  const redondo = [];
  for (const [x, y] of simple) {
    const p = [r5(x), r5(y)];
    const u = redondo[redondo.length - 1];
    if (!u || u[0] !== p[0] || u[1] !== p[1]) redondo.push(p);
  }
  const p0 = redondo[0];
  const pf = redondo[redondo.length - 1];
  if (p0[0] !== pf[0] || p0[1] !== pf[1]) redondo.push(p0);
  return redondo.length >= 4 ? redondo : null;
}

// Localidad por punto interior; sin acierto (un hueco entre polígonos) la que tenga el vértice más cercano.
function localidadDe(punto, localidades) {
  for (const l of localidades) if (enAnillos(punto, l.anillos)) return l.nombre;
  let mejor = null;
  for (const l of localidades) {
    for (const a of l.anillos) {
      for (const v of a) {
        const d = Math.hypot(v[0] - punto[0], v[1] - punto[1]);
        if (mejor === null || d < mejor.d) mejor = { d, nombre: l.nombre };
      }
    }
  }
  return mejor.nombre;
}

export function convertir(sectorGeojson, localidadesEsri) {
  const localidades = localidadesEsri.features.map((f) => ({
    nombre: LOCALIDAD_POR_CODIGO[f.attributes.LocCodigo],
    anillos: f.geometry.rings,
  }));
  for (const l of localidades) {
    if (!l.nombre)
      throw new Error("localidad sin nombre en LOCALIDAD_POR_CODIGO");
  }

  let sinLocalidadExacta = 0;
  let centroideFuera = 0;
  const filas = [];
  for (const f of sectorGeojson.features) {
    const exteriores = anillosExteriores(f.geometry);
    const mayor = exteriores.reduce((a, b) =>
      Math.abs(areaAnillo(b)) > Math.abs(areaAnillo(a)) ? b : a,
    );
    const { punto, centroide } = puntoInterior(mayor);
    if (!centroide) centroideFuera++;
    const anillos = exteriores.map(anilloParaMapa).filter(Boolean);
    const exacta = localidades.some((l) => enAnillos(punto, l.anillos));
    if (!exacta) sinLocalidadExacta++;
    filas.push({
      codigo: f.properties.SCACODIGO,
      nombre: nombreLegible(f.properties.SCANOMBRE),
      localidad: localidadDe(punto, localidades),
      tipo: TIPO_POR_SCATIPO[f.properties.SCATIPO],
      lon: r6(punto[0]),
      lat: r6(punto[1]),
      area: Math.abs(exteriores.reduce((s, a) => s + areaAnillo(a), 0)),
      anillos,
    });
  }
  filas.sort((a, b) => a.codigo.localeCompare(b.codigo));
  const sectores = desambiguar(filas);
  return { sectores, sinLocalidadExacta, centroideFuera };
}

// ── Salidas ───────────────────────────────────────────────────────────────────────────────────────

export function geojsonMapa(sectores) {
  const features = [...sectores]
    .sort((a, b) => b.area - a.area || a.codigo.localeCompare(b.codigo))
    .map((s) => ({
      type: "Feature",
      properties: { c: s.codigo },
      geometry:
        s.anillos.length === 1
          ? { type: "Polygon", coordinates: [s.anillos[0]] }
          : { type: "MultiPolygon", coordinates: s.anillos.map((a) => [a]) },
    }));
  return JSON.stringify({ type: "FeatureCollection", features });
}

export function catalogo(sectores) {
  return (
    "[\n" +
    sectores
      .map((s) => JSON.stringify([s.codigo, s.nombre, s.localidad, s.tipo]))
      .join(",\n") +
    "\n]\n"
  );
}

const sql = (t) => `'${t.replace(/'/g, "''")}'`;

export function bloqueInserts(sectores) {
  const filas = sectores.map(
    (s) =>
      `  (${sql(s.codigo)}, ${sql(s.nombre)}, ${sql(s.localidad)}, ${sql(s.tipo)}, point(${s.lon}, ${s.lat}))`,
  );
  return (
    `${MARCA_INICIO} (${sectores.length} filas; scripts/sectores/convertir.mjs, no editar a mano)\n` +
    "insert into public.sectores (codigo, nombre, localidad, tipo, centroide) values\n" +
    filas.join(",\n") +
    ";\n" +
    MARCA_FIN
  );
}

export function reemplazarBloque(migracion, bloque) {
  const i = migracion.indexOf(MARCA_INICIO);
  const f = migracion.indexOf(MARCA_FIN);
  if (i === -1 || f === -1 || f < i) {
    throw new Error(
      `La migración no trae las marcas «${MARCA_INICIO}» y «${MARCA_FIN}».`,
    );
  }
  return migracion.slice(0, i) + bloque + migracion.slice(f + MARCA_FIN.length);
}

function principal() {
  const sector = JSON.parse(readFileSync(ENTRADA_SECTOR, "utf8"));
  const localidades = JSON.parse(readFileSync(ENTRADA_LOCALIDADES, "utf8"));
  const { sectores, sinLocalidadExacta, centroideFuera } = convertir(
    sector,
    localidades,
  );

  const geojson = geojsonMapa(sectores);
  writeFileSync(SALIDA_GEOJSON, geojson);
  writeFileSync(SALIDA_CATALOGO, catalogo(sectores));
  const migracion = readFileSync(SALIDA_MIGRACION, "utf8");
  writeFileSync(
    SALIDA_MIGRACION,
    reemplazarBloque(migracion, bloqueInserts(sectores)),
  );

  const porLocalidad = {};
  for (const s of sectores)
    porLocalidad[s.localidad] = (porLocalidad[s.localidad] ?? 0) + 1;
  const renombrados = sectores.filter((s) => / \(\d+\)$/.test(s.nombre)).length;
  console.log(
    `[sectores] ${sectores.length} sectores en ${Object.keys(porLocalidad).length} localidades`,
  );
  console.log(
    `[sectores] punto interior distinto del centroide: ${centroideFuera} · sin localidad exacta (vértice más cercano): ${sinLocalidadExacta} · nombres con sufijo: ${renombrados}`,
  );
  console.log(
    `[sectores] ${SALIDA_GEOJSON} ${(geojson.length / 1024).toFixed(0)} KB · ${SALIDA_CATALOGO}`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) principal();
