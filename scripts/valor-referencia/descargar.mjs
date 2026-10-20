// Descarga las manzanas del «Valor de referencia por metro cuadrado de terreno» de Catastro Bogotá (UAECD, CC BY 4.0)
// a scripts/valor-referencia/crudo/ (gitignored). Solo lee el conjunto abierto publicado para eso, en su servicio
// público de mapas (ArcGIS REST), sin geometría y en páginas de 2 000 (el tope del servicio). No es código de
// producto: se corre a mano (ver scripts/valor-referencia/README.md).
//
// Uso: node scripts/valor-referencia/descargar.mjs

import { mkdirSync, writeFileSync } from "node:fs";

const VIGENCIA = 2026;
const SERVICIO =
  "https://serviciosgis.catastrobogota.gov.co/arcgis/rest/services/catastro/valorreferencia/MapServer/0/query";
const PAGINA = 2000;
const SALIDA = `scripts/valor-referencia/crudo/valor-ref-${VIGENCIA}.json`;

async function pagina(offset) {
  const url = new URL(SERVICIO);
  url.search = new URLSearchParams({
    where: `ANO = DATE '${VIGENCIA}-01-01'`,
    outFields: "MANCODIGO,V_REF",
    returnGeometry: "false",
    orderByFields: "MANCODIGO",
    resultOffset: String(offset),
    resultRecordCount: String(PAGINA),
    f: "json",
  }).toString();
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} en el offset ${offset}`);
  const json = await res.json();
  if (!Array.isArray(json.features))
    throw new Error(`respuesta sin features en el offset ${offset}`);
  return json;
}

const manzanas = [];
for (let offset = 0; ; offset += PAGINA) {
  const json = await pagina(offset);
  for (const f of json.features)
    manzanas.push([f.attributes.MANCODIGO, f.attributes.V_REF]);
  process.stdout.write(`\r${manzanas.length} manzanas`);
  if (!json.exceededTransferLimit) break;
}
process.stdout.write("\n");

mkdirSync("scripts/valor-referencia/crudo", { recursive: true });
writeFileSync(SALIDA, JSON.stringify(manzanas));
console.log(`→ ${SALIDA}`);
