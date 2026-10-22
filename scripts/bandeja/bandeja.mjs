// Bandeja de IA — la CLI que usa `/bandeja` (contrato v0.1.0; ver src/engine/bandeja/CONTRATO.lock).
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/bandeja/bandeja.mjs verificar
//   node … scripts/bandeja/bandeja.mjs listar [--hoy AAAA-MM-DD] [--autoriza-vencido]
//   node … scripts/bandeja/bandeja.mjs entregar <id> <salida.json> --modelo <m> --duracion-s <n> [--autoriza-vencido]
//   node … scripts/bandeja/bandeja.mjs cargar <id> [--nube]            (la edición a la base, SIN publicar; escribe revision-N.html)
//   node … scripts/bandeja/bandeja.mjs publicar <id> --revisada [--nube] (solo con la muestra revisada por el usuario)
//   node … scripts/bandeja/bandeja.mjs estado <N> [--nube] · retirar <N> [--nube]
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
import { createClient } from "@supabase/supabase-js";
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
  EDICION,
  PAGINAS_EDICION,
} from "../../src/engine/vivienda-nueva/edicion.ts";
import { cargaDeEdicion } from "../../src/engine/vivienda-nueva/filas.ts";
import { escribirRevision } from "./revision.mjs";
import {
  archivoDeEdicion,
  CARPETA_INTERMEDIA,
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
  console.log(
    "✓ tipo edicion-del-mes registrado (destino: la tabla de ediciones)",
  );
  return r.tipo;
}

function pendientes() {
  if (!existsSync(FUENTES)) return null;
  const archivos = readdirSync(FUENTES)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .map((nombre) => ({ nombre }));
  const carpeta = join(BASE, CARPETA_INTERMEDIA);
  const transcritas = existsSync(carpeta)
    ? readdirSync(carpeta)
        .map((f) => f.match(/^edicion-(\d+)\.json$/)?.[1])
        .filter(Boolean)
        .map(Number)
    : [];
  return trabajosDeEdicion(archivos, transcritas);
}

