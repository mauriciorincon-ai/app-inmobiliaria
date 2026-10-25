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
//
//   --salas ausente|presente (S13; por omisión «presente» salvo con `--espera ausente`): la migración 16. «ausente» exige que
//   la visita a la sala y los usados para comparar NO existan; «presente» exige que existan, que el anónimo no lea ninguna
//   sala, que las RPC del operador le estén cerradas y que pedir una visita con una sesión falsa se rechace.
//   --antifraude ausente|presente (S15; mismo default que --salas): la migración 17. «presente» exige que el anónimo no lea
//   reportes, banderas ni sesiones, que las RPC del operador le estén cerradas, que reportar con una sesión falsa y lo del
//   dueño con un token falso se rechacen, y que la búsqueda y la ficha reescritas con la pausa sigan respondiendo.
// Sale con código 1 si algo no es lo esperado. Nunca imprime la URL ni la llave: solo si la base es local o cuál es su inicio.
import { CLAVES_FILA } from "../src/engine/vivienda-nueva/filas.ts";

const args = process.argv.slice(2);
const opcion = (nombre) => {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
};
const espera = opcion("--espera");
const salas =
  opcion("--salas") ?? (espera === "ausente" ? "ausente" : "presente");
const antifraude =
  opcion("--antifraude") ?? (espera === "ausente" ? "ausente" : "presente");
if (!["ausente", "presente"].includes(antifraude)) {
  console.error("Uso: --antifraude ausente|presente");
  process.exit(2);
}
if (!["ausente", "presente"].includes(salas)) {
  console.error("Uso: --salas ausente|presente");
  process.exit(2);
}
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

// ── S13 (migración 16): la visita a la sala de ventas y los usados para comparar ──────────────────────────────────────
if (salas === "ausente") {
  for (const [nombre, cuerpo] of [
    [
      "solicitar_visita_sala",
      {
        p_sesion_hash: "0",
        p_slug: "x",
        p_franja: "sabado",
        p_email: "a@b.co",
      },
    ],
    ["usados_para_comparar", { p_operacion: "venta", p_tipo: "apartamento" }],
  ]) {
    const r = await rpc(nombre, cuerpo);
    comprobar(
      `la migración 16 NO está: ${nombre}() no existe`,
      r.estado === 404 && r.json?.code === "PGRST202",
      `HTTP ${r.estado}`,
    );
  }
} else {
  const t = await pedir("salas_ventas?select=*&limit=1");
  comprobar(
    "el anónimo no lee la tabla salas_ventas",
    (t.estado === 200 && Array.isArray(t.json) && t.json.length === 0) ||
      t.estado === 401 ||
      t.estado === 403,
    `HTTP ${t.estado}`,
  );
  // Las RPC del operador: el rechazo ocurre ANTES de ejecutar (sin el permiso), así que no cambia nada.
  const UUID_NULO = "00000000-0000-0000-0000-000000000000";
  for (const [nombre, cuerpo] of [
    ["salas_panel", {}],
    ["guardar_sala", { p_slug: "x", p_telefono: null, p_direccion: null }],
    ["proponer_horarios_sala", { p_solicitud_id: UUID_NULO, p_horarios: [] }],
    ["rechazar_solicitud_sala", { p_solicitud_id: UUID_NULO }],
    ["cancelar_visita_sala", { p_solicitud_id: UUID_NULO }],
    ["reclamar_sin_respuesta_salas", { p_antes_de: "2000-01-01T00:00:00Z" }],
  ]) {
    const r = await rpc(nombre, cuerpo);
    comprobar(
      `el anónimo no puede ejecutar ${nombre}`,
      r.json?.code === "42501",
      `HTTP ${r.estado}`,
    );
  }
  // Pedir una visita con una sesión que no existe se rechaza en la primera comprobación, antes de escribir nada.
  const pedirVisita = await rpc("solicitar_visita_sala", {
    p_sesion_hash: "0".repeat(64),
    p_slug: "proyecto-que-no-existe",
    p_franja: "sabado",
    p_email: "humo@ejemplo.test",
  });
  comprobar(
    "pedir una visita a una sala con una sesión falsa se rechaza (exige el WhatsApp verificado)",
    pedirVisita.json?.code === "42501" &&
      String(pedirVisita.json?.message ?? "").includes("no_verificado"),
    `HTTP ${pedirVisita.estado}`,
  );
  const usados = await rpc("usados_para_comparar", {
    p_operacion: "venta",
    p_tipo: "apartamento",
  });
  comprobar(
    "usados_para_comparar devuelve solo área y precio",
    usados.estado === 200 &&
      Array.isArray(usados.json) &&
      usados.json.every(
        (u) => Object.keys(u).sort().join(",") === "area_m2,precio_esperado",
      ),
    Array.isArray(usados.json)
      ? `${usados.json.length} anuncios`
      : `HTTP ${usados.estado}`,
  );
}

