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
