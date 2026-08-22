import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { registrar, entrarOperador } from "./utils/registrar";

// Escaneo axe (WCAG 2.x A/AA) de todas las rutas nuevas + los 3 pasos del wizard.

// /mi-anuncio sin token muestra el estado "necesitas tu enlace" (estático, auditable).
const rutas = [
  "/",
  "/privacidad",
  "/confirmacion",
  "/operador/login",
  "/mi-anuncio",
];

for (const ruta of rutas) {
  test(`axe sin violaciones en ${ruta}`, async ({ page }) => {
    await page.goto(ruta);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(violations).toEqual([]);
  });
}

test("axe sin violaciones en la ficha pública /i/[slug]", async ({ page }) => {
  const { barrio } = await registrar(page, { barrioBase: "Kennedy" });
  await entrarOperador(page);
  const fila = page.getByRole("row").filter({ hasText: barrio });
  await fila.getByRole("link", { name: /Ver ficha/i }).click();
  await expect(page).toHaveURL(/\/i\//);
  // Se llega por navegación cliente (Link) → en `next dev` el <title> del generateMetadata se aplica
  // con retraso. Esperarlo antes de axe evita un falso `document-title` (en prod/SSR ya viene servido).
  await expect(page).toHaveTitle(/Innmobiliaria/i);
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations).toEqual([]);
});

test("axe sin violaciones en cada paso de /publicar", async ({ page }) => {
  const escanear = async () =>
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()
    ).violations;

  await page.goto("/publicar");
  expect(await escanear()).toEqual([]);

  await page.getByLabel("Cómo te llamas").fill("Ana");
  await page.getByLabel("Tu WhatsApp").fill("300 123 4567");
  await page.getByLabel("ciudad está tu inmueble").fill("Bogotá");
  await page.getByRole("button", { name: "Continuar" }).click();
  expect(await escanear()).toEqual([]);

  await page.getByRole("radio", { name: "Venta" }).check({ force: true });
  await page.getByLabel("Tipo de inmueble").selectOption("apartamento");
  await page.getByLabel("Localidad").selectOption("Chapinero");
  await page.getByLabel("Barrio").fill("Cedritos");
  await page.getByLabel("Área (m²)").fill("78");
  await page.getByLabel("Habitaciones").fill("3");
  await page.getByLabel("Precio esperado (COP)").fill("420000000");
  await page.getByRole("button", { name: "Continuar" }).click();
  expect(await escanear()).toEqual([]);
});
