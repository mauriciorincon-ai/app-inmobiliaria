import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Escaneo axe (WCAG 2.x A/AA) de todas las rutas nuevas + los 3 pasos del wizard.

const rutas = ["/", "/privacidad", "/confirmacion", "/operador/login"];

for (const ruta of rutas) {
  test(`axe sin violaciones en ${ruta}`, async ({ page }) => {
    await page.goto(ruta);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(violations).toEqual([]);
  });
}

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
  await page.getByLabel("Barrio o zona").fill("Cedritos");
  await page.getByLabel("Área (m²)").fill("78");
  await page.getByLabel("Habitaciones").fill("3");
  await page.getByLabel("Precio esperado (COP)").fill("420000000");
  await page.getByRole("button", { name: "Continuar" }).click();
  expect(await escanear()).toEqual([]);
});
