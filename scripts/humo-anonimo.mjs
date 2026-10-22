// El «humo anónimo» (S12): lo que ve alguien con la llave PÚBLICA de la base, y solo eso. Es de SOLO LECTURA: ninguna
// llamada cambia nada (las que deberían rechazarse se rechazan antes de ejecutarse). Sirve para el mismo propósito en
// local y en la nube: demostrar que la migración 15 está y que el anónimo ve lo que debe y nada más.
//
//   NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
//     scripts/humo-anonimo.mjs --espera ausente|vacia|publicada [--hoy AAAA-MM-DD]
//
//   ausente   : la migración 15 NO está (antes de aplicarla en la nube).
//   vacia     : la migración está y ninguna edición está publicada (`nuevos_publicados` devuelve null).
//   publicada : hay una edición publicada y cada proyecto trae EXACTAMENTE las claves de la lista blanca.
// Sale con código 1 si algo no es lo esperado. Nunca imprime la URL ni la llave: solo si la base es local o cuál es su inicio.
import { CLAVES_FILA } from "../src/engine/vivienda-nueva/filas.ts";

const args = process.argv.slice(2);
const opcion = (nombre) => {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
};
const espera = opcion("--espera");
if (!["ausente", "vacia", "publicada"].includes(espera ?? "")) {
  console.error(
    "Uso: humo-anonimo.mjs --espera ausente|vacia|publicada [--hoy AAAA-MM-DD]",
  );
  process.exit(2);
}
const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const llave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
if (!base || !llave) {
  console.error(
    "✗ faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno",
  );
  process.exit(2);
}
const local = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base);
console.log(
  `Base: ${local ? "LOCAL" : `NUBE (${new URL(base).host.slice(0, 4)}…)`} · esperado: ${espera}`,
);

const hoy =
  opcion("--hoy") ??
  new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);

async function pedir(ruta, { metodo = "GET", cuerpo } = {}) {
  const r = await fetch(`${base}/rest/v1/${ruta}`, {
    method: metodo,
    headers: {
      apikey: llave,
      authorization: `Bearer ${llave}`,
      "content-type": "application/json",
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  let json = null;
  try {
    json = await r.json();
  } catch {
    // sin cuerpo
  }
  return { estado: r.status, json };
}
const rpc = (nombre, cuerpo) =>
  pedir(`rpc/${nombre}`, { metodo: "POST", cuerpo });

const resultados = [];
const comprobar = (que, ok, detalle = "") => {
  resultados.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${que}${detalle ? ` — ${detalle}` : ""}`);
};

const ping = await rpc("ping", {});
comprobar(
  "ping() responde (la base está viva y la llave pública funciona)",
  ping.estado === 200,
);

const lectura = await rpc("nuevos_publicados", { p_hoy: hoy });
if (espera === "ausente") {
  comprobar(
    "la migración 15 NO está: nuevos_publicados() no existe",
    lectura.estado === 404 && lectura.json?.code === "PGRST202",
    `HTTP ${lectura.estado}`,
  );
} else if (espera === "vacia") {
  comprobar(
    "ninguna edición publicada: nuevos_publicados() devuelve null",
    lectura.estado === 200 && lectura.json === null,
    `HTTP ${lectura.estado}`,
  );
} else {
  const proyectos = lectura.json?.proyectos;
  comprobar(
    "hay una edición publicada con proyectos",
    lectura.estado === 200 && Array.isArray(proyectos) && proyectos.length > 0,
    lectura.json
      ? `edición ${lectura.json.edicion?.numero}, ${proyectos?.length ?? 0} proyectos`
      : `HTTP ${lectura.estado}`,
  );
  const esperadas = [...CLAVES_FILA].sort().join(",");
  const mal = (proyectos ?? []).filter(
    (p) => Object.keys(p).sort().join(",") !== esperadas,
  );
  comprobar(
    `cada proyecto trae EXACTAMENTE las ${CLAVES_FILA.length} claves de la lista blanca`,
    Array.isArray(proyectos) && mal.length === 0,
    mal.length ? `${mal.length} proyectos con otras claves` : "",
  );
  comprobar(
    "la edición trae solo número, nombre, ventana y páginas",
    Object.keys(lectura.json?.edicion ?? {})
      .sort()
      .join(",") === "desde,hasta,nombre,numero,paginas",
  );
}

if (espera !== "ausente") {
  // Las tablas no se leen directo: sin política para el anónimo, la respuesta es vacía (o un rechazo), nunca filas.
  for (const tabla of ["ediciones", "proyectos_nuevos"]) {
    const t = await pedir(`${tabla}?select=*&limit=1`);
    comprobar(
      `el anónimo no lee la tabla ${tabla}`,
      (t.estado === 200 && Array.isArray(t.json) && t.json.length === 0) ||
        t.estado === 401 ||
        t.estado === 403,
      `HTTP ${t.estado}`,
    );
  }
  // Cargar, publicar y retirar son del servidor: el rechazo ocurre ANTES de ejecutar, así que no cambia nada.
  for (const [nombre, cuerpo] of [
    ["cargar_edicion", { p_edicion: {} }],
    ["publicar_edicion", { p_numero: 0, p_muestra: [] }],
    ["retirar_edicion", { p_numero: 0 }],
  ]) {
    const r = await rpc(nombre, cuerpo);
    comprobar(
      `el anónimo no puede ${nombre.replace("_edicion", "")} una edición`,
      r.json?.code === "42501",
      `HTTP ${r.estado}`,
    );
  }
}

const fallos = resultados.filter((ok) => !ok).length;
console.log(
  fallos === 0
    ? `\nHumo anónimo: ${resultados.length} de ${resultados.length} en verde.`
    : `\nHumo anónimo: ${fallos} fallos de ${resultados.length}.`,
);
process.exit(fallos === 0 ? 0 : 1);
