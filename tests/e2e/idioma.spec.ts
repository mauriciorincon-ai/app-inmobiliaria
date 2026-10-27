import { test, expect, type APIRequestContext } from "@playwright/test";

// Resolución del idioma (ADR 013): la URL pública no cambia; `next.config.ts` reescribe cada petición
// a /es o /en según la cookie `idioma` y `Accept-Language`. Esta spec fija el contrato contra el
// build real (`pnpm build && pnpm start`) y el selector en el navegador.

const LANG = /<html[^>]*\blang="([^"]*)"/;

async function pedir(
  request: APIRequestContext,
  ruta: string,
  cabeceras: Record<string, string> = {},
) {
  const r = await request.get(ruta, { headers: cabeceras, maxRedirects: 0 });
  const cuerpo = await r.text();
  return { estado: r.status(), lang: LANG.exec(cuerpo)?.[1] ?? null, cuerpo };
}

test.describe("reescrituras de idioma (HTTP)", () => {
  // El contrato es el mismo para los dos proyectos de Playwright: se comprueba una sola vez.
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
  });

  const casos: Array<[string, Record<string, string>, string]> = [
    ["sin cookie ni cabecera: español", {}, "es-CO"],
    ["navegador en inglés", { "Accept-Language": "en-US,en;q=0.9" }, "en"],
    [
      "navegador en español que también acepta inglés",
      { "Accept-Language": "es-CO,es;q=0.9,en;q=0.8" },
      "es-CO",
    ],
    [
      "navegador en francés que acepta inglés",
      { "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8" },
      "en",
    ],
    [
      "navegador en francés que prefiere español a inglés: español",
      { "Accept-Language": "fr,es;q=0.8,en;q=0.5" },
      "es-CO",
    ],
    [
      "navegador en portugués sin inglés: español (el mercado es Bogotá)",
      { "Accept-Language": "pt-BR,pt;q=0.9" },
      "es-CO",
    ],
    [
      "la cookie en inglés gana a la cabecera en español",
      { Cookie: "idioma=en", "Accept-Language": "es-CO,es;q=0.9" },
      "en",
    ],
    [
      "la cookie en español gana a la cabecera en inglés",
      { Cookie: "idioma=es", "Accept-Language": "en-US,en;q=0.9" },
      "es-CO",
    ],
    [
      "una cookie inválida no impide que decida la cabecera",
      { Cookie: "idioma=fr", "Accept-Language": "en-US,en;q=0.9" },
      "en",
    ],
  ];

  for (const [nombre, cabeceras, esperado] of casos) {
    test(nombre, async ({ request }) => {
      const r = await pedir(request, "/", cabeceras);
      expect(r.estado).toBe(200);
      expect(r.lang).toBe(esperado);
    });
  }

  for (const ruta of [
    "/publicar",
    "/confirmacion",
    "/mi-anuncio",
    "/renovar",
    "/privacidad",
    "/operador/login",
  ]) {
    test(`${ruta} existe en los dos idiomas con la misma URL`, async ({
      request,
    }) => {
      const es = await pedir(request, ruta);
      const en = await pedir(request, ruta, { Cookie: "idioma=en" });
      expect([es.estado, es.lang]).toEqual([200, "es-CO"]);
      expect([en.estado, en.lang]).toEqual([200, "en"]);
    });
  }

  test("la query (?ref) sobrevive a la reescritura", async ({ request }) => {
    const r = await pedir(request, "/?ref=ABC123");
    expect(r.estado).toBe(200);
  });

  for (const ruta of ["/es", "/en", "/en/publicar", "/es/publicar"]) {
    test(`el segmento interno ${ruta} no se expone: 404`, async ({
      request,
    }) => {
      const r = await pedir(request, ruta, { Cookie: "idioma=en" });
      expect(r.estado).toBe(404);
    });
  }

  test("los archivos de public/ no se reescriben, con cualquier cookie", async ({
    request,
  }) => {
    for (const cookie of ["", "idioma=en", "idioma=es"]) {
      const cabeceras: Record<string, string> = cookie
        ? { Cookie: cookie }
        : {};
      for (const ruta of [
        "/conoce",
        "/paquete-fundador/guia-fotografica.html",
        "/og-fallback.png",
      ]) {
        const r = await request.get(ruta, { headers: cabeceras });
        expect(r.status(), `${ruta} con [${cookie}]`).toBe(200);
      }
    }
  });

  test("una ruta que no existe da 404 con el texto en los dos idiomas", async ({
    request,
  }) => {
    const r = await pedir(request, "/no-existe");
    expect(r.estado).toBe(404);
    expect(r.cuerpo).toContain("Página no encontrada");
    expect(r.cuerpo).toContain("Page not found");
  });

  test("la API no se reescribe: GET a una ruta solo-POST da 405", async ({
    request,
  }) => {
    const r = await request.get("/api/registro", {
      headers: { Cookie: "idioma=en" },
    });
    expect(r.status()).toBe(405);
  });
});

test.describe("selector de idioma (navegador)", () => {
  test("cambia el idioma, lo recuerda y no cambia la URL", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "es-CO");

    await page
      .getByRole("group", { name: "Idioma" })
      .getByRole("button", { name: "English" })
      .click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    expect(new URL(page.url()).pathname).toBe("/");

    const cookie = (await context.cookies()).find((c) => c.name === "idioma");
    expect(cookie?.value).toBe("en");

    // Recordado: otra página sigue en inglés, con la URL de siempre.
    await page.goto("/privacidad");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    expect(new URL(page.url()).pathname).toBe("/privacidad");

    // Y de vuelta.
    await page
      .getByRole("group", { name: "Language" })
      .getByRole("button", { name: "Español" })
      .click();
    await expect(page.locator("html")).toHaveAttribute("lang", "es-CO");
  });

  test("el botón del idioma activo está marcado con aria-pressed", async ({
    page,
  }) => {
    await page.goto("/privacidad");
    const grupo = page.getByRole("group", { name: "Idioma" });
    await expect(
      grupo.getByRole("button", { name: "Español" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      grupo.getByRole("button", { name: "English" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  // WCAG 2.2 AA 2.5.8 (tamaño del objetivo, mínimo): cada botón mide al menos 24 × 24 px, en la
  // portada y en una pantalla interior, en escritorio y en móvil.
  for (const ruta of ["/", "/privacidad"]) {
    test(`en ${ruta} cada botón mide al menos 24 × 24 px`, async ({ page }) => {
      await page.goto(ruta);
      const botones = page
        .getByRole("group", { name: "Idioma" })
        .getByRole("button");
      await expect(botones).toHaveCount(2);
      for (const boton of await botones.all()) {
        const caja = await boton.boundingBox();
        expect(caja, "el botón se pinta").not.toBeNull();
        expect(caja!.width).toBeGreaterThanOrEqual(24);
        expect(caja!.height).toBeGreaterThanOrEqual(24);
      }
    });
  }

  test("cambiar de idioma en /mi-anuncio conserva el token del fragmento", async ({
    page,
  }) => {
    await page.goto("/mi-anuncio#t=token-de-prueba");
    await page
      .getByRole("group", { name: "Idioma" })
      .getByRole("button", { name: "English" })
      .click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    // La recarga conserva el fragmento (un redirect de servidor lo perdería).
    expect(new URL(page.url()).hash).toBe("#t=token-de-prueba");
  });
});

test.describe("primera visita desde un navegador en inglés", () => {
  test.use({ locale: "en-US" });

  test("la portada llega en inglés y el selector lo refleja", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page
        .getByRole("group", { name: "Language" })
        .getByRole("button", { name: "English" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
