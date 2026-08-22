// Siembra fotos DEMO en el inmueble `demo-apartamento-chapinero` y las deja servidas desde
// public/demo-fotos/, para que las capturas del brochure muestren la ficha COMPLETA.
//
// Las imágenes son ILUSTRACIONES planas generadas aquí mismo (no fotos de un inmueble real): son
// datos sintéticos por construcción, y se ven como lo que son. Ley 1581 y regla del portafolio.
//
// Uso (con Supabase local arriba y .env.development.local cargado):
//   NEXT_PUBLIC_R2_PUBLIC_URL=http://localhost:3111/demo-fotos node scripts/seed-demo-fotos.mjs

import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("[seed-demo-fotos] Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const DESTINO = join(process.cwd(), "public", "demo-fotos");
mkdirSync(DESTINO, { recursive: true });

// Tres ambientes, en la paleta de la marca. Cada uno es una ilustración plana y legible.
const AMBIENTES = [
  {
    archivo: "sala.png",
    titulo: "Sala",
    fondo: "#e7eefb",
    piezas: `
      <rect x="60" y="300" width="360" height="110" rx="18" fill="#7b5dd6"/>
      <rect x="90" y="262" width="110" height="60" rx="14" fill="#bda1f2"/>
      <rect x="230" y="262" width="110" height="60" rx="14" fill="#bda1f2"/>
      <rect x="470" y="330" width="150" height="80" rx="12" fill="#cdbaf2"/>
      <circle cx="545" cy="250" r="42" fill="#ffd23f" opacity="0.7"/>
      <rect x="40" y="120" width="180" height="120" rx="10" fill="#fff" opacity="0.75"/>
    `,
  },
  {
    archivo: "cocina.png",
    titulo: "Cocina",
    fondo: "#e6f4ee",
    piezas: `
      <rect x="50" y="250" width="540" height="34" rx="8" fill="#191a1d" opacity="0.82"/>
      <rect x="50" y="284" width="250" height="130" rx="8" fill="#fff"/>
      <rect x="320" y="284" width="270" height="130" rx="8" fill="#fff"/>
      <rect x="80" y="120" width="200" height="90" rx="8" fill="#cdbaf2"/>
      <circle cx="430" cy="230" r="16" fill="#7b5dd6"/>
      <rect x="500" y="120" width="90" height="110" rx="10" fill="#bda1f2"/>
    `,
  },
  {
    archivo: "alcoba.png",
    titulo: "Alcoba",
    fondo: "#e8dcff",
    piezas: `
      <rect x="120" y="280" width="400" height="130" rx="16" fill="#fff"/>
      <rect x="150" y="240" width="150" height="60" rx="14" fill="#7b5dd6"/>
      <rect x="330" y="240" width="150" height="60" rx="14" fill="#7b5dd6"/>
      <rect x="60" y="330" width="60" height="80" rx="10" fill="#bda1f2"/>
      <circle cx="520" cy="160" r="34" fill="#ffd23f" opacity="0.65"/>
    `,
  },
];

function svgHtml(a) {
  return `<!doctype html><html><body style="margin:0">
  <svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <rect width="640" height="480" fill="${a.fondo}"/>
    ${a.piezas}
    <text x="32" y="450" font-family="system-ui,sans-serif" font-size="22" font-weight="700" fill="#191a1d" opacity="0.5">${a.titulo} · imagen de demostración</text>
  </svg></body></html>`;
}

const navegador = await chromium.launch();
const page = await navegador.newPage({ viewport: { width: 640, height: 480 } });
for (const a of AMBIENTES) {
  await page.setContent(svgHtml(a));
  await page.screenshot({ path: join(DESTINO, a.archivo) });
}
await navegador.close();

console.log("ilustraciones →", DESTINO);

// ─── Sembrar las filas de fotos en el inmueble demo ──────────────────────────────────────
const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: inmueble, error: e1 } = await db
  .from("inmuebles")
  .select("id")
  .eq("slug", "demo-apartamento-chapinero")
  .single();

if (e1 || !inmueble) {
  console.error("[seed-demo-fotos] No existe el inmueble demo. Corre antes scripts/seed-demo.mjs");
  process.exit(1);
}

await db.from("fotos").delete().eq("inmueble_id", inmueble.id);
const filas = AMBIENTES.map((a, i) => ({
  inmueble_id: inmueble.id,
  r2_key: a.archivo,
  orden: i,
  ancho: 640,
  alto: 480,
  bytes: 40000,
  es_portada: i === 0,
}));
const { error: e2 } = await db.from("fotos").insert(filas);
if (e2) {
  console.error("[seed-demo-fotos] Error insertando fotos:", e2.message);
  process.exit(1);
}

// Descripción y contacto público, para que la ficha se vea completa.
await db
  .from("inmuebles")
  .update({
    descripcion:
      "Apartamento luminoso en Chapinero Alto, con vista abierta y muy buena distribución. Cocina remodelada, tres habitaciones amplias y dos baños. Cerca del transporte y de zonas verdes. Datos de demostración.",
    contacto_publico: true,
  })
  .eq("id", inmueble.id);

console.log("fotos sembradas:", filas.length, "· descripción y contacto público listos");
