import { test, expect } from "@playwright/test";
import { consultar } from "./utils/bd";

// El segundo idioma, de punta a punta por la UI (S5): un navegador en inglés llega a la portada en
// inglés, publica un inmueble leyendo solo inglés y el vendedor queda guardado con idioma = 'en'.
// Después el selector cambia al español, lo recuerda y no toca la URL. Las demás e2e corren en español
// (`locale: "es-CO"` en playwright.config.ts); las capturas y e2e completas en inglés son del cierre
// del hito. Datos 100 % sintéticos.

test.describe("publicar en inglés", () => {
  test.use({ locale: "en-US" });

  test("portada en inglés, publicación completa y vendedor guardado con idioma 'en'", async ({
    page,
  }, testInfo) => {
    // Una sola vez: el resultado no depende del tamaño de pantalla y la BD es compartida.
    test.skip(testInfo.project.name !== "desktop-chromium", "una sola vez");
    const nombreUnico = `Ana Founder ${Date.now()}`;

    // Portada: el navegador pide inglés y la URL no cambia.
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(
      page.getByRole("heading", { level: 1, name: /Sell your home direct/i }),
    ).toBeVisible();
    // Lo que se retiró en español tampoco está en inglés: ni la cifra de Camacol ni la fecha.
    const cuerpo = (await page.locator("body").innerText()).toLowerCase();
    expect(cuerpo).not.toContain("camacol");
    expect(cuerpo).not.toContain("october");
    // Y no queda español suelto en la portada.
    expect(cuerpo).not.toContain("vende tu casa");

    // Flujo de publicar, leyendo inglés.
    await page
      .getByRole("link", { name: "List your property as a founding seller" })
      .first()
      .click();
    await expect(page).toHaveURL(/\/publicar$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await page.getByLabel("What's your name?").fill(nombreUnico);
    await page.getByLabel("Your WhatsApp number").fill("300 123 4567");
    await page.getByLabel("Which city is your property in?").fill("Bogotá");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("radio", { name: "For sale" }).check({ force: true });
    // Los valores de las opciones son los de la BD; lo que se lee es inglés.
    await page.getByLabel("Property type").selectOption("apartaestudio");
    await expect(
      page.getByRole("option", {
        name: "Studio (apartaestudio)",
      }),
    ).toBeAttached();
    await page.getByLabel("Locality (localidad)").selectOption("Chapinero");
    // El barrio se elige del catálogo catastral (no hay texto libre) y espera a la localidad.
    await page.getByLabel("Neighborhood (barrio)").selectOption("Los Rosales");
    await page.getByLabel("Area (m²)").fill("78");
    await page.getByLabel("Bedrooms").fill("3");
    await page.getByLabel("Expected price").fill("420000000");
    await page.getByRole("button", { name: "Continue" }).click();

    // Revisión: el precio se escribe como lo lee un extranjero (código de la moneda, comas).
    await expect(
      page.getByRole("heading", { name: "Review and submit" }),
    ).toBeVisible();
    await expect(page.getByText("COP 420,000,000")).toBeVisible();
    await expect(
      page.getByText("Studio (apartaestudio)").first(),
    ).toBeVisible();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "List my property" }).click();

    await expect(page).toHaveURL(/\/confirmacion$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.getByRole("heading", {
        name: /registered as a founding listing/i,
      }),
    ).toBeVisible();
    // «Sin fecha»: promete el aviso por WhatsApp, no un mes.
    await expect(
      page.getByText(
        "If you left your email, we'll let you know when the time comes.",
      ),
    ).toBeVisible();

    // El idioma activo quedó guardado con el vendedor (lo usarán los avisos), y el barrio del catálogo
    // dejó al anuncio ubicado. Se busca por el nombre único de esta corrida.
    const filas = consultar(
      `select v.idioma || '|' || coalesce(i.sector_codigo, 'sin-sector') from public.vendedores v
         join public.inmuebles i on i.vendedor_id = v.id
        where v.nombre = '${nombreUnico}'`,
    );
    expect(filas).toEqual(["en|008304"]);
  });

  test("el selector pasa a español, lo recuerda y la URL no cambia", async ({
    page,
    context,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "una sola vez");
    await page.goto("/publicar");
    await expect(page.getByLabel("What's your name?")).toBeVisible();

    await page
      .getByRole("group", { name: "Language" })
      .getByRole("button", { name: "Español" })
      .click();
    await expect(page.locator("html")).toHaveAttribute("lang", "es-CO");
    expect(new URL(page.url()).pathname).toBe("/publicar");
    await expect(page.getByLabel("¿Cómo te llamas?")).toBeVisible();

    const cookie = (await context.cookies()).find((c) => c.name === "idioma");
    expect(cookie?.value).toBe("es");

    // Recordado aunque el navegador siga pidiendo inglés: otra página, misma URL de siempre.
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "es-CO");
    await expect(
      page.getByRole("heading", { level: 1, name: /Vende tu casa directo/i }),
    ).toBeVisible();
  });
});
