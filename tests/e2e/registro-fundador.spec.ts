import { test, expect } from "@playwright/test";

// Happy path COMPLETO por la UI (lección habla S2: el e2e entra por la interfaz, no por URL):
// landing → CTA → 3 pasos → confirmación → login del operador → el registro aparece en el panel.
// Datos 100% sintéticos (PII jamás en tests).

const EMAIL = process.env.OPERADOR_EMAIL ?? "operador@innmobiliaria.test";
const PASSWORD = process.env.OPERADOR_PASSWORD ?? "operador-seguro-123";

test("un vendedor se registra y el operador lo ve en el panel", async ({
  page,
}) => {
  const barrioUnico = `Cedritos ${Date.now()}`;

  // Landing → flujo de publicar.
  await page.goto("/");
  await page
    .getByRole("link", { name: "Publica tu inmueble como fundador" })
    .first()
    .click();
  await expect(page).toHaveURL(/\/publicar$/);

  // Paso 1 — contacto.
  await page.getByLabel("Cómo te llamas").fill("Ana Fundadora");
  await page.getByLabel("Tu WhatsApp").fill("300 123 4567");
  await page.getByLabel("ciudad está tu inmueble").fill("Bogotá");
  await page.getByRole("button", { name: "Continuar" }).click();

  // Paso 2 — inmueble.
  await page.getByRole("radio", { name: "Venta" }).check({ force: true });
  await page.getByLabel("Tipo de inmueble").selectOption("apartamento");
  await page.getByLabel("Localidad").selectOption("Chapinero");
  await page.getByLabel("Barrio").fill(barrioUnico);
  await page.getByLabel("Área (m²)").fill("78");
  await page.getByLabel("Habitaciones").fill("3");
  await page.getByLabel("Precio esperado (COP)").fill("420000000");
  await page.getByRole("button", { name: "Continuar" }).click();

  // Paso 3 — consentimiento + envío.
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Publicar mi inmueble" }).click();

  // Confirmación. Se apunta al h1 con getByRole (no getByText, que hace substring y puede matchear
  // más de un nodo durante la transición cliente de `next dev`).
  await expect(page).toHaveURL(/\/confirmacion$/);
  await expect(
    page.getByRole("heading", { name: /registrado como fundador/i }),
  ).toBeVisible();

  // El operador entra y ve el registro.
  await page.goto("/operador/login");
  await page.getByLabel("Correo").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/operador$/);

  // Anclado a LA fila de este registro (el barrio es único por corrida; el nombre no: los dos
  // proyectos de Playwright insertan cada uno el suyo y ambos aparecen en el panel).
  const fila = page.getByRole("row").filter({ hasText: barrioUnico });
  await expect(fila).toBeVisible({ timeout: 10000 });
  await expect(fila.getByText("Ana Fundadora")).toBeVisible();
});
