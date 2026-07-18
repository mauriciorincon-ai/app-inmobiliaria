import { test, expect, type Page } from "@playwright/test";
import { join } from "node:path";
import { interceptarR2 } from "./utils/r2-mock";

// Flujo completo de "mi anuncio" POR LA UI (lección habla S2): registrar → tomar el magic link de
// la confirmación → completar el anuncio (fotos con gate real, descripción, opt-in) y ver el
// score subir en vivo. R2 se intercepta (no hay bucket en CI); el gate, la compresión, el
// presign y las RPCs son reales contra Postgres. Datos 100% sintéticos.

// Playwright transpila a CommonJS → paths desde el cwd (raíz del repo), sin import.meta.url.
const FOTOS = join(process.cwd(), "docs", "kit-de-prueba", "fotos");
const FOTO_VALIDA = join(FOTOS, "valida-1600x1200.jpg");
const FOTO_BAJA = join(FOTOS, "baja-resolucion-320x240.jpg");

async function registrarYObtenerLink(page: Page): Promise<string> {
  const barrioUnico = `Chapinero ${Date.now()}`;
  await page.goto("/publicar");
  await page.getByLabel("Cómo te llamas").fill("Sara Fundadora");
  await page.getByLabel("Tu WhatsApp").fill("300 987 6543");
  await page.getByLabel("ciudad está tu inmueble").fill("Bogotá");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("radio", { name: "Venta" }).check({ force: true });
  await page.getByLabel("Tipo de inmueble").selectOption("apartamento");
  await page.getByLabel("Barrio o zona").fill(barrioUnico);
  await page.getByLabel("Área (m²)").fill("80");
  await page.getByLabel("Habitaciones").fill("3");
  await page.getByLabel("Precio esperado (COP)").fill("450000000");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Publicar mi inmueble" }).click();
  await expect(page).toHaveURL(/\/confirmacion$/);

  // El magic link aparece en la confirmación (leído de sessionStorage por MagicLinkGuardar).
  const input = page.getByRole("textbox");
  await expect(input).toHaveValue(/\/mi-anuncio#t=/);
  return (await input.inputValue()) as string;
}

function score(page: Page) {
  return page.getByRole("progressbar");
}

test("un fundador completa su anuncio y el score sube en vivo", async ({
  page,
}) => {
  const { puts } = await interceptarR2(page);
  const link = await registrarYObtenerLink(page);

  await page.goto(link);
  // Arranca en 40% (registrado, sin fotos).
  await expect(score(page)).toHaveAttribute("aria-valuenow", "40");

  // Una foto de baja resolución se rechaza ANTES de subir: mensaje + cero PUT a R2.
  await page.locator('input[type="file"]').setInputFiles(FOTO_BAJA);
  await expect(page.getByRole("alert")).toContainText(/muy pequeña|cámara/i);
  expect(puts).toHaveLength(0);

  // Una foto válida sube y el score salta a 55%.
  await page.locator('input[type="file"]').setInputFiles(FOTO_VALIDA);
  await expect(score(page)).toHaveAttribute("aria-valuenow", "55", {
    timeout: 15000,
  });

  // La descripción sube el score (en vivo, mientras se escribe).
  await page
    .getByLabel("Descripción del inmueble")
    .fill(
      "Apartamento luminoso en excelente zona, cerca de transporte, parques y colegios. Listo para entrar a vivir.",
    );
  await expect(score(page)).toHaveAttribute("aria-valuenow", "70");
  await page.getByRole("button", { name: "Guardar" }).click();

  // El opt-in de contacto suma 10.
  await page.getByRole("checkbox").check();
  await expect(score(page)).toHaveAttribute("aria-valuenow", "80", {
    timeout: 10000,
  });

  // Elegir portada suma 5.
  await page.getByRole("button", { name: "Portada", exact: true }).click();
  await expect(score(page)).toHaveAttribute("aria-valuenow", "85", {
    timeout: 10000,
  });
});
