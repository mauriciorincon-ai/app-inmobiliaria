// Siembra (idempotente) cuatro inmuebles DEMO con slug fijo, SIN fotos, para que Lighthouse audite la
// ficha /i/[slug] (estado con SVG sin-fotos, LCP real y estático) y la búsqueda /buscar con una lista
// que no está vacía. Cada uno usa un barrio del catálogo catastral (S6): el trigger les asigna su sector.
// Cubre los tres estados del sello: fundador · verificado (con fecha de CTL) · re-verificación pendiente.
// Datos 100% sintéticos (jamás PII real). Para CI y local.
//
// Requiere env: SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY.
// Uso: node scripts/seed-demo.mjs
//
// También siembra la edición SINTÉTICA de vivienda nueva (S12, nº 9000, nombres ficticios) para que Lighthouse audite
// `/buscar?v=nuevos` y `/nuevos/<slug>`. Solo contra una base LOCAL: el script entero se niega a escribir en la nube.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("[seed-demo] Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Son datos de demostración (CI y local): contra una base que no es local no se siembra NADA. `.env.local` apunta a la nube y un
// `source` descuidado habría dejado cuatro anuncios de mentira en producción.
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
  console.error(
    "[seed-demo] La base no es local: no se siembra ningún dato de demostración.",
  );
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

// ── La edición SINTÉTICA de vivienda nueva (S12) ───────────────────────────────────────────────
// Número 9000, nombres ficticios, ventana relativa a HOY (empezó hace 10 días y vence en 10), así que siempre está vigente.
// Idempotente: se retira, se vuelve a cargar y se publica con su muestra (la misma regla que la edición real).
{
  const demo = JSON.parse(
    readFileSync(new URL("./seed-demo-edicion.json", import.meta.url), "utf8"),
  );
  const NUMERO = 9000;
  const muestra = demo.proyectos.slice(0, 5).map((p) => p.clave);
  const edicion = {
    numero: NUMERO,
    nombre: demo.nombre,
    desde: fechaHace(10),
    hasta: new Date(hoy.getTime() + 10 * 86_400_000).toISOString().slice(0, 10),
    paginas: demo.paginas,
    muestra_claves: muestra,
    muestra_semilla: NUMERO,
    proyectos: demo.proyectos,
  };
  await db.rpc("retirar_edicion", { p_numero: NUMERO });
  const { error: errC } = await db.rpc("cargar_edicion", {
    p_edicion: edicion,
  });
  if (errC) {
    console.error(
      `[seed-demo] No se pudo cargar la edición ${NUMERO}: ${errC.message}`,
    );
    process.exit(1);
  }
  const { error: errP } = await db.rpc("publicar_edicion", {
    p_numero: NUMERO,
    p_muestra: muestra,
  });
  if (errP) {
    console.error(
      `[seed-demo] No se pudo publicar la edición ${NUMERO}: ${errP.message}`,
    );
    process.exit(1);
  }
  console.log(
    `[seed-demo] Edición ${NUMERO} (vivienda nueva) publicada: ${demo.proyectos.length} proyectos.`,
  );
}
