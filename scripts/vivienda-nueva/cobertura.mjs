// Informe de cobertura de la edición unida (S11, F1): por campo, por región y contra el índice impreso de la revista.
//   node scripts/vivienda-nueva/cobertura.mjs          → imprime el informe
//   node scripts/vivienda-nueva/cobertura.mjs --md     → además lo escribe en scripts/vivienda-nueva/INFORME-187.md
//                                                        (solo agregados: ningún nombre, cifra de proyecto ni texto de aviso)
// Lee `crudo/edicion-187.json` (de validar.mjs --unir) y, si existe, `crudo/indice-p24-p25.json` (control, no fuente).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  contarPor,
  cobertura,
  cruzarConIndice,
} from "../../src/engine/vivienda-nueva/lectura.ts";

const CRUDO = join(dirname(fileURLToPath(import.meta.url)), "crudo");
const e = JSON.parse(readFileSync(join(CRUDO, "edicion-187.json"), "utf8"));
const proyectos = e.proyectos;
const apariciones = e.paginas.reduce((s, p) => s + p.proyectos.length, 0);

console.log(
  `Edición 187 · ${e.paginas.length} páginas · ${apariciones} apariciones · ${proyectos.length} proyectos únicos\n`,
);

console.log("Por tipo de página (páginas · apariciones):");
const porTipo = {};
for (const p of e.paginas) {
  const t = (porTipo[p.tipo] ??= { paginas: 0, apariciones: 0 });
  t.paginas++;
  t.apariciones += p.proyectos.length;
}
for (const [t, v] of Object.entries(porTipo))
  console.log(
    `  ${t.padEnd(20)} ${String(v.paginas).padStart(3)} · ${String(v.apariciones).padStart(3)}`,
  );

console.log(
  "\nPor región (proyectos únicos):",
  JSON.stringify(contarPor(proyectos, (p) => p.region)),
);
console.log(
  "Por segmento:",
  JSON.stringify(contarPor(proyectos, (p) => String(p.segmento))),
);
console.log(
  "Por tipo de inmueble:",
  JSON.stringify(contarPor(proyectos, (p) => String(p.tipo))),
);

console.log("\nCobertura por campo (proyectos únicos; «dice» = trae valor):");
console.log(
  "  campo".padEnd(28) +
    "dice".padStart(6) +
    "no lo dice".padStart(12) +
    "ilegible".padStart(10) +
    "null".padStart(6),
);
for (const c of cobertura(proyectos)) {
  const pc = (n) =>
    `${n}`.padStart(4) + ` ${Math.round((100 * n) / c.total)}%`.padStart(5);
  console.log(
    `  ${c.campo.padEnd(26)}${pc(c.conValor)}${String(c.noLoDice).padStart(8)}${String(c.ilegible).padStart(10)}${String(c.nulo).padStart(6)}`,
  );
}

const ruta = join(CRUDO, "indice-p24-p25.json");
if (existsSync(ruta)) {
  const idx = JSON.parse(readFileSync(ruta, "utf8"));
  const filas = [...idx.p24, ...idx.p25].map((f) => ({
    nombre: f.nombre,
    constructora: f.constructora,
    precio_desde: f.precio_desde,
  }));
  const x = cruzarConIndice(proyectos, filas);
  console.log(
    `\nCruce con el índice impreso (p. 24–25): ${x.filas} renglones, ${x.coinciden} con proyecto transcrito.`,
  );
  console.log(
    `  Sin proyecto transcrito (${x.sinProyecto.length}): ${x.sinProyecto.join(" · ") || "ninguno"}`,
  );
  console.log(`  Precio distinto al del aviso (${x.precioDifiere.length}):`);
  for (const d of x.precioDifiere)
    console.log(
      `    · ${d.indice}: índice ${d.precioIndice} | aviso p.${d.pagina} ${d.precioAviso}`,
    );
  console.log(
    `  Proyectos transcritos que el índice no nombra: ${x.sinIndice}`,
  );
}

