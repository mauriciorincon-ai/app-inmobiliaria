// Genera public/og-fallback.png (1200×630) — la og:image de respaldo de la ficha cuando el
// inmueble aún no tiene fotos. Marca Innmobiliaria, determinista, sin CDNs. Con Playwright.
//
// Uso: node scripts/generar-og-fallback.mjs

import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));

const html = `<!doctype html><html><body style="margin:0"><div style="width:1200px;height:630px;background:linear-gradient(135deg,#7b5dd6,#191a1d);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;color:#fff;gap:16px">
<div style="display:flex;align-items:center;gap:14px"><div style="width:56px;height:56px;background:#fff;border-radius:16px;display:grid;place-items:center"><svg viewBox="0 0 24 24" width="34" height="34" fill="none"><path d="M4 11.5 12 5l8 6.5M6 10.5V19h12v-8.5" stroke="#7b5dd6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><span style="font-size:52px;font-weight:800">Innmobiliaria</span></div>
<span style="font-size:30px;font-weight:600;opacity:.92">Vende tu casa directo, sin comisión</span>
</div></body></html>`;

const navegador = await chromium.launch();
const page = await navegador.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.screenshot({
  path: join(RAIZ, "public", "og-fallback.png"),
  clip: { x: 0, y: 0, width: 1200, height: 630 },
});
await navegador.close();
console.log("✓ public/og-fallback.png (1200×630)");
