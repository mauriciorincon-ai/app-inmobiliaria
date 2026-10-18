// Reproduce la métrica `resource-summary.script.size` de Lighthouse: suma el `encodedDataLength`
// (bytes de transferencia, exactamente lo que Lighthouse mide) de TODOS los recursos JS cargados
// al abrir la página en frío — incluye chunks precargados por prefetch de rutas. Vía CDP con el
// Chromium de Playwright. Uso: node scripts/medir-script-size.mjs [baseUrl] [ruta...]
// S6: mide con el viewport MÓVIL de Lighthouse (412×823), que es el que juzga el presupuesto. En
// escritorio el mapa de /buscar carga su chunk (≈ 270 KB comprimido, a demanda): `ESCRITORIO=1` lo mide.
import { chromium } from "@playwright/test";

const BASE = process.argv[2] || "http://localhost:3111";
const RUTAS = process.argv.slice(3);
const rutas = RUTAS.length ? RUTAS : ["/", "/publicar", "/privacidad", "/confirmacion"];
const BUDGET = 350 * 1024;

const browser = await chromium.launch();
let algunoOver = false;
for (const ruta of rutas) {
  const context = await browser.newContext(
    process.env.ESCRITORIO === "1"
      ? { viewport: { width: 1280, height: 800 } }
      : { viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true },
  );
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send("Network.enable");
  const scripts = new Map(); // requestId -> {url, bytes}
  const tipoPorReq = new Map();
  client.on("Network.responseReceived", (e) => {
    if (e.type === "Script" || /javascript/.test(e.response.mimeType)) {
      tipoPorReq.set(e.requestId, e.response.url);
    }
  });
  client.on("Network.loadingFinished", (e) => {
    if (tipoPorReq.has(e.requestId)) {
      scripts.set(e.requestId, { url: tipoPorReq.get(e.requestId), bytes: e.encodedDataLength });
    }
  });
  await page.goto(BASE + ruta, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500); // margen para prefetch de rutas enlazadas
  let total = 0;
  for (const { bytes } of scripts.values()) total += bytes;
  const over = total > BUDGET;
  if (over) algunoOver = true;
  console.log(
    ruta.padEnd(14) + "  " + total.toString().padStart(7) + " B  (" +
    (total / 1024).toFixed(1) + " KB)  " + scripts.size + " scripts  " +
    (over ? "✘ OVER (budget 358400)" : "✔ ok"),
  );
  await context.close();
}
await browser.close();
process.exit(algunoOver ? 1 : 0);
