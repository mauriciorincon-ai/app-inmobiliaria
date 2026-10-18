import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { consultar, ejecutar } from "./utils/bd";
import { canjear, hashDe, pedirCodigo, sesionNueva } from "./utils/comprador";

// Pruebas NEGATIVAS de RLS con el anon key real contra el stack local: el anónimo solo puede
// ejecutar la RPC; jamás leer ni escribir directo. Datos 100% sintéticos.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function argsValidos(overrides: Record<string, unknown> = {}) {
  return {
    p_nombre: "Ana Sintetica",
    p_whatsapp: "+573001234567",
    p_email: null,
    p_ciudad: "Bogotá",
    p_zona: null,
    p_operacion: "venta",
    p_tipo: "apartamento",
    p_barrio: "Zona RLS",
    p_direccion: null,
    p_area: 78,
    p_habitaciones: 3,
    p_precio: 420000000,
    p_consentimiento: true,
    p_ip_hash: `rls-${Date.now()}-${Math.floor(performance.now())}`,
    ...overrides,
  };
}

test("la RPC crea el registro pero el anónimo NO puede leerlo", async () => {
  const supabase = createClient(url, anon);

  const { data: id, error } = await supabase.rpc(
    "registrar_fundador",
    argsValidos(),
  );
  expect(error).toBeNull();
  expect(id).toBeTruthy();

  // Con RLS y sin política de SELECT para anon, las tablas devuelven cero filas.
  const { data: vendedores } = await supabase.from("vendedores").select("*");
  expect(vendedores ?? []).toHaveLength(0);
  const { data: inmuebles } = await supabase.from("inmuebles").select("*");
  expect(inmuebles ?? []).toHaveLength(0);
});

test("el anónimo NO puede INSERT directo en las tablas", async () => {
  const supabase = createClient(url, anon);
  const { error } = await supabase.from("vendedores").insert({
    nombre: "Intruso",
    whatsapp: "+573009999999",
    ciudad: "Bogotá",
    consentimiento_at: new Date().toISOString(),
  });
  expect(error).not.toBeNull();
});

test("la RPC rechaza el registro sin consentimiento", async () => {
  const supabase = createClient(url, anon);
  const { error } = await supabase.rpc(
    "registrar_fundador",
    argsValidos({ p_consentimiento: false }),
  );
  expect(error).not.toBeNull();
});

test("la RPC aplica rate limit por IP (3/hora)", async () => {
  const supabase = createClient(url, anon);
  const ip = `ratelimit-${Date.now()}`;
  // Las 3 primeras del mismo ip_hash pasan.
  for (let i = 0; i < 3; i++) {
    const { error } = await supabase.rpc(
      "registrar_fundador",
      argsValidos({ p_ip_hash: ip }),
    );
    expect(error).toBeNull();
  }
  // La 4ª supera el límite y es rechazada.
  const { error } = await supabase.rpc(
    "registrar_fundador",
    argsValidos({ p_ip_hash: ip }),
  );
  expect(error).not.toBeNull();
});

// ── S2: superficie de la ficha pública y de las RPC del operador ──────────────

type RegistroResult = { id: string; slug: string; token: string };

async function crearInmueble() {
  const supabase = createClient(url, anon);
  const { data } = await supabase.rpc("registrar_fundador", argsValidos());
  return { supabase, reg: data as unknown as RegistroResult };
}

test("obtener_ficha NUNCA expone whatsapp/email/matricula sin opt-in", async () => {
  const { supabase, reg } = await crearInmueble();
  const { data } = await supabase.rpc("obtener_ficha", { p_slug: reg.slug });
  const ficha = data as unknown as Record<string, unknown>;
  expect(ficha).toBeTruthy();
  expect(ficha.barrio).toBe("Zona RLS");
  // Sin opt-in: sin contacto. Y nunca hay claves de whatsapp/email/matrícula (S7: ni siquiera con opt-in).
  expect("whatsapp" in ficha).toBe(false);
  expect(ficha.contacto_publico).toBe(false);
  expect("email" in ficha).toBe(false);
  expect("matricula" in ficha).toBe(false);
});

