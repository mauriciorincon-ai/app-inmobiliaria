// Capturas por bloque del brochure para la revisión visual (gate de la entrega).
// Uso: node scripts/capturar-brochure.mjs [baseUrl] [ancho] [carpeta]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:3111";
const ANCHO = Number(process.argv[3] || 390);
const DIR = process.argv[4] || "/tmp/brochure-shots";
mkdirSync(DIR, { recursive: true });

const BLOQUES = [
  { id: null, nombre: "01-portada" },
  { id: "#viaje", nombre: "02-viaje" },
  { id: "#que-hace", nombre: "03-puertas" },
  { id: "#asi-se-ve", nombre: "04-muestras" },
  { id: "#paquete", nombre: "05-paquete" },
  { id: "#verdad", nombre: "06-climax" },
  { id: "#lo-fino", nombre: "07-fino" },
  { id: "footer.cierre", nombre: "08-cierre" },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: ANCHO, height: 800 } });
await page.goto(BASE + "/conoce", { waitUntil: "networkidle" });
await page.waitForTimeout(900);

for (const b of BLOQUES) {
  if (b.id) {
    const el = page.locator(b.id).first();
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200); // deja correr la coreografía de entrada
    await el.screenshot({ path: `${DIR}/${b.nombre}.png` });
  } else {
    await page.screenshot({ path: `${DIR}/${b.nombre}.png` });
  }
  console.log("✓", b.nombre);
}

// Una tarjeta abierta (demuestra el disclosure)
await page.locator("#que-hace .tarjeta").first().scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.locator("#que-hace .tarjeta").first().screenshot({ path: `${DIR}/09-tarjeta-abierta.png` });
console.log("✓ 09-tarjeta-abierta");

await browser.close();
console.log("→", DIR);
