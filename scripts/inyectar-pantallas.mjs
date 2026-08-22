// Inyecta las capturas reales (data: URIs WebP) en docs/BROCHURE.html, reemplazando los
// marcadores `src="PANTALLA:<nombre>"`. Así el brochure sigue siendo AUTOCONTENIDO: las imágenes
// viven dentro del archivo y se abre con doble clic sin internet.
//
// Antes de correr esto: node scripts/capturar-pantallas-reales.mjs (con la app en marcha).
// Uso: node scripts/inyectar-pantallas.mjs [ruta-pantallas.json]

import { readFileSync, writeFileSync } from "node:fs";

const JSON_PANTALLAS = process.argv[2] || "/tmp/pantallas-reales/pantallas.json";
const BROCHURE = "docs/BROCHURE.html";

const pantallas = JSON.parse(readFileSync(JSON_PANTALLAS, "utf8"));
let html = readFileSync(BROCHURE, "utf8");

let inyectadas = 0;
for (const [nombre, uri] of Object.entries(pantallas)) {
  const marcador = `src="PANTALLA:${nombre}"`;
  if (html.includes(marcador)) {
    html = html.replace(marcador, `src="${uri}"`);
    inyectadas++;
    console.log(`✓ ${nombre} (${(uri.length / 1024).toFixed(1)} KB)`);
  }
}

const faltan = html.match(/src="PANTALLA:[^"]+"/g);
if (faltan) {
  console.error("✗ Quedaron marcadores sin imagen:", faltan.join(", "));
  process.exit(1);
}

writeFileSync(BROCHURE, html);
console.log(
  `\n${inyectadas} capturas inyectadas — ${BROCHURE}: ${(html.length / 1024).toFixed(1)} KB`,
);
