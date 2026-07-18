// Genera las imágenes de prueba en docs/kit-de-prueba/fotos/ — doble propósito: fixtures del e2e
// y kit de prueba de la guía v2. Deterministas, sin PII, con Playwright (ya instalado). Una
// válida (1600×1200, pasa el gate) y una de baja resolución (320×240, la rechaza).
//
// Uso: node scripts/generar-fotos-prueba.mjs

import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const DESTINO = join(RAIZ, "docs", "kit-de-prueba", "fotos");

const IMAGENES = [
  { archivo: "valida-1600x1200.jpg", ancho: 1600, alto: 1200, color: "#7b5dd6", etiqueta: "Foto válida 1600×1200" },
  { archivo: "baja-resolucion-320x240.jpg", ancho: 320, alto: 240, color: "#e8dcff", etiqueta: "Baja resolución 320×240" },
];

function html(color, etiqueta, ancho, alto) {
  return `<!doctype html><html><body style="margin:0"><div style="width:${ancho}px;height:${alto}px;background:linear-gradient(135deg,${color},#191a1d);display:flex;align-items:center;justify-content:center;font-family:sans-serif;color:#fff;font-size:${Math.round(ancho / 20)}px;font-weight:800">${etiqueta}</div></body></html>`;
}

const navegador = await chromium.launch();
await mkdir(DESTINO, { recursive: true });
for (const img of IMAGENES) {
  const page = await navegador.newPage({
    viewport: { width: img.ancho, height: img.alto },
  });
  await page.setContent(html(img.color, img.etiqueta, img.ancho, img.alto));
  await page.screenshot({
    path: join(DESTINO, img.archivo),
    type: "jpeg",
    quality: 90,
    clip: { x: 0, y: 0, width: img.ancho, height: img.alto },
  });
  await page.close();
  console.log(`✓ ${img.archivo} (${img.ancho}×${img.alto})`);
}
await navegador.close();