// --- por región y por franja de precio: qué tanto dice cada aviso lo que hace falta para una ficha honesta --------------
const CAMPOS_FICHA = [
  "area_privada_desde",
  "etapa",
  "entrega",
  "parqueadero",
  "precio_fijo",
  "subsidio_anunciado",
];
const FRANJAS = [
  ["hasta 150 M", (p) => p <= 150e6],
  ["150 a 262,6 M", (p) => p > 150e6 && p <= 262_635_750],
  ["262,6 a 400 M", (p) => p > 262_635_750 && p <= 400e6],
  ["más de 400 M", (p) => p > 400e6],
];
const dice = (v) => v !== "no_lo_dice" && v !== "ilegible" && v !== null;
const pct = (n, t) => (t === 0 ? "—" : `${Math.round((100 * n) / t)} %`);
function desglose(titulo, grupos) {
  const filas = [];
  for (const [nombre, lista] of grupos) {
    filas.push([
      nombre,
      String(lista.length),
      ...CAMPOS_FICHA.map((c) =>
        pct(lista.filter((p) => dice(p[c])).length, lista.length),
      ),
    ]);
  }
  return { titulo, filas };
}
const porRegion = desglose(
  "Por región",
  ["bogota", "sabana", "otra", "sin_ciudad"].map((r) => [
    r,
    proyectos.filter((p) => p.region === r),
  ]),
);
const porFranja = desglose("Por franja de precio «desde»", [
  ...FRANJAS.map(([n, f]) => [
    n,
    proyectos.filter(
      (p) => typeof p.precio_desde === "number" && f(p.precio_desde),
    ),
  ]),
  ["sin precio", proyectos.filter((p) => typeof p.precio_desde !== "number")],
]);
const cab = ["", "proyectos", ...CAMPOS_FICHA.map((c) => c.replace(/_/g, " "))];
for (const d of [porRegion, porFranja]) {
  console.log(
    `\n${d.titulo} (porcentaje de proyectos cuyo aviso DICE el dato):`,
  );
  console.log(
    "  " +
      cab
        .map((c, i) => (i === 0 ? c.padEnd(16) : c.padStart(i === 1 ? 10 : 20)))
        .join(""),
  );
  for (const f of d.filas)
    console.log(
      "  " +
        f
          .map((c, i) =>
            i === 0 ? c.padEnd(16) : c.padStart(i === 1 ? 10 : 20),
          )
          .join(""),
    );
}

if (process.argv.includes("--md")) {
  const tabla = (c, f) =>
    [
      `| ${c.join(" | ")} |`,
      `| ${c.map(() => "---").join(" | ")} |`,
      ...f.map((r) => `| ${r.join(" | ")} |`),
    ].join("\n");
  const campos = cobertura(proyectos);
  const md = [
    "# Cobertura de la edición 187 (agregados)",
    "",
    "Informe generado por `cobertura.mjs` a partir de la transcripción procesada. Solo trae conteos y porcentajes: ningún nombre, cifra de proyecto ni texto de aviso. «Dice» = el aviso trae el dato; lo demás es «no lo dice» (no está impreso) o «ilegible».",
    "",
    `- Páginas leídas: ${e.paginas.length} de 68 · apariciones: ${apariciones} · proyectos únicos: ${proyectos.length}`,
    `- Por región: ${JSON.stringify(contarPor(proyectos, (p) => p.region))}`,
    `- Por segmento: ${JSON.stringify(contarPor(proyectos, (p) => String(p.segmento)))}`,
    "",
    "## Por campo",
    "",
    tabla(
      ["campo", "dice", "no lo dice", "ilegible", "no aplica (null)"],
      campos.map((c) => [
        c.campo.replace(/_/g, " "),
        `${c.conValor} (${pct(c.conValor, c.total)})`,
        String(c.noLoDice),
        String(c.ilegible),
        String(c.nulo),
      ]),
    ),
    "",
    `## ${porRegion.titulo}`,
    "",
    tabla(cab, porRegion.filas),
    "",
    `## ${porFranja.titulo}`,
    "",
    tabla(cab, porFranja.filas),
    "",
  ].join("\n");
  writeFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "INFORME-187.md"),
    md,
  );
  console.log("\nEscrito scripts/vivienda-nueva/INFORME-187.md");
}
