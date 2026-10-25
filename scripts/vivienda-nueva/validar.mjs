// Valida las lecturas de la revista contra el esquema y, con --unir, las junta en UNA edición (S11, F1).
//   node scripts/vivienda-nueva/validar.mjs crudo/lectura-L1.json …   → solo valida (código de salida 1 si falla)
//   node scripts/vivienda-nueva/validar.mjs --unir [--edicion N --paginas P]
//                                                                     → valida las lecturas L* de la edición (por omisión
//                                                                       la de `edicion.ts`; con otra, `--edicion N` y
//                                                                       `--paginas P` las del PDF; las lecturas de otra
//                                                                       edición se ignoran), las une y escribe crudo/unida-<N>.json
// `unida-<N>.json` NO es el entregable: la bandeja (`/bandeja`) lo valida contra el tipo `edicion-del-mes` y lo entrega como
// `crudo/edicion-<N>.json`; hasta entonces el trabajo sigue pendiente. Todo vive en `crudo/` (ignorado por git).
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validarLectura } from "../../src/engine/vivienda-nueva/edicion.ts";
import { unirLecturas } from "../../src/engine/vivienda-nueva/lectura.ts";
import { edicionDeTrabajo, paginasDeLaEdicion } from "./edicion-de-trabajo.mjs";

const CRUDO = join(dirname(fileURLToPath(import.meta.url)), "crudo");

function cargar(ruta) {
  const crudo = JSON.parse(readFileSync(ruta, "utf8"));
  const r = validarLectura(crudo);
  if (!r.ok) {
    console.error(`✗ ${ruta}`);
    for (const e of r.errores.slice(0, 40)) console.error(`  · ${e}`);
    if (r.errores.length > 40)
      console.error(`  … y ${r.errores.length - 40} más`);
    return null;
  }
  const n = r.lectura.paginas.reduce((s, p) => s + p.proyectos.length, 0);
  console.log(`✓ ${ruta}: ${r.lectura.paginas.length} páginas, ${n} proyectos`);
  return r.lectura;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Uso: validar.mjs <lectura.json …> | --unir");
  process.exit(2);
}

if (args[0] === "--unir") {
  const edicion = edicionDeTrabajo(args);
  const totalPaginas = paginasDeLaEdicion(edicion);
  const todas = readdirSync(CRUDO)
    .filter((f) => /^lectura-L[A-Za-z0-9_-]*\.json$/.test(f))
    .sort();
  // Las lecturas de otra edición conviven en `crudo/` y no se mezclan: se miran por su campo `edicion`.
  const archivos = todas.filter(
    (f) =>
      JSON.parse(readFileSync(join(CRUDO, f), "utf8")).edicion ===
      edicion.numero,
  );
  if (archivos.length < todas.length) {
    console.log(
      `Se ignoran ${todas.length - archivos.length} lecturas de otra edición (la que se une es la ${edicion.numero}).`,
    );
  }
  const lecturas = archivos.map((f) => cargar(join(CRUDO, f)));
  if (lecturas.some((l) => l === null) || lecturas.length === 0)
    process.exit(1);
  const e = unirLecturas(lecturas, totalPaginas);
  writeFileSync(
    join(CRUDO, `unida-${edicion.numero}.json`),
    JSON.stringify({ edicion: edicion.numero, ...e }, null, 2),
  );
  const pr = e.paginas.reduce((s, p) => s + p.proyectos.length, 0);
  console.log(
    `\nEdición unida: ${e.paginas.length}/${totalPaginas} páginas leídas, ${pr} apariciones → ${e.proyectos.length} proyectos únicos`,
  );
  console.log(`Páginas sin leer: ${e.paginasSinLeer.join(", ") || "ninguna"}`);
  console.log(
    `Páginas repetidas entre lecturas: ${e.paginasRepetidas.join(", ") || "ninguna"}`,
  );
  console.log(
    `Redondeos reconciliados (queda el valor más fino): ${e.reconciliados.length}`,
  );
  console.log(`Conflictos entre apariciones: ${e.conflictos.length}`);
  for (const c of e.conflictos.slice(0, 30)) {
    console.log(
      `  · ${c.proyecto} · ${c.campo}: ${c.valores.map((v) => `p.${v.pagina}=${JSON.stringify(v.valor)}`).join(" | ")}`,
    );
  }
  const avisos = e.paginas.flatMap((p) =>
    p.avisos_al_agente.map((a) => `p.${p.pagina}: ${a}`),
  );
  console.log(`Textos dirigidos a un agente (ignorados): ${avisos.length}`);
  for (const a of avisos) console.log(`  · ${a}`);
  process.exit(0);
}

const ok = args.map((a) => cargar(resolve(a))).every(Boolean);
process.exit(ok ? 0 : 1);