test("con opt-in la ficha marca contacto_publico, pero JAMÁS trae el whatsapp; la matrícula sigue oculta", async () => {
  const { supabase, reg } = await crearInmueble();
  await supabase.rpc("guardar_contacto_publico", {
    p_token: reg.token,
    p_activo: true,
  });
  const { data } = await supabase.rpc("obtener_ficha", { p_slug: reg.slug });
  const ficha = data as unknown as Record<string, unknown>;
  expect(ficha.contacto_publico).toBe(true);
  // S7: el número solo sale por `registrar_contacto`, hacia una sesión de comprador verificada.
  expect("whatsapp" in ficha).toBe(false);
  expect(JSON.stringify(ficha)).not.toContain("+573001234567");
  expect("matricula" in ficha).toBe(false);
});

test("un token inválido no devuelve anuncio", async () => {
  const supabase = createClient(url, anon);
  const { data } = await supabase.rpc("obtener_mi_anuncio", {
    p_token: "token_falso_que_no_existe_en_la_base_de_dat",
  });
  expect(data).toBeNull();
});

test("el anónimo NO puede leer la tabla fotos directamente", async () => {
  const supabase = createClient(url, anon);
  const { data } = await supabase.from("fotos").select("*");
  expect(data ?? []).toHaveLength(0);
});

// Lista cerrada: toda RPC del operador, de cron o interna debe ser inalcanzable para el anónimo.
// Se exige el CÓDIGO de error (42501 = permission denied), no solo «hubo error»: una función que SÍ
// se ejecuta y falla por dentro («inmueble_no_encontrado») también devuelve error y daría un falso
// verde. Origen (S4): la imagen más reciente de Postgres le dejó a `anon` EXECUTE sobre estas
// funciones por los privilegios por defecto; la migración 4 deja la lista blanca explícita.
const ID_FALSO = "00000000-0000-4000-8000-000000000000";
const CERRADAS: Array<[string, Record<string, unknown>]> = [
  ["marcar_verificado", { p_inmueble_id: ID_FALSO, p_matricula: "50N-1" }],
  ["generar_link_anuncio", { p_inmueble_id: ID_FALSO }],
  ["generar_slug", { p_tipo: "apartamento", p_barrio: "Zona RLS" }],
  ["fijar_cupo", { p_zona_id: ID_FALSO, p_cupo: 1 }],
  ["obtener_zonas_panel", {}],
  ["obtener_densidad", {}],
  ["obtener_lote", { p_filtro: "sin-fotos" }],
  [
    "registrar_envio",
    {
      p_plantilla: "x",
      p_filtro: "sin-fotos",
      p_destinatarios: 0,
      p_enviados: 0,
      p_estado: "mock",
    },
  ],
  ["marcar_vencidos", {}],
  [
    "marcar_verificado_ctl",
    {
      p_inmueble_id: ID_FALSO,
      p_matricula: "50N-1",
      p_ctl_expedido_el: "2026-10-01",
    },
  ],
  // S7: solo el webhook (service_role) canjea un código.
  [
    "canjear_codigo_whatsapp",
    { p_codigo_hash: "0".repeat(64), p_telefono: "+573001234567" },
  ],
];

for (const [nombre, args] of CERRADAS) {
  test(`la RPC ${nombre} está cerrada para el anónimo (42501)`, async () => {
    const supabase = createClient(url, anon);
    const { error } = await supabase.rpc(nombre, args);
    expect(error?.code, error?.message).toBe("42501");
  });
}

test("las RPC del operador rechazan al anónimo", async () => {
  const { supabase, reg } = await crearInmueble();
  const r1 = await supabase.rpc("marcar_verificado", {
    p_inmueble_id: reg.id,
    p_matricula: "50N-1",
  });
  // 42501 = permission denied: con un inmueble REAL, una función abierta no fallaría por dentro.
  expect(r1.error?.code, r1.error?.message).toBe("42501");
  const r2 = await supabase.rpc("generar_link_anuncio", {
    p_inmueble_id: reg.id,
  });
  expect(r2.error?.code, r2.error?.message).toBe("42501");
});

