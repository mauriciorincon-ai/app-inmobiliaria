// Bandeja de IA — la CLI que usa `/bandeja` (contrato v0.1.0; ver src/engine/bandeja/CONTRATO.lock).
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/bandeja/bandeja.mjs verificar
//   node … scripts/bandeja/bandeja.mjs listar [--hoy AAAA-MM-DD] [--autoriza-vencido]
//   node … scripts/bandeja/bandeja.mjs entregar <id> <salida.json> --modelo <m> --duracion-s <n> [--autoriza-vencido]
// La IA PRODUCE (en la sesión de Claude Code) y este script DECIDE con los motores puros: admite, valida, entrega y
// resume. No abre el PDF ni lee sus metadatos: de la carpeta de fuentes solo lee NOMBRES de archivo. Sin API de pago.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  admitir,
  entregar,
  registrarTipo,
  RegistroSchema,
  resumir,
} from "../../src/engine/bandeja/bandeja.ts";
import { verificarLock } from "../../src/engine/bandeja/lock.ts";
import {
  archivoDeEdicion,
  DEFINICION_EDICION_DEL_MES,
  numeroDeEdicion,
  trabajosDeEdicion,
  validarEdicionDelMes,
} from "../../src/engine/bandeja/tipos/edicion-del-mes.ts";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
// Dónde se leen las transcripciones entregadas y se escribe el registro: por omisión, esta app. `BANDEJA_SALIDA` lo desvía a
// otra carpeta (las pruebas de la CLI, para no tocar el crudo real). El TIPO sigue declarando el destino relativo.
const BASE = process.env.BANDEJA_SALIDA ?? RAIZ;
const REGISTRO = join(BASE, "scripts/bandeja/registro/corridas.jsonl");

const args = process.argv.slice(2);
const orden = args[0];
const bandera = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const hoy = bandera("hoy") ?? new Date().toISOString().slice(0, 10);
const autorizaVencido = args.includes("--autoriza-vencido");

// La carpeta de fuentes está en la planeadora, solo en el Mac del usuario: se puede apuntar con BANDEJA_FUENTES.
const FUENTES =
  process.env.BANDEJA_FUENTES ??
  join(
    homedir(),
    "Code/hr01-develop-ai-apps/portafolio/inmobiliaria/fuentes/estrenar-vivienda",
  );

function estaIgnorada(ruta) {
  try {
    execFileSync("git", ["check-ignore", "-q", ruta], { cwd: RAIZ });
    return true;
  } catch {
    return false;
  }
}

function estaVersionada(ruta) {
  const salida = execFileSync("git", ["ls-files", "--", ruta], {
    cwd: RAIZ,
    encoding: "utf8",
  });
  return salida.trim().length > 0;
}

function verificarContrato() {
  const lock = readFileSync(
    join(RAIZ, "src/engine/bandeja/CONTRATO.lock"),
    "utf8",
  );
  const r = verificarLock(lock, (c) =>
    createHash("sha256").update(c).digest("hex"),
  );
  if (!r.ok) {
    console.error(`✗ CONTRATO.lock: ${r.razon}`);
    process.exit(1);
  }
  console.log(
    `✓ CONTRATO.lock: bandeja-ia v${r.sello.version}, huella ${r.sello.sha256.slice(0, 12)}…`,
  );
}

function registrarTipos() {
  const r = registrarTipo(DEFINICION_EDICION_DEL_MES, validarEdicionDelMes, {
    estaIgnorada,
    estaVersionada,
  });
  if (!r.ok) {
    console.error(`✗ tipo edicion-del-mes rechazado: ${r.razon}`);
    process.exit(1);
  }
  console.log("✓ tipo edicion-del-mes registrado (destino ignorado por git)");
  return r.tipo;
}

function pendientes() {
  if (!existsSync(FUENTES)) return null;
  const archivos = readdirSync(FUENTES)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .map((nombre) => ({ nombre }));
  const destino = join(BASE, DEFINICION_EDICION_DEL_MES.destino.ruta);
  const transcritas = existsSync(destino)
    ? readdirSync(destino)
        .map((f) => f.match(/^edicion-(\d+)\.json$/)?.[1])
        .filter(Boolean)
        .map(Number)
    : [];
  return trabajosDeEdicion(archivos, transcritas);
}

