// Copia el worker de MapLibre a public/ para que el mapa de /buscar lo encuentre.
//
// MapLibre GL abre su hilo de dibujo desde un archivo propio (`maplibre-gl-worker.mjs`) y por defecto
// lo busca junto al módulo que lo cargó. Con el empaquetador de Next ese módulo vive en un chunk y el
// worker no está al lado: «Worker failed to load». `MapaMaplibre` le indica la ruta con
// `setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")` y este script deja el archivo ahí. Es un artefacto
// de build (public/maplibre/ está gitignorado): se copia de node_modules, jamás se edita.
//
// Corre encadenado en `pnpm dev` y `pnpm build`, así que la CI, los e2e y el deploy lo traen siempre.

import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const origen = join(
  raiz,
  "node_modules",
  "maplibre-gl",
  "dist",
  "maplibre-gl-worker.mjs",
);
const destino = join(raiz, "public", "maplibre", "maplibre-gl-worker.mjs");

mkdirSync(dirname(destino), { recursive: true });
copyFileSync(origen, destino);

console.log("maplibre worker → public/maplibre/maplibre-gl-worker.mjs");
