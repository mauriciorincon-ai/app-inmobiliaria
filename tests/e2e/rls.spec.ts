import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

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

test("las RPC del operador rechazan al anónimo", async () => {
  const { supabase, reg } = await crearInmueble();
  const r1 = await supabase.rpc("marcar_verificado", {
    p_inmueble_id: reg.id,
    p_matricula: "50N-1",
  });
  expect(r1.error).not.toBeNull();
  const r2 = await supabase.rpc("generar_link_anuncio", {
    p_inmueble_id: reg.id,
  });
  expect(r2.error).not.toBeNull();
});
