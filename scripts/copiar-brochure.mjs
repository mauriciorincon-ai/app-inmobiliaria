// Copia el brochure canónico a public/ para que la app lo sirva en /conoce.
//
// docs/BROCHURE.html es la ÚNICA fuente (autocontenido: abre con doble clic sin internet);
// public/conoce.html es artefacto de build y está gitignorado. Nunca se edita la copia: se
// edita el canónico y se vuelve a correr esto.
//
// Corre encadenado en `pnpm dev` y `pnpm build`, así que la CI, los e2e y el deploy siempre
// sirven la última versión del documento.

import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const origen = join(raiz, "docs", "BROCHURE.html");
const destino = join(raiz, "public", "conoce.html");

mkdirSync(dirname(destino), { recursive: true });
copyFileSync(origen, destino);

console.log("brochure → public/conoce.html");