// ── S5: idioma del vendedor ───────────────────────────────────────────────────
// La columna `vendedores.idioma` se llena al publicar con el idioma activo; la leen el lote de correo
// y el panel. Anon no la puede leer (RLS): se comprueba por el catálogo de la base local.

function nombreUnico(base: string) {
  return `${base} ${Date.now()}-${Math.floor(performance.now())}`;
}

function idiomaGuardado(nombre: string): string[] {
  return consultar(
    `select idioma from public.vendedores where nombre = '${nombre}'`,
  );
}

test("registrar_fundador guarda el idioma 'en'", async () => {
  const supabase = createClient(url, anon);
  const nombre = nombreUnico("Idioma EN");
  const { error } = await supabase.rpc(
    "registrar_fundador",
    argsValidos({ p_nombre: nombre, p_idioma: "en" }),
  );
  expect(error).toBeNull();
  expect(idiomaGuardado(nombre)).toEqual(["en"]);
});

test("registrar_fundador sin idioma lo deja en 'es' (compatible con el Worker anterior)", async () => {
  const supabase = createClient(url, anon);
  const nombre = nombreUnico("Idioma ES");
  const { error } = await supabase.rpc(
    "registrar_fundador",
    argsValidos({ p_nombre: nombre }),
  );
  expect(error).toBeNull();
  expect(idiomaGuardado(nombre)).toEqual(["es"]);
});

test("registrar_fundador rechaza un idioma que no es es/en", async () => {
  const supabase = createClient(url, anon);
  const nombre = nombreUnico("Idioma FR");
  const { error } = await supabase.rpc(
    "registrar_fundador",
    argsValidos({ p_nombre: nombre, p_idioma: "fr" }),
  );
  // check_violation (23514): el registro NO se crea.
  expect(error?.code, error?.message).toBe("23514");
  expect(error?.message).toContain("idioma_invalido");
  expect(idiomaGuardado(nombre)).toEqual([]);
});

// ── S6: búsqueda pública, barrio del catálogo y fecha del CTL ─────────────────
// Datos 100 % sintéticos. La BD local se comparte entre specs: cada prueba ancla por el slug que ella
// misma creó, nunca por conteos globales.

const RAIZ_BOGOTA = "((-74.06,4.65),(-74.04,4.65),(-74.04,4.67),(-74.06,4.67))"; // contiene Los Rosales
const OTRA_ZONA = "((-74.12,4.72),(-74.10,4.72),(-74.10,4.74),(-74.12,4.74))"; // Suba: sin Los Rosales
const CAMPOS_PUBLICOS = [
  "area_m2",
  "barrio",
  "ctl_expedido_el",
  "habitaciones",
  "localidad",
  "nivel_verificacion",
  "operacion",
  "portada",
  "precio_esperado",
  "sector_codigo",
  "slug",
  "tipo",
  "vigente_hasta",
];

type Fila = Record<string, unknown> & { slug: string };

async function registrarEn(
  barrio: string,
  extra: Record<string, unknown> = {},
) {
  const supabase = createClient(url, anon);
  const { data, error } = await supabase.rpc(
    "registrar_fundador",
    argsValidos({ p_zona: "Chapinero", p_barrio: barrio, ...extra }),
  );
  expect(error).toBeNull();
  return { supabase, reg: data as unknown as RegistroResult };
}

async function buscar(args: Record<string, unknown> = {}) {
  const supabase = createClient(url, anon);
  const { data, error } = await supabase.rpc("buscar_inmuebles", args);
  return { filas: (data ?? []) as unknown as Fila[], error };
}

