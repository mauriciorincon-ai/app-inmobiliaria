import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Page } from "@playwright/test";

const AQUI = dirname(fileURLToPath(import.meta.url));
const FOTO_WEBP = readFileSync(
  join(
    AQUI,
    "..",
    "..",
    "..",
    "docs",
    "kit-de-prueba",
    "fotos",
    "valida-1600x1200.jpg",
  ),
);

// Intercepta R2 en e2e: no hay bucket real. El PUT presigned se responde 200 (y se registra para
// aserciones tipo "no se subió nada"); los GET a la URL pública devuelven una imagen real para
// que la galería/score rendericen de verdad. Todo lo demás (gate, compresión, presign, RPCs) es
// real contra Postgres.
export async function interceptarR2(page: Page): Promise<{ puts: string[] }> {
  const puts: string[] = [];

  await page.route(/.*\.r2\.cloudflarestorage\.com\/.*/, async (route) => {
    if (route.request().method() === "PUT") {
      puts.push(route.request().url());
      await route.fulfill({ status: 200, body: "" });
      return;
    }
    await route.fulfill({ status: 200, body: "" });
  });

  // URL pública del bucket (r2.dev) — configurada como dummy en CI.
  const base =
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "https://pub-e2e-dummy.r2.dev";
  await page.route(`${base}/**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/webp",
      body: FOTO_WEBP,
    });
  });

  return { puts };
}