/** La base con la llave de servicio. Se niega a tocar una que no sea local sin `--nube`, y dice a cuál se conecta. */
function conectarBase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !llave) {
    console.error(
      "✗ faltan SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY en el entorno",
    );
    process.exit(1);
  }
  const host = new URL(url).hostname;
  const local = host === "127.0.0.1" || host === "localhost";
  console.log(
    local
      ? "  Base: LOCAL"
      : `  Base: NUBE (${host.slice(0, 4)}…${host.slice(-14)})`,
  );
  if (!local && !args.includes("--nube")) {
    console.error(
      "✗ esa base no es local: se niega a escribir sin --nube (y sin tu «sí»)",
    );
    process.exit(1);
  }
  return createClient(url, llave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function numeroDeId(id) {
  const n = Number(
    String(id ?? "")
      .split("-")
      .pop(),
  );
  if (!Number.isInteger(n) || n <= 0) {
    console.error(`✗ ${id}: no es un trabajo de edición (edicion-del-mes-N)`);
    process.exit(2);
  }
  return n;
}

function anotarAccion(accion, numero, extra = {}) {
  mkdirSync(dirname(REGISTRO), { recursive: true });
  appendFileSync(
    REGISTRO,
    `${JSON.stringify({ trabajo: `edicion-del-mes-${numero}`, accion, fecha: hoy, ...extra })}\n`,
  );
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
  for (const t of p.listos) {
    filas.push({ id: t.id, estado: "listo", razon: undefined, vence: t.vence });
  }
  console.log("");
  for (const f of filas) {
    console.log(
      `  · ${f.id} · ${f.estado}${f.razon ? ` (${f.razon})` : ""} · vence ${f.vence}`,
    );
  }
  if (p.listos.length > 0) {
    console.log(
      "  «listo» = la transcripción está validada en tu carpeta ignorada; falta cargarla a la base y, tras revisar la muestra, publicarla (`estado N`).",
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
  const destino = join(BASE, CARPETA_INTERMEDIA, archivoDeEdicion(numero));
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
    `✓ ${id}: LISTO, validado y guardado en ${CARPETA_INTERMEDIA}${archivoDeEdicion(numero)} (ignorado por git)`,
  );
  console.log(
    `  Falta: \`cargar ${id}\` (a la base, sin publicar) y, tras revisar la muestra, \`publicar ${id} --revisada\`.`,
  );
  console.log(
    `  Revisión pendiente (G5): ${tipo.def.revision.criterio} sobre ≥ ${tipo.def.revision.muestra * 100} % de los proyectos antes de publicar.`,
  );
  console.log("Resumen:", JSON.stringify(resumir([{ id, estado: "listo" }])));
} else if (orden === "cargar") {
  const numero = numeroDeId(args[1]);
  const db = conectarBase();
  verificarContrato();
  registrarTipos();
  if (EDICION.numero !== numero) {
    console.error(
      `✗ la edición vigente en edicion.ts es la ${EDICION.numero}, no la ${numero}: actualiza EDICION y PAGINAS_EDICION antes de cargar`,
    );
    process.exit(1);
  }
  const ruta = join(BASE, CARPETA_INTERMEDIA, archivoDeEdicion(numero));
  if (!existsSync(ruta)) {
    console.error(`✗ no hay ${archivoDeEdicion(numero)}: primero \`entregar\``);
    process.exit(1);
  }
  const entrega = JSON.parse(readFileSync(ruta, "utf8"));
  // G3: lo que entra a la base pasa de nuevo por el esquema del tipo.
  const v = validarEdicionDelMes(entrega, { id: `edicion-del-mes-${numero}` });
  if (!v.ok) {
    console.error(
      `✗ ${archivoDeEdicion(numero)} ya no pasa el esquema: ${v.razones.join(", ")}`,
    );
    process.exit(1);
  }
  const carga = cargaDeEdicion(
    {
      numero,
      nombre: EDICION.nombre,
      desde: EDICION.desde,
      hasta: EDICION.hasta,
    },
    PAGINAS_EDICION,
    entrega.proyectos,
  );
  const { data, error } = await db.rpc("cargar_edicion", { p_edicion: carga });
  if (error) {
    console.error(
      `✗ la base rechazó la carga: ${error.code ?? ""} ${error.message}`,
    );
    process.exit(1);
  }
  const pagina = escribirRevision(carga, join(BASE, CARPETA_INTERMEDIA));
  anotarAccion("cargar", numero, { proyectos: data.proyectos });
  console.log(
    `✓ edicion-del-mes-${numero}: ${data.proyectos} proyectos en la base, SIN publicar`,
  );
  console.log(
    `  Muestra de revisión (semilla ${carga.muestra_semilla}): ${carga.muestra_claves.join(" · ")}`,
  );
  console.log(`  Ábrela para comparar con las páginas: ${pagina}`);
  console.log(
    `  Con la muestra revisada: \`publicar edicion-del-mes-${numero} --revisada\``,
  );
} else if (orden === "publicar") {
  const numero = numeroDeId(args[1]);
  if (!args.includes("--revisada")) {
    console.error(
      "✗ publicar exige --revisada: la edición se publica solo con la muestra revisada por el usuario",
    );
    process.exit(1);
  }
  const db = conectarBase();
  const { data: ed, error: e1 } = await db
    .from("ediciones")
    .select("numero, publicada, muestra_claves")
    .eq("numero", numero)
    .maybeSingle();
  if (e1 || !ed) {
    console.error(
      `✗ la edición ${numero} no está cargada${e1 ? `: ${e1.message}` : ""}`,
    );
    process.exit(1);
  }
  const { data, error } = await db.rpc("publicar_edicion", {
    p_numero: numero,
    p_muestra: ed.muestra_claves,
  });
  if (error) {
    console.error(`✗ la base rechazó la publicación: ${error.message}`);
    process.exit(1);
  }
  anotarAccion("publicar", numero, { revisada: ed.muestra_claves });
  console.log(
    data
      ? `✓ edicion-del-mes-${numero}: PUBLICADA con la muestra revisada (${ed.muestra_claves.length} proyectos)`
      : `· edicion-del-mes-${numero} ya estaba publicada: nada que hacer`,
  );
  console.log(
    "Resumen:",
    JSON.stringify(
      resumir([{ id: `edicion-del-mes-${numero}`, estado: "entregado" }]),
    ),
  );
} else if (orden === "estado") {
  const numero = numeroDeId(`edicion-del-mes-${args[1]}`);
  const db = conectarBase();
  const { data: ed, error } = await db
    .from("ediciones")
    .select(
      "numero, vigente_desde, vigente_hasta, publicada, cargada_at, revisada_at, muestra_semilla",
    )
    .eq("numero", numero)
    .maybeSingle();
  if (error) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
  if (!ed) {
    console.log(`· la edición ${numero} no está en la base`);
  } else {
    const { count } = await db
      .from("proyectos_nuevos")
      .select("*", { count: "exact", head: true })
      .eq("edicion", numero);
    console.log(
      `· edición ${numero}: ${count} proyectos · ${ed.publicada ? "PUBLICADA" : "sin publicar"} · vigencia ${ed.vigente_desde} → ${ed.vigente_hasta} · cargada ${ed.cargada_at}${ed.revisada_at ? ` · revisada ${ed.revisada_at}` : ""}`,
    );
  }
} else if (orden === "retirar") {
  const numero = numeroDeId(`edicion-del-mes-${args[1]}`);
  const db = conectarBase();
  const { data, error } = await db.rpc("retirar_edicion", { p_numero: numero });
  if (error) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
  anotarAccion("retirar", numero);
  console.log(
    data
      ? `✓ edición ${numero} retirada: deja de salir de inmediato`
      : `· la edición ${numero} no estaba publicada`,
  );
} else {
  console.error(
    "Uso: bandeja.mjs verificar | listar | entregar <id> <salida.json> --modelo <m> --duracion-s <n> | cargar <id> | publicar <id> --revisada | estado <N> | retirar <N>",
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
