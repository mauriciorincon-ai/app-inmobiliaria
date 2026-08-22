import { test, expect } from "@playwright/test";

// Validación por campo, persistencia del borrador y manejo de error de red con reintento.

test("muestra errores por campo y no avanza con el paso 1 vacío", async ({
  page,
}) => {
  await page.goto("/publicar");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByText("Escribe tu nombre")).toBeVisible();
  await expect(page.getByText("Escribe tu WhatsApp")).toBeVisible();
  // Sigue en el paso 1.
  await expect(page.getByText("Paso 1 de 3")).toBeVisible();
});

test("rechaza un WhatsApp inválido", async ({ page }) => {
  await page.goto("/publicar");
  await page.getByLabel("Cómo te llamas").fill("Ana");
  await page.getByLabel("Tu WhatsApp").fill("123");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("celular colombiano válido")).toBeVisible();
});

test("conserva el borrador tras recargar", async ({ page }) => {
  await page.goto("/publicar");
  await page.getByLabel("Cómo te llamas").fill("Ana Persistente");
  // Deja que el estado se serialice a localStorage.
  await expect(page.getByLabel("Cómo te llamas")).toHaveValue(
    "Ana Persistente",
  );

  await page.reload();
  await expect(page.getByLabel("Cómo te llamas")).toHaveValue(
    "Ana Persistente",
  );
});

test("ante un error de red muestra aviso y permite reintentar", async ({
  page,
}) => {
  await page.goto("/publicar");
  await page.getByLabel("Cómo te llamas").fill("Ana Reintento");
  await page.getByLabel("Tu WhatsApp").fill("300 123 4567");
  await page.getByLabel("ciudad está tu inmueble").fill("Bogotá");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("radio", { name: "Venta" }).check({ force: true });
  await page.getByLabel("Tipo de inmueble").selectOption("casa");
  await page.getByLabel("Localidad").selectOption("Chapinero");
  await page.getByLabel("Barrio").fill(`Chapinero ${Date.now()}`);
  await page.getByLabel("Área (m²)").fill("120");
  await page.getByLabel("Habitaciones").fill("4");
  await page.getByLabel("Precio esperado (COP)").fill("650000000");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("checkbox").check();

  // Primera vez: cae la red.
  await page.route("**/api/registro", (route) => route.abort());
  await page.getByRole("button", { name: "Publicar mi inmueble" }).click();
  await expect(
    page.getByText(/problema de conexión|No pudimos registrar/),
  ).toBeVisible();

  // Reintento con la red restablecida → éxito.
  await page.unroute("**/api/registro");
  await page.getByRole("button", { name: "Publicar mi inmueble" }).click();
  await expect(page).toHaveURL(/\/confirmacion$/);
});
