// Siembra (idempotente) cuatro inmuebles DEMO con slug fijo, SIN fotos, para que Lighthouse audite la
// ficha /i/[slug] (estado con SVG sin-fotos, LCP real y estático) y la búsqueda /buscar con una lista
// que no está vacía. Cada uno usa un barrio del catálogo catastral (S6): el trigger les asigna su sector.
// Cubre los tres estados del sello: fundador · verificado (con fecha de CTL) · re-verificación pendiente.
// Datos 100% sintéticos (jamás PII real). Para CI y local.
//
// Requiere env: SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY.
// Uso: node scripts/seed-demo.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("[seed-demo] Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const hoy = new Date();
const fechaHace = (dias) =>
  new Date(hoy.getTime() - dias * 86_400_000).toISOString().slice(0, 10);

// La ficha que audita Lighthouse es la primera (slug fijo desde el S2).
const DEMOS = [
  {
    slug: "demo-apartamento-chapinero",
    localidad: "Chapinero",
    barrio: "Los Rosales",
    tipo: "apartamento",
    operacion: "venta",
    area_m2: 75,
    habitaciones: 2,
    precio_esperado: 400_000_000,
    sello: "fundador",
  },
  {
    slug: "demo-apartamento-chico",
    localidad: "Chapinero",
    barrio: "Chicó Norte",
    tipo: "apartamento",
    operacion: "venta",
    area_m2: 118,
    habitaciones: 3,
    precio_esperado: 950_000_000,
    sello: "verificado",
  },
  {
    slug: "demo-casa-usaquen",
    localidad: "Usaquén",
    barrio: "Usaquén",
    tipo: "casa",
    operacion: "venta",
    area_m2: 160,
    habitaciones: 4,
    precio_esperado: 1_200_000_000,
    sello: "pendiente",
  },
  {
    slug: "demo-apartaestudio-teusaquillo",
    localidad: "Teusaquillo",
    barrio: "La Soledad",
    tipo: "apartaestudio",
    operacion: "arriendo",
    area_m2: 38,
    habitaciones: 1,
    precio_esperado: 2_400_000,
    sello: "fundador",
  },
];

const { data: zonas, error: errZ } = await db.from("zonas").select("id,nombre");
if (errZ) {
  console.error(`[seed-demo] No se pudieron leer las zonas: ${errZ.message}`);
  process.exit(1);
}

for (const d of DEMOS) {
  const { data: existente } = await db
    .from("inmuebles")
    .select("id")
    .eq("slug", d.slug)
    .maybeSingle();
  if (existente) {
    console.log(`[seed-demo] Ya existía (${d.slug}).`);
    continue;
  }

  const { data: vendedor, error: errV } = await db
    .from("vendedores")
    .insert({
      nombre: "Demo Innmobiliaria",
      whatsapp: "+573001112233",
      email: null,
      ciudad: "Bogotá",
      zona: d.localidad,
      consentimiento_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (errV) {
    console.error(
      `[seed-demo] No se pudo crear el vendedor demo: ${errV.message}`,
    );
    process.exit(1);
  }

  const verificado = d.sello !== "fundador";
  const { error: errI } = await db.from("inmuebles").insert({
    vendedor_id: vendedor.id,
    operacion: d.operacion,
    tipo: d.tipo,
    barrio: d.barrio,
    direccion_aproximada: null,
    area_m2: d.area_m2,
    habitaciones: d.habitaciones,
    precio_esperado: d.precio_esperado,
    slug: d.slug,
    zona_id: zonas.find((z) => z.nombre === d.localidad)?.id ?? null,
    descripcion:
      "Anuncio de demostración para auditar la ficha pública y la búsqueda. Datos sintéticos.",
    ...(verificado && {
      nivel_verificacion: "verificado",
      matricula: "50N-DEMO-0001",
      verificado_at: new Date().toISOString(),
      // «pendiente» = verificado ANTES de que existiera la fecha del CTL (sin fecha).
      ...(d.sello === "verificado" && { ctl_expedido_el: fechaHace(3) }),
    }),
  });
  if (errI) {
    console.error(`[seed-demo] No se pudo crear ${d.slug}: ${errI.message}`);
    process.exit(1);
  }
  console.log(`[seed-demo] Creado (${d.slug}).`);
}
