// Captura las pantallas REALES de la app para la sección «Así se ve» del brochure, y las deja
// como data: URIs (WebP) listas para pegar en el HTML autocontenido.
//
// Por qué existe: la primera versión del brochure dibujaba mockups a mano que NO se parecían a la
// app. Además de desperdiciar espacio, contradice la regla «solo lo real». Esto fotografía la app
// de verdad, corriendo, con DATOS 100% SINTÉTICOS.
//
// Requiere: Supabase local arriba + `.env.development.local` cargado + el servidor en marcha con
// NEXT_PUBLIC_R2_PUBLIC_URL apuntando a /demo-fotos (para que la ficha muestre sus fotos demo).
//
// Uso: node scripts/capturar-pantallas-reales.mjs [baseUrl]
// El segundo idioma (S16, regla 20): `IDIOMA=en node scripts/capturar-pantallas-reales.mjs [baseUrl]` fotografía las mismas pantallas
// con la app en inglés (cookie `idioma` + locale del navegador) y las deja en `/tmp/pantallas-reales-en`. El brochure es un
// documento en español y solo inyecta las de `/tmp/pantallas-reales`; las del inglés sirven para revisar la maquetación.

import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] || "http://localhost:3111";
const EN = process.env.IDIOMA === "en";
const SALIDA = EN ? "/tmp/pantallas-reales-en" : "/tmp/pantallas-reales";
// Las etiquetas de los campos, tal como las dice el diccionario {es, en} (`src/textos/publicar.ts`, `operador.ts`).
const T = EN
  ? {
      nombre: "What's your name", whatsapp: "Your WhatsApp number", ciudad: "city is your property in",
      continuar: "Continue", venta: "Sale", tipo: "Property type", localidad: "Locality",
      barrio: "Neighborhood", area: "Area (m²)", habitaciones: "Bedrooms", precio: "Expected price",
      publicar: /List my property/i, correo: "Email", clave: "Password", entrar: "Sign in",
    }
  : {
      nombre: "Cómo te llamas", whatsapp: "Tu WhatsApp", ciudad: "ciudad está tu inmueble",
      continuar: "Continuar", venta: "Venta", tipo: "Tipo de inmueble", localidad: "Localidad",
      barrio: "Barrio", area: "Área (m²)", habitaciones: "Habitaciones", precio: "Precio esperado (COP)",
      publicar: /Publicar mi inmueble/i, correo: "Correo", clave: "Contraseña", entrar: "Entrar",
    };
mkdirSync(SALIDA, { recursive: true });

// Ancho de captura: el teléfono real del vendedor bogotano (el brochure es móvil-primero).
const ANCHO = 390;

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: ANCHO, height: 780 },
  deviceScaleFactor: 2, // nítido en pantallas densas
  locale: EN ? "en-US" : "es-CO",
});
if (EN) await contexto.addCookies([{ name: "idioma", value: "en", url: BASE }]);
const page = await contexto.newPage();

const capturas = [];

async function tomar(nombre, clip) {
  const ruta = join(SALIDA, `${nombre}.png`);
  await page.screenshot({ path: ruta, ...(clip ? { clip } : {}) });
  capturas.push(nombre);
  console.log("✓", nombre);
}

// ─── 1. El registro, paso 2 (el formulario de verdad) ────────────────────────────────────
await page.goto(`${BASE}/publicar`);
await page.getByLabel(T.nombre).fill("Ana Fundadora");
await page.getByLabel(T.whatsapp).fill("300 123 4567");
await page.getByLabel(T.ciudad).fill("Bogotá");
await page.getByRole("button", { name: T.continuar }).click();
await page.getByRole("radio", { name: T.venta }).check({ force: true });
await page.getByLabel(T.tipo).selectOption("apartamento");
await page.getByLabel(T.localidad).selectOption("Chapinero");
// Desde el S6 el barrio es una lista del catálogo de Catastro, no un campo de texto: se elige el primero de la localidad.
await page.getByLabel(T.barrio).selectOption({ index: 1 });
await page.waitForTimeout(700);
await tomar("wizard");