test("buscar_inmuebles devuelve SOLO la lista blanca: jamás la dirección ni al vendedor", async () => {
  const direccion = nombreUnico("Direccion Sintetica");
  const vendedor = nombreUnico("Vendedor Sintetico");
  const { reg } = await registrarEn("Los Rosales", {
    p_direccion: direccion,
    p_nombre: vendedor,
    p_email: "vendedor.sintetico@ejemplo.test",
  });
  const { filas, error } = await buscar({ p_localidad: "Chapinero" });
  expect(error).toBeNull();
  const fila = filas.find((f) => f.slug === reg.slug);
  expect(fila).toBeDefined();
  expect(Object.keys(fila!).sort()).toEqual(CAMPOS_PUBLICOS);
  const crudo = JSON.stringify(filas);
  for (const prohibido of [
    direccion,
    vendedor,
    "+573001234567",
    "vendedor.sintetico@ejemplo.test",
    "direccion_aproximada",
    "edit_token",
    "matricula",
  ]) {
    expect(crudo, prohibido).not.toContain(prohibido);
  }
});

test("un barrio del catálogo se ubica solo: el trigger fija sector_codigo sin tildes ni mayúsculas", async () => {
  const { reg } = await registrarEn("LOS ROSALES");
  expect(
    consultar(
      `select sector_codigo from public.inmuebles where slug = '${reg.slug}'`,
    ),
  ).toEqual(["008304"]);
  // El mismo nombre en OTRA localidad no casa (el nombre solo identifica dentro de su localidad).
  const otra = await registrarEn("Los Rosales", { p_zona: "Suba" });
  expect(
    consultar(
      `select coalesce(sector_codigo, 'null') from public.inmuebles where slug = '${otra.reg.slug}'`,
    ),
  ).toEqual(["null"]);
});

test("la zona dibujada incluye el anuncio si contiene el centroide de su barrio, y no si no", async () => {
  const { reg } = await registrarEn("Los Rosales");
  const dentro = await buscar({ p_poligono: RAIZ_BOGOTA });
  expect(dentro.error).toBeNull();
  expect(dentro.filas.map((f) => f.slug)).toContain(reg.slug);
  const fuera = await buscar({ p_poligono: OTRA_ZONA });
  expect(fuera.filas.map((f) => f.slug)).not.toContain(reg.slug);
});

test("un barrio que no es del catálogo aparece por filtro pero no por zona (no se inventa un punto)", async () => {
  const { reg } = await registrarEn(nombreUnico("Barrio Libre"));
  const porFiltro = await buscar({ p_localidad: "Chapinero" });
  expect(porFiltro.filas.map((f) => f.slug)).toContain(reg.slug);
  const porZona = await buscar({ p_poligono: RAIZ_BOGOTA });
  expect(porZona.filas.map((f) => f.slug)).not.toContain(reg.slug);
});

test("los filtros recortan: precio, habitaciones, tipo y operación", async () => {
  const { reg } = await registrarEn("Los Rosales"); // venta · apartamento · 3 hab · $420 M
  const aparece = async (args: Record<string, unknown>) =>
    (await buscar(args)).filas.map((f) => f.slug).includes(reg.slug);
  expect(
    await aparece({ p_precio_min: 400000000, p_precio_max: 450000000 }),
  ).toBe(true);
  expect(await aparece({ p_precio_max: 100000000 })).toBe(false);
  expect(await aparece({ p_precio_min: 500000000 })).toBe(false);
  expect(await aparece({ p_habitaciones_min: 3 })).toBe(true);
  expect(await aparece({ p_habitaciones_min: 4 })).toBe(false);
  expect(await aparece({ p_tipo: "casa" })).toBe(false);
  expect(await aparece({ p_operacion: "arriendo" })).toBe(false);
  expect(await aparece({ p_operacion: "venta", p_tipo: "apartamento" })).toBe(
    true,
  );
});