// ── S15 (migración 17): reportar, las reglas antifraude, la pausa y la sesión de fotos ───────────────────────────────
if (antifraude === "ausente") {
  const r = await rpc("reportar_anuncio", {
    p_sesion_hash: "0",
    p_slug: "x",
    p_motivos: [],
    p_detalle: null,
  });
  comprobar(
    "la migración 17 NO está: reportar_anuncio() no existe",
    r.estado === 404 && r.json?.code === "PGRST202",
    `HTTP ${r.estado}`,
  );
} else {
  for (const tabla of ["reportes", "banderas", "sesiones_fotos"]) {
    const t = await pedir(`${tabla}?select=*&limit=1`);
    comprobar(
      `el anónimo no lee la tabla ${tabla}`,
      (t.estado === 200 && Array.isArray(t.json) && t.json.length === 0) ||
        t.estado === 401 ||
        t.estado === 403,
      `HTTP ${t.estado}`,
    );
  }
  // Las RPC del operador y las dos internas: el rechazo ocurre ANTES de ejecutar (sin el permiso), así que no cambia nada.
  const UUID_NULO = "00000000-0000-0000-0000-000000000000";
  for (const [nombre, cuerpo] of [
    ["antifraude_cola", {}],
    ["pausar_anuncio", { p_inmueble_id: UUID_NULO }],
    ["reactivar_anuncio", { p_inmueble_id: UUID_NULO }],
    ["pedir_ctl", { p_inmueble_id: UUID_NULO }],
    [
      "descartar_revision",
      { p_inmueble_id: UUID_NULO, p_razon: "x", p_nota: null },
    ],
    ["revisar_banderas", {}],
    ["anuncios_para_precio", {}],
    ["guardar_banderas_precio", { p_hallazgos: "x" }],
    ["fotos_sin_huella", { p_limite: 0 }],
    ["registrar_huella_operador", { p_foto_id: UUID_NULO, p_huella: "x" }],
    ["sesiones_panel", {}],
    [
      "agendar_sesion_fotos",
      { p_sesion_id: UUID_NULO, p_para: "2000-01-01T00:00:00Z" },
    ],
    ["marcar_sesion_hecha", { p_sesion_id: UUID_NULO }],
    ["cancelar_sesion_fotos_operador", { p_sesion_id: UUID_NULO }],
    ["aplicar_banderas", { p_regla: "x", p_hallazgos: "x" }],
    [
      "resolver_revision",
      {
        p_inmueble_id: UUID_NULO,
        p_resolucion: "x",
        p_razon: null,
        p_nota: null,
      },
    ],
  ]) {
    const r = await rpc(nombre, cuerpo);
    comprobar(
      `el anónimo no puede ejecutar ${nombre}`,
      r.json?.code === "42501",
      `HTTP ${r.estado}`,
    );
  }
  // Reportar con una sesión que no existe se rechaza en la primera comprobación, antes de escribir nada.
  const reportar = await rpc("reportar_anuncio", {
    p_sesion_hash: "0".repeat(64),
    p_slug: "anuncio-que-no-existe",
    p_motivos: ["otra_cosa"],
    p_detalle: null,
  });
  comprobar(
    "reportar un anuncio con una sesión falsa se rechaza (exige el WhatsApp verificado)",
    reportar.json?.code === "42501" &&
      String(reportar.json?.message ?? "").includes("no_verificado"),
    `HTTP ${reportar.estado}`,
  );
  // Lo del dueño exige el token de «Mi anuncio»: con uno falso, nada se lee ni se escribe.
  const TOKEN_FALSO = "x".repeat(43);
  for (const [nombre, cuerpo] of [
    [
      "registrar_huella_foto",
      { p_token: TOKEN_FALSO, p_foto_id: UUID_NULO, p_huella: "0".repeat(16) },
    ],
    ["solicitar_sesion_fotos", { p_token: TOKEN_FALSO, p_franja: "sabado" }],
    ["cancelar_sesion_fotos", { p_token: TOKEN_FALSO }],
  ]) {
    const r = await rpc(nombre, cuerpo);
    comprobar(
      `${nombre} con un token falso se rechaza`,
      String(r.json?.message ?? "").includes("token_invalido"),
      `HTTP ${r.estado}`,
    );
  }
  const extra = await rpc("mi_anuncio_extra", { p_token: TOKEN_FALSO });
  comprobar(
    "mi_anuncio_extra con un token falso no devuelve nada",
    extra.estado === 200 && extra.json === null,
    `HTTP ${extra.estado}`,
  );
  // Las funciones reescritas con la pausa siguen respondiendo al anónimo.
  const busqueda = await rpc("buscar_inmuebles", {
    p_operacion: null,
    p_tipo: null,
    p_localidad: null,
    p_precio_min: null,
    p_precio_max: null,
    p_habitaciones_min: null,
    p_poligono: null,
    p_limite: 1,
  });
  comprobar(
    "buscar_inmuebles (sobre inmuebles_que_cumplen, reescrita con la pausa) responde",
    busqueda.estado === 200 && Array.isArray(busqueda.json),
    `HTTP ${busqueda.estado}`,
  );
  const ficha = await rpc("obtener_ficha", { p_slug: "anuncio-que-no-existe" });
  comprobar(
    "obtener_ficha (reescrita con la pausa) responde null a un anuncio que no existe",
    ficha.estado === 200 && ficha.json === null,
    `HTTP ${ficha.estado}`,
  );
}

const fallos = resultados.filter((ok) => !ok).length;
console.log(
  fallos === 0
    ? `\nHumo anónimo: ${resultados.length} de ${resultados.length} en verde.`
    : `\nHumo anónimo: ${fallos} fallos de ${resultados.length}.`,
);
process.exit(fallos === 0 ? 0 : 1);
