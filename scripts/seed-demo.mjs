// Siembra (idempotente) un inmueble DEMO con slug fijo `demo-apartamento-chapinero`, SIN fotos,
// para que Lighthouse audite la ficha /i/[slug] (estado con SVG sin-fotos, LCP real y estático).
// Datos 100% sintéticos (jamás PII real). Para CI y local.
//
// Requiere env: SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY.
// Uso: node scripts/seed-demo.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SLUG = "demo-apartamento-chapinero";

if (!url || !serviceKey) {
  console.error("[seed-demo] Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ¿Ya existe? (el seed corre en cada arranque de CI).
const { data: existente } = await db
  .from("inmuebles")
  .select("id")
  .eq("slug", SLUG)
  .maybeSingle();

if (existente) {
  console.log(`[seed-demo] La ficha demo ya existía (${SLUG}).`);
  process.exit(0);
}

const { data: vendedor, error: errV } = await db
  .from("vendedores")
  .insert({
    nombre: "Demo Innmobiliaria",
    whatsapp: "+573001112233",
    email: null,
    ciudad: "Bogotá",
    zona: null,
    consentimiento_at: new Date().toISOString(),
  })
  .select("id")
  .single();

if (errV) {
  console.error(`[seed-demo] No se pudo crear el vendedor demo: ${errV.message}`);
  process.exit(1);
}

const { error: errI } = await db.from("inmuebles").insert({
  vendedor_id: vendedor.id,
  operacion: "venta",
  tipo: "apartamento",
  barrio: "Chapinero",
  direccion_aproximada: null,
  area_m2: 75,
  habitaciones: 2,
  precio_esperado: 400000000,
  slug: SLUG,
  descripcion:
    "Apartamento de demostración para auditar la ficha pública. Datos sintéticos.",
});

if (errI) {
  console.error(`[seed-demo] No se pudo crear el inmueble demo: ${errI.message}`);
  process.exit(1);
}

console.log(`[seed-demo] Ficha demo creada (${SLUG}).`);
