import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { consultar } from "./utils/bd";

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
  // Sin opt-in: sin contacto. Y nunca hay claves de email/matrícula.
  expect(ficha.whatsapp).toBeNull();
  expect(ficha.contacto_publico).toBe(false);
  expect("email" in ficha).toBe(false);
  expect("matricula" in ficha).toBe(false);
});

test("con opt-in aparece el whatsapp, pero la matrícula sigue oculta", async () => {
  const { supabase, reg } = await crearInmueble();
  await supabase.rpc("guardar_contacto_publico", {
    p_token: reg.token,
    p_activo: true,
  });
  const { data } = await supabase.rpc("obtener_ficha", { p_slug: reg.slug });
  const ficha = data as unknown as Record<string, unknown>;
  expect(ficha.whatsapp).toBe("+573001234567");
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