if (orden === "verificar") {
  verificarContrato();
  registrarTipos();
} else if (orden === "listar") {
  verificarContrato();
  const tipo = registrarTipos();
  const p = pendientes();
  if (p === null) {
    console.log(
      "\nLa carpeta de fuentes no está en este equipo: nada que listar.",
    );
    process.exit(0);
  }
  const filas = p.trabajos.map((t) => {
    const a = admitir(t, tipo.def, hoy, autorizaVencido);
    return {
      id: t.id,
      estado: a.estado === "tomado" ? "pendiente" : a.estado,
      razon: a.razon,
      vence: t.vence,
    };
  });
  console.log("");
  for (const f of filas) {
    console.log(
      `  · ${f.id} · ${f.estado}${f.razon ? ` (${f.razon})` : ""} · vence ${f.vence}`,
    );
  }
  if (p.ignorados.length > 0) {
    console.log(
      `  Archivos que no siguen el nombre AAAA-MM-edicion-N.pdf (no se tocan): ${p.ignorados.length}`,
    );
  }
  console.log("\nResumen:", JSON.stringify(resumir(filas)));
} else if (orden === "entregar") {
  const [, id, archivoSalida] = args;
  const modelo = bandeja_modelo();
  verificarContrato();
  const tipo = registrarTipos();
  const p = pendientes();
  const t = p?.trabajos.find((x) => x.id === id);
  if (!t) {
    console.error(`✗ ${id}: no es un trabajo pendiente de este equipo`);
    process.exit(1);
  }
  const a = admitir(t, tipo.def, hoy, autorizaVencido);
  if (a.estado !== "tomado") {
    console.error(
      `✗ ${id}: ${a.estado} (${a.razon}). Un trabajo vencido pide el «sí» del usuario: --autoriza-vencido`,
    );
    process.exit(1);
  }
  const salida = JSON.parse(readFileSync(resolve(archivoSalida), "utf8"));
  const e = entregar({ estado: "tomado", id }, tipo, salida);
  if (e.estado !== "entregado") {
    console.error(`✗ ${id}: rechazado (${e.razon})`);
    for (const r of e.razones.slice(0, 20)) console.error(`  · ${r}`);
    process.exit(1);
  }
  const numero = numeroDeEdicion(`${t.entrada.split("/").pop()}`);
  const destino = join(BASE, e.destino.ruta, archivoDeEdicion(numero));
  mkdirSync(dirname(destino), { recursive: true });
  if (resolve(archivoSalida) !== destino)
    copyFileSync(resolve(archivoSalida), destino);
  // G2: lo que la revista dijo a un agente ya vino anotado por el lector (`avisos_al_agente`); aquí se deja en el registro.
  const anotaciones = salida.paginas.flatMap((pg) =>
    pg.avisos_al_agente.map(() => ({
      trabajo: id,
      codigo: "instruccion_dirigida",
      donde: `p.${pg.pagina}`,
    })),
  );
  const registro = RegistroSchema.parse({
    modelo,
    fecha: hoy,
    duracion_s: Number(bandera("duracion-s") ?? 0),
    procesados: 1,
    // Nadie ha revisado nada todavía: la muestra queda PENDIENTE hasta que el usuario la revise (G5).
    muestra_revisada: `pendiente:${tipo.def.revision.criterio}`,
    anotaciones,
  });
  mkdirSync(dirname(REGISTRO), { recursive: true });
  appendFileSync(REGISTRO, `${JSON.stringify({ trabajo: id, ...registro })}\n`);
  console.log(
    `✓ ${id}: entregado en ${e.destino.ruta}${archivoDeEdicion(numero)} (ignorado por git)`,
  );
  console.log(
    `  Revisión pendiente (G5): ${tipo.def.revision.criterio} sobre ≥ ${tipo.def.revision.muestra * 100} % de los proyectos antes de publicar.`,
  );
  console.log(
    "Resumen:",
    JSON.stringify(resumir([{ id, estado: "entregado" }])),
  );
} else {
  console.error(
    "Uso: bandeja.mjs verificar | listar | entregar <id> <salida.json> --modelo <m> --duracion-s <n>",
  );
  process.exit(2);
}

function bandeja_modelo() {
  const m = bandera("modelo");
  if (!m) {
    console.error("✗ falta --modelo (el registro de la corrida lo exige)");
    process.exit(2);
  }
  return m;
}
