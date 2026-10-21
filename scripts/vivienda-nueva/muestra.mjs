// Elige con semilla declarada las páginas de la DOBLE LECTURA (≥ 10 % de los proyectos) y compara las dos lecturas (S11, F1).
//   node scripts/vivienda-nueva/muestra.mjs                 → imprime las páginas de la muestra (semilla 187 = la edición)
//   node scripts/vivienda-nueva/muestra.mjs --comparar      → compara crudo/doble-*.json contra la primera lectura
// La segunda lectura la hace OTRO lector, de la página entera y SIN ver la primera. Todo vive en `crudo/` (ignorado).
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validarLectura } from "../../src/engine/vivienda-nueva/edicion.ts";
import {
  CAMPOS_DE_ESTRUCTURA,
  compararLecturas,
  muestraDobleLectura,
} from "../../src/engine/vivienda-nueva/lectura.ts";

const CRUDO = join(dirname(fileURLToPath(import.meta.url)), "crudo");
const SEMILLA = 187;

const unida = JSON.parse(readFileSync(join(CRUDO, "edicion-187.json"), "utf8"));

if (process.argv[2] !== "--comparar") {
  const paginas = muestraDobleLectura(unida.paginas, SEMILLA, 0.1);
  const n = unida.paginas
    .filter((p) => paginas.includes(p.pagina))
    .reduce((s, p) => s + p.proyectos.length, 0);
  const total = unida.paginas.reduce((s, p) => s + p.proyectos.length, 0);
  console.log(
    `Semilla ${SEMILLA}. Páginas de la doble lectura: ${paginas.join(", ")}`,
  );
  console.log(
    `Cubren ${n} de ${total} apariciones (${((100 * n) / total).toFixed(1)} %).`,
  );
  process.exit(0);
}

const dobles = readdirSync(CRUDO).filter((f) =>
  /^doble-D[A-Za-z0-9_-]*\.json$/.test(f),
);
let cifras = 0;
let estructura = 0;
let paginasComparadas = 0;
for (const f of dobles) {
  const r = validarLectura(JSON.parse(readFileSync(join(CRUDO, f), "utf8")));
  if (!r.ok) {
    console.error(`✗ ${f}`);
    r.errores.slice(0, 20).forEach((e) => console.error(`  · ${e}`));
    process.exit(1);
  }
  const d = compararLecturas(unida.paginas, r.lectura.paginas);
  paginasComparadas += r.lectura.paginas.length;
  const esEstructura = (x) => CAMPOS_DE_ESTRUCTURA.includes(x.campo);
  cifras += d.filter((x) => !esEstructura(x)).length;
  estructura += d.filter(esEstructura).length;
  console.log(
    `${f}: ${r.lectura.paginas.length} páginas, ${d.length} diferencias`,
  );
  for (const x of d) {
    const clase = esEstructura(x) ? "nombre/estructura" : "CIFRA";
    console.log(
      `  · [${clase}] p.${x.pagina} ${x.proyecto} · ${x.campo}: 1.ª=${JSON.stringify(x.primera)} | 2.ª=${JSON.stringify(x.segunda)}`,
    );
  }
}
console.log(
  `\nPáginas comparadas: ${paginasComparadas} · cifras distintas: ${cifras} · nombre o estructura: ${estructura}`,
);