test("un anuncio vencido desaparece de la búsqueda al instante", async () => {
  const { reg } = await registrarEn("Los Rosales");
  expect(
    (await buscar({ p_localidad: "Chapinero" })).filas.map((f) => f.slug),
  ).toContain(reg.slug);
  consultar(
    `update public.inmuebles set vigente_hasta = now() - interval '1 day' where slug = '${reg.slug}'`,
  );
  expect(
    (await buscar({ p_localidad: "Chapinero" })).filas.map((f) => f.slug),
  ).not.toContain(reg.slug);
});

test("un polígono malformado, de 2 o de 101 vértices se rechaza (check_violation)", async () => {
  const demasiados = `(${Array.from({ length: 101 }, (_, i) => `(${-74.1 + i * 0.0001},${4.6 + (i % 2) * 0.01})`).join(",")})`;
  for (const malo of [
    "no es un poligono",
    "((-74.06,4.65),(-74.04,4.65))",
    demasiados,
  ]) {
    const { error } = await buscar({ p_poligono: malo });
    expect(error?.code, malo.slice(0, 30)).toBe("23514");
    expect(error?.message).toContain("poligono_invalido");
  }
});

test("la búsqueda respeta el tope de resultados", async () => {
  const { filas } = await buscar({ p_limite: 1 });
  expect(filas.length).toBeLessThanOrEqual(1);
  const sinTope = await buscar({ p_limite: 100000 });
  expect(sinTope.filas.length).toBeLessThanOrEqual(60);
});

function ctlSql(id: string, diasAtras: number) {
  return `select public.marcar_verificado_ctl('${id}', '50N-12345', (now() at time zone 'America/Bogota')::date - ${diasAtras})`;
}

test("marcar_verificado_ctl: 30 días pasa y guarda la fecha; 31 días y fechas futuras fallan", async () => {
  const { reg } = await registrarEn("Los Rosales");
  expect(() => ejecutar(ctlSql(reg.id, 31))).toThrow(/ctl_fuera_de_plazo/);
  expect(() => ejecutar(ctlSql(reg.id, -1))).toThrow(/ctl_fuera_de_plazo/);
  // Los dos rechazos no cambiaron nada.
  expect(
    consultar(
      `select nivel_verificacion || '|' || coalesce(ctl_expedido_el::text, 'null') from public.inmuebles where id = '${reg.id}'`,
    ),
  ).toEqual(["fundador|null"]);
  ejecutar(ctlSql(reg.id, 30));
  const [fila] = consultar(
    `select nivel_verificacion || '|' || (ctl_expedido_el = (now() at time zone 'America/Bogota')::date - 30)::text || '|' || matricula from public.inmuebles where id = '${reg.id}'`,
  );
  expect(fila).toBe("verificado|true|50N-12345");
  // La ficha pública ya muestra la fecha del CTL y la vigencia, y sigue sin matrícula.
  const { data } = await createClient(url, anon).rpc("obtener_ficha", {
    p_slug: reg.slug,
  });
  const ficha = data as unknown as Record<string, unknown>;
  expect(ficha.ctl_expedido_el).toBeTruthy();
  expect(ficha.vigente_hasta).toBeTruthy();
  expect(ficha.sector_codigo).toBe("008304");
  expect(ficha.localidad).toBe("Chapinero");
  expect("matricula" in ficha).toBe(false);
});

test("la fecha del CTL solo existe en un anuncio verificado (restricción de la tabla)", async () => {
  const { reg } = await registrarEn("Los Rosales");
  expect(() =>
    ejecutar(
      `update public.inmuebles set ctl_expedido_el = current_date where id = '${reg.id}'`,
    ),
  ).toThrow(/inmuebles_ctl_requiere_verificado/);
});

test("el lote «re-verificar» trae al verificado sin fecha de CTL y lo suelta al registrarla", async () => {
  const { reg } = await registrarEn("Los Rosales", {
    p_email: "reverificar.sintetico@ejemplo.test",
  });
  const enLote = () =>
    consultar(`select public.obtener_lote('re-verificar')::text`)[0].includes(
      reg.id,
    );
  expect(enLote()).toBe(false); // fundador: todavía no está verificado
  ejecutar(`select public.marcar_verificado('${reg.id}', '50N-99999')`); // verificación SIN fecha (la de antes)
  expect(enLote()).toBe(true);
  ejecutar(ctlSql(reg.id, 5));
  expect(enLote()).toBe(false);
});

