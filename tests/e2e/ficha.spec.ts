import { test, expect } from "@playwright/test";
import { registrar, entrarOperador } from "./utils/registrar";

// Ficha pública /i/[slug]: se llega POR LA UI (registro → panel → "Ver ficha"). Verifica el
// estado sin-fotos, el NEGATIVO de contacto (sin opt-in no hay WhatsApp), las metas OG y el
// not-found.

test("la ficha muestra el inmueble y NO expone contacto sin opt-in", async ({
  page,
}) => {
  const { barrio, nombre } = await registrar(page, {
    nombre: "Beto Ficha",
    localidad: "Suba",
    barrio: "Britalia",
  });

  // El operador abre la ficha desde el panel.
  await entrarOperador(page);
  const fila = page.getByRole("row").filter({ hasText: nombre });
  await expect(fila).toBeVisible({ timeout: 10000 });
  await fila.getByRole("link", { name: /Ver ficha/i }).click();

  // El slug sale del barrio del catálogo: `apartamento-britalia-{6hex}`.
  await expect(page).toHaveURL(/\/i\/apartamento-britalia-[0-9a-f]{6}$/);
  await expect(
    page.getByRole("heading", { name: new RegExp(`en ${barrio}`) }),
  ).toBeVisible();
  // «Vivo hace N días» (recién publicado = hoy), el sello de fundador explicado y dónde queda: el
  // barrio y la localidad del catálogo, nunca un punto ni una dirección.
  await expect(page.getByText("Vivo: el dueño lo confirmó hoy")).toBeVisible();
  await expect(
    page.getByText("Fundador: aún sin CTL verificado"),
  ).toBeVisible();
  await expect(
    page.getByText(/Britalia, Suba\. Mostramos el área del barrio/),
  ).toBeVisible();
  // Estado sin fotos (SVG del sistema).
  await expect(page.getByText(/aún no tiene fotos/i)).toBeVisible();
  // Ley 1581: sin opt-in NO aparece el WhatsApp.
  await expect(
    page.getByRole("link", { name: /Escribir por WhatsApp/i }),
  ).toHaveCount(0);
  await expect(page.getByText(/no habilitó el contacto/i)).toBeVisible();

  // OG: como no hay fotos, og:image cae al fallback estático del repo.
  const ogImage = page.locator('meta[property="og:image"]');
  await expect(ogImage).toHaveAttribute("content", /og-fallback\.png$/);
  const ogTitle = page.locator('meta[property="og:title"]');
  await expect(ogTitle).toHaveAttribute("content", new RegExp(barrio));
});

test("un slug inexistente muestra not-found", async ({ page }) => {
  await page.goto("/i/no-existe-000000");
  await expect(
    page.getByRole("heading", { name: /No encontramos este inmueble/i }),
  ).toBeVisible();
});