// ─── 2. Mi anuncio: el medidor de completitud ────────────────────────────────────────────
// Se registra de verdad por la UI para obtener el enlace privado.
await page.goto(`${BASE}/publicar`);
await page.getByLabel(T.nombre).fill("Ana Fundadora");
await page.getByLabel(T.whatsapp).fill("300 123 4567");
await page.getByLabel(T.ciudad).fill("Bogotá");
await page.getByRole("button", { name: T.continuar }).click();
await page.getByRole("radio", { name: T.venta }).check({ force: true });
await page.getByLabel(T.tipo).selectOption("apartamento");
await page.getByLabel(T.localidad).selectOption("Chapinero");
// Desde el S6 el barrio es una lista del catálogo de Catastro, no un campo de texto: se elige el primero de la localidad.
await page.getByLabel(T.barrio).selectOption({ index: 1 });
await page.getByLabel(T.area).fill("78");
await page.getByLabel(T.habitaciones).fill("3");
await page.getByLabel(T.precio).fill("420000000");
await page.getByRole("button", { name: T.continuar }).click();
await page.getByRole("checkbox").check();
await page.getByRole("button", { name: T.publicar }).click();
await page.waitForURL(/\/confirmacion/, { timeout: 15000 });

const enlace = await page.evaluate(() => sessionStorage.getItem("publicar.link.v1"));
if (enlace) {
  await page.goto(enlace.replace(/^https?:\/\/[^/]+/, BASE));
  await page.waitForTimeout(1200);
  await tomar("mi-anuncio");
} else {
  console.log("⚠ sin enlace privado en sessionStorage — se omite mi-anuncio");
}

// ─── 3. La ficha pública ─────────────────────────────────────────────────────────────────
await page.goto(`${BASE}/i/demo-apartamento-chapinero`);
await page.waitForTimeout(1200);
await tomar("ficha");

// ─── 4. El panel de campaña (embudo real) ────────────────────────────────────────────────
await page.goto(`${BASE}/operador/login`);
await page.getByLabel(T.correo).fill(process.env.OPERADOR_EMAIL ?? "operador@innmobiliaria.test");
await page.getByLabel(T.clave).fill(process.env.OPERADOR_PASSWORD ?? "operador-seguro-123");
await page.getByRole("button", { name: T.entrar }).click();
await page.waitForTimeout(1500);
await page.goto(`${BASE}/operador/campana`);
await page.waitForTimeout(1200);
await tomar("panel");

// ─── Convertir a WebP y volcar como data: URIs ───────────────────────────────────────────
// La conversión la hace el propio Chromium con canvas.toDataURL('image/webp'): cero
// dependencias nuevas (sharp es transitivo y pnpm no lo eleva, así que no es importable).
const conv = await contexto.newPage();
const salida = {};
for (const nombre of capturas) {
  const png = readFileSync(join(SALIDA, `${nombre}.png`)).toString("base64");
  const uri = await conv.evaluate(
    async ({ png, ancho }) => {
      const img = new Image();
      img.src = "data:image/png;base64," + png;
      await img.decode();
      const escala = Math.min(1, ancho / img.width);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL("image/webp", 0.72);
    },
    { png, ancho: 720 },
  );
  salida[nombre] = uri;
  console.log(`  ${nombre}: ${(uri.length / 1024).toFixed(1)} KB`);
}
await navegador.close();

writeFileSync(join(SALIDA, "pantallas.json"), JSON.stringify(salida, null, 2));
const total = Object.values(salida).reduce((n, s) => n + s.length, 0);
console.log(`\n→ ${SALIDA}/pantallas.json — ${(total / 1024).toFixed(1)} KB en data: URIs`);
