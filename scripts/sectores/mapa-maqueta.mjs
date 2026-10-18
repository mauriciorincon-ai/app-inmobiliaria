// Genera los datos del mapa de la MAQUETA del comprador (docs/diseno/comprador/assets/mapa-datos.js)
// desde el sector catastral de Catastro Bogotá (CC BY 4.0). No es código de producto: es el «papel»
// del mapa dibujado de la maqueta, con los barrios reales de Chapinero, Chicó y Usaquén, para que la
// maqueta muestre lo que el producto hará (el anuncio como el ÁREA de su barrio, jamás un punto).
//
// Uso: node scripts/sectores/mapa-maqueta.mjs [ruta a SECTOR.geojson]
//      (por defecto scripts/sectores/crudo/SECTOR.geojson; ver scripts/sectores/README.md)
// Determinista: misma entrada ⇒ mismos bytes.

import { readFileSync, writeFileSync } from "node:fs";
import { centroide, simplificar } from "./geometria.mjs";
import { nombreLegible } from "./nombres.mjs";

const ENTRADA = process.argv[2] ?? "scripts/sectores/crudo/SECTOR.geojson";
const SALIDA = "docs/diseno/comprador/assets/mapa-datos.js";

// Recorte: Chapinero, Chicó, Santa Bárbara y Usaquén (lon/lat).
const OESTE = -74.078;
const ESTE = -74.022;
const SUR = 4.632;
const NORTE = 4.712;
const ANCHO = 600; // unidades SVG
const COS = Math.cos((((SUR + NORTE) / 2) * Math.PI) / 180);
const ESCALA = ANCHO / ((ESTE - OESTE) * COS);
const ALTO = Math.round((NORTE - SUR) * ESCALA);
const TOLERANCIA = 0.9; // Douglas-Peucker, en unidades SVG (≈ 9 m)

const proyectar = ([lon, lat]) => [
  (lon - OESTE) * COS * ESCALA,
  (NORTE - lat) * ESCALA,
];

const n1 = (v) => Math.round(v * 10) / 10;

function anillos(geom) {
  const polis = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  return polis.map((p) => p[0]); // solo el anillo exterior: los huecos no se ven a esta escala
}

const geo = JSON.parse(readFileSync(ENTRADA, "utf8"));
const sectores = [];
for (const f of geo.features) {
  const proyectados = anillos(f.geometry).map((r) => r.map(proyectar));
  const mayor = proyectados.reduce((a, b) => (b.length > a.length ? b : a));
  const [cx, cy] = centroide(mayor);
  // Entra si su centroide cae en el recorte ampliado (el SVG recorta el resto).
  if (cx < -60 || cx > ANCHO + 60 || cy < -60 || cy > ALTO + 60) continue;
  const d = proyectados
    .map((r) => simplificar(r, TOLERANCIA))
    .filter((r) => r.length >= 3)
    .map((r) => "M" + r.map(([x, y]) => `${n1(x)} ${n1(y)}`).join("L") + "Z")
    .join("");
  sectores.push({
    c: f.properties.SCACODIGO,
    n: nombreLegible(f.properties.SCANOMBRE),
    r: f.properties.SCATIPO === 0 ? 0 : 1, // 1 = rural o mixto (cerros)
    x: n1(cx),
    y: n1(cy),
    d,
  });
}
sectores.sort((a, b) => a.c.localeCompare(b.c));

const cuerpo =
  "/* Generado por scripts/sectores/mapa-maqueta.mjs — no editar a mano.\n" +
  "   Fuente: Sector catastral, Catastro Bogotá (UAECD), datosabiertos.bogota.gov.co, CC BY 4.0.\n" +
  "   Recorte Chapinero–Usaquén, proyección equirectangular, Douglas-Peucker. */\n" +
  "window.MAPA = " +
  JSON.stringify({
    ancho: ANCHO,
    alto: ALTO,
    recorte: { oeste: OESTE, este: ESTE, sur: SUR, norte: NORTE },
    sectores,
  }) +
  ";\n";
writeFileSync(SALIDA, cuerpo);
console.log(
  `[mapa-maqueta] ${sectores.length} sectores · ${ANCHO}×${ALTO} · ${(cuerpo.length / 1024).toFixed(0)} KB → ${SALIDA}`,
);