test("public.clave_barrio de la BD quita tildes y eñes como lo hace el motor", async () => {
  expect(
    consultar(`select public.clave_barrio('  Cañada Núñez - Chicó (2) ')`),
  ).toEqual(["canada nunez chico 2"]);
});

test("el anónimo NO puede leer la tabla sectores (solo el operador)", async () => {
  const { data } = await createClient(url, anon).from("sectores").select("*");
  expect(data ?? []).toHaveLength(0);
});

// ── S7: comprador verificado por mensaje entrante y sello cerrado ─────────────
// Datos 100 % sintéticos. El canje lo hace el webhook con la llave del servidor; aquí se llama como
// `postgres` (el rol que el webhook usaría vía service_role) para probar la RPC sin servidor web.

const ALFABETO_CODIGO = /^INN-[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{6}$/;
const TEL_COMPRADOR = "+573115550101";
const TEL_OTRO = "+573115550202";

test("el anónimo NO lee ni escribe compradores, verificaciones ni contactos", async () => {
  const supabase = createClient(url, anon);
  for (const tabla of ["compradores", "verificaciones", "contactos"] as const) {
    const { data } = await supabase.from(tabla).select("*");
    expect(data ?? [], tabla).toHaveLength(0);
  }
  const { error } = await supabase.from("compradores").insert({
    telefono: TEL_COMPRADOR,
    nombre: "Intruso",
    consentimiento_at: new Date().toISOString(),
  });
  expect(error).not.toBeNull();
});

test("iniciar_verificacion devuelve un código INN-XXXXXX y la base guarda SOLO su hash", async () => {
  const sesion = sesionNueva();
  const { codigo, error } = await pedirCodigo(sesion);
  expect(error).toBeNull();
  expect(codigo).toMatch(ALFABETO_CODIGO);
  expect(
    consultar(
      `select count(*) from public.verificaciones where codigo_hash = '${hashDe(codigo)}'`,
    ),
  ).toEqual(["1"]);
  // El código en claro no está en ninguna fila de ninguna de las tablas nuevas.
  for (const tabla of ["verificaciones", "compradores", "contactos"]) {
    expect(
      consultar(
        `select count(*) from public.${tabla} t where t::text like '%${codigo}%'`,
      ),
      tabla,
    ).toEqual(["0"]);
  }
});

test("entradas inválidas no crean nada: teléfono, nombre, idioma, sesión y consentimiento por RPC", async () => {
  for (const malo of [
    { p_telefono: "+14155550123" }, // no colombiano
    { p_telefono: "3001234567" }, // sin E.164
    { p_nombre: "A" },
    { p_idioma: "fr" },
    { p_sesion_hash: "no-es-un-hash" },
    { p_ip_hash: "x" },
  ]) {
    const { error } = await pedirCodigo(sesionNueva(), malo);
    expect(error?.code, JSON.stringify(malo)).toBe("23514");
  }
});

test("estado_verificacion: sin_codigo → esperando → verificado, sin datos personales", async () => {
  const sesion = sesionNueva();
  const supabase = createClient(url, anon);
  const estado = async () =>
    (await supabase.rpc("estado_verificacion", { p_sesion_hash: sesion }))
      .data as unknown as Record<string, unknown>;
  expect(await estado()).toEqual({ estado: "sin_codigo" });
  const { codigo } = await pedirCodigo(sesion);
  const esperando = await estado();
  expect(esperando.estado).toBe("esperando");
  expect(Number(esperando.segundos)).toBeLessThanOrEqual(600);
  expect(Object.keys(esperando).sort()).toEqual(["estado", "segundos"]);
  expect(canjear(codigo, TEL_COMPRADOR)).toBe("ok");
  expect(await estado()).toEqual({ estado: "verificado", identificado: false });
});

test("el código es de UN solo uso", async () => {
  const { codigo } = await pedirCodigo(sesionNueva());
  expect(canjear(codigo, TEL_COMPRADOR)).toBe("ok");
  expect(canjear(codigo, TEL_COMPRADOR)).toBe("nada");
});

test("un código que llega de OTRO número no verifica y se quema", async () => {
  const sesion = sesionNueva();
  const supabase = createClient(url, anon);
  const { codigo } = await pedirCodigo(sesion);
  expect(canjear(codigo, TEL_OTRO)).toBe("otro_numero");
  // Ni siquiera el dueño legítimo del número puede usarlo ya.
  expect(canjear(codigo, TEL_COMPRADOR)).toBe("nada");
  const { data } = await supabase.rpc("estado_verificacion", {
    p_sesion_hash: sesion,
  });
  expect(data).toEqual({ estado: "otro_numero" });
});

test("un código vencido no canjea y el estado lo dice", async () => {
  const sesion = sesionNueva();
  const supabase = createClient(url, anon);
  const { codigo } = await pedirCodigo(sesion);
  ejecutar(
    `update public.verificaciones set vence_at = now() - interval '1 minute' where codigo_hash = '${hashDe(codigo)}'`,
  );
  expect(canjear(codigo, TEL_COMPRADOR)).toBe("nada");
  const { data } = await supabase.rpc("estado_verificacion", {
    p_sesion_hash: sesion,
  });
  expect(data).toEqual({ estado: "vencido" });
});

test("pedir un código nuevo vence el anterior de la sesión", async () => {
  const sesion = sesionNueva();
  const { codigo: primero } = await pedirCodigo(sesion);
  const { codigo: segundo } = await pedirCodigo(sesion);
  expect(segundo).not.toBe(primero);
  expect(canjear(primero, TEL_COMPRADOR)).toBe("nada");
  expect(canjear(segundo, TEL_COMPRADOR)).toBe("ok");
});

test("tope de códigos: el sexto en una hora para la misma sesión se rechaza", async () => {
  const sesion = sesionNueva();
  for (let i = 0; i < 5; i++) {
    const { error } = await pedirCodigo(sesion, {
      p_ip_hash: `tope-${sesion.slice(0, 8)}-${i}`,
    });
    expect(error).toBeNull();
  }
  const { error } = await pedirCodigo(sesion, {
    p_ip_hash: `tope-${sesion.slice(0, 8)}-x`,
  });
  expect(error?.code).toBe("23514");
  expect(error?.message).toContain("demasiados_intentos");
});

test("registrar_contacto: sin sesión verificada no entrega el número ni registra nada", async () => {
  const { reg } = await crearInmueble();
  const supabase = createClient(url, anon);
  await supabase.rpc("guardar_contacto_publico", {
    p_token: reg.token,
    p_activo: true,
  });
  const sesion = sesionNueva();
  // Sin código, y con código sin canjear: null en los dos casos.
  const sinCodigo = await supabase.rpc("registrar_contacto", {
    p_sesion_hash: sesion,
    p_slug: reg.slug,
  });
  expect(sinCodigo.data).toBeNull();
  await pedirCodigo(sesion);
  const pendiente = await supabase.rpc("registrar_contacto", {
    p_sesion_hash: sesion,
    p_slug: reg.slug,
  });
  expect(pendiente.data).toBeNull();
  expect(
    consultar(
      `select count(*) from public.contactos where inmueble_id = (select id from public.inmuebles where slug = '${reg.slug}')`,
    ),
  ).toEqual(["0"]);
});

test("registrar_contacto con sesión verificada entrega el WhatsApp del dueño y el dueño ve al comprador enmascarado", async () => {
  const { reg } = await crearInmueble();
  const supabase = createClient(url, anon);
  await supabase.rpc("guardar_contacto_publico", {
    p_token: reg.token,
    p_activo: true,
  });
  const sesion = sesionNueva();
  const { codigo } = await pedirCodigo(sesion);
  expect(canjear(codigo, TEL_COMPRADOR)).toBe("ok");
  const { data } = await supabase.rpc("registrar_contacto", {
    p_sesion_hash: sesion,
    p_slug: reg.slug,
  });
  expect(data).toEqual({ whatsapp: "+573001234567" });
  // Idempotente: contactar dos veces deja una sola fila.
  await supabase.rpc("registrar_contacto", {
    p_sesion_hash: sesion,
    p_slug: reg.slug,
  });
  expect(
    consultar(
      `select count(*) from public.contactos where inmueble_id = (select id from public.inmuebles where slug = '${reg.slug}')`,
    ),
  ).toEqual(["1"]);
  // El dueño (por su token) ve nombre, fin del teléfono y fecha: nunca el número completo.
  const { data: mi } = await supabase.rpc("obtener_mi_anuncio", {
    p_token: reg.token,
  });
  const anuncio = mi as unknown as {
    contactos: Array<Record<string, unknown>>;
  };
  expect(anuncio.contactos).toHaveLength(1);
  expect(anuncio.contactos[0].nombre).toBe("Laura Sintetica");
  expect(anuncio.contactos[0].telefono_fin).toBe("0101");
  expect(JSON.stringify(anuncio)).not.toContain(TEL_COMPRADOR);
});

test("registrar_contacto: un anuncio sin opt-in no entrega el número aunque la sesión esté verificada", async () => {
  const { supabase, reg } = await crearInmueble(); // contacto_publico = false
  const sesion = sesionNueva();
  const { codigo } = await pedirCodigo(sesion);
  expect(canjear(codigo, TEL_COMPRADOR)).toBe("ok");
  const { data } = await supabase.rpc("registrar_contacto", {
    p_sesion_hash: sesion,
    p_slug: reg.slug,
  });
  expect(data).toBeNull();
});

// Como `authenticated` (el operador por la API): se simula con SET LOCAL ROLE dentro de una transacción
// que se revierte. El CHECK de la fila lo pone el trigger, no la política.
function comoOperador(sql: string): string[] {
  return ejecutar(`begin; set local role authenticated; ${sql} rollback;`);
}

test("el sello no se escribe por UPDATE directo, ni siquiera siendo el operador", async () => {
  const { reg } = await registrarEn("Los Rosales");
  for (const cambio of [
    "nivel_verificacion = 'verificado'",
    "ctl_expedido_el = current_date", // la columna de la deuda del S6
    "matricula = '50N-1234567'",
    "verificado_at = now()",
  ]) {
    expect(
      () =>
        comoOperador(
          `update public.inmuebles set ${cambio} where id = '${reg.id}';`,
        ),
      cambio,
    ).toThrow(/sello_protegido/);
  }
  // Lo demás de la fila sigue siendo del operador.
  expect(() =>
    comoOperador(
      `update public.inmuebles set contacto_publico = true where id = '${reg.id}';`,
    ),
  ).not.toThrow();
});

test("marcar_verificado_ctl sigue verificando como operador; el legado marcar_verificado ya no", async () => {
  const { reg } = await registrarEn("Los Rosales");
  const salida = comoOperador(
    `select public.marcar_verificado_ctl('${reg.id}', '50N-1234567', (now() at time zone 'America/Bogota')::date - 3);
     reset role;
     select nivel_verificacion from public.inmuebles where id = '${reg.id}';`,
  );
  expect(salida).toContain("verificado");
  expect(() =>
    comoOperador(
      `select public.marcar_verificado('${reg.id}', '50N-7654321');`,
    ),
  ).toThrow(/permission denied/);
  // El legado se conserva para quien corre como `postgres` (semillas, datos de antes).
  expect(() =>
    ejecutar(`select public.marcar_verificado('${reg.id}', '50N-7654321')`),
  ).not.toThrow();
});
