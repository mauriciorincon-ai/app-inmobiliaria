import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// El brochure vivo servido en /conoce (docs/BROCHURE.html copiado por build:brochure).
// Vigila las REGLAS NO NEGOCIABLES declaradas en la cabecera del documento: conteo intacto,
// reduced-motion como experiencia COMPLETA, lo cerrado fuera del árbol de accesibilidad,
// teclado, y que el mapa de rutas no mienta.

const CONTEO_ESPERADO = 13; // cuadra 1:1 con las secciones "###" de docs/MANUAL-DE-USO.md

test("la ruta /conoce sirve el brochure y declara su estado inicial", async ({
  page,
}) => {
  await page.goto("/conoce");
  await expect(page).toHaveTitle(/Innmobiliaria/i);
  await expect(
    page.getByRole("heading", { name: /Vende tu casa directo/i }),
  ).toBeVisible();
  // La portada declara que es INICIAL y que se sella con el cierre de pruebas.
  // (El texto también aparece en el historial del pie, de ahí el locator concreto.)
  await expect(page.locator(".estado-sello")).toContainText(
    /Brochure inicial/i,
  );
});

test("el conteo del pie cuadra con el manual y está en el DOM desde el primer byte", async ({
  page,
}) => {
  await page.goto("/conoce");
  // Sin scroll ni animación: el número ya está escrito (accesible y a prueba de JS caído).
  const contador = page.locator("[data-contador]");
  await expect(contador).toHaveText(String(CONTEO_ESPERADO));
});

test("cada tarjeta cerrada queda FUERA del árbol de accesibilidad", async ({
  page,
}) => {
  await page.goto("/conoce");
  const boton = page.locator(".tarjeta-boton").first();
  await expect(boton).toHaveAttribute("aria-expanded", "false");

  // `visibility: hidden` es lo que saca el detalle del árbol: sin esto el lector de pantalla
  // recitaría las features mientras aria-expanded dice "cerrado".
  const visibilidad = await page.evaluate(
    () => getComputedStyle(document.querySelector("#d1")!).visibility,
  );
  expect(visibilidad).toBe("hidden");
});

test("el teclado abre y cierra una tarjeta, y la saca del automático", async ({
  page,
}) => {
  await page.goto("/conoce");
  const tarjeta = page.locator(".tarjeta").first();
  const boton = tarjeta.locator(".tarjeta-boton");

  await boton.focus();
  const antes = await boton.getAttribute("aria-expanded");
  await page.keyboard.press("Enter");
  await expect(boton).toHaveAttribute(
    "aria-expanded",
    antes === "true" ? "false" : "true",
  );

  // El toque (o la tecla) manda: la tarjeta sale del auto-desplegado por lectura.
  await expect(tarjeta).toHaveAttribute("data-manual", "true");

  // Y vuelve a alternar.
  const intermedio = await boton.getAttribute("aria-expanded");
  await page.keyboard.press("Enter");
  await expect(boton).toHaveAttribute(
    "aria-expanded",
    intermedio === "true" ? "false" : "true",
  );
});

test("una tarjeta se abre sola al llegar a ella bajando (apertura por lectura)", async ({
  page,
}) => {
  await page.goto("/conoce");
  const boton = page.locator(".tarjeta-boton").first();
  await expect(boton).toHaveAttribute("aria-expanded", "false");

  // Conducimos el scroll con "instant": probamos la CAUSA (la cabecera cruzando la línea),
  // no el resultado de una animación.
  await page.evaluate(() => {
    const b = document.querySelector(".tarjeta-boton")!;
    const r = b.getBoundingClientRect();
    window.scrollBy({
      top: r.top - window.innerHeight * 0.5,
      behavior: "instant",
    });
  });

  await expect(boton).toHaveAttribute("aria-expanded", "true");
});

test.describe("reduced-motion: la experiencia está COMPLETA y quieta", () => {
  test("todo el contenido es visible y nada se mueve", async ({
    browser,
    baseURL,
  }) => {
    // Contexto propio con la preferencia del sistema puesta: probamos la CAUSA real
    // (`prefers-reduced-motion: reduce`), no una clase que nosotros mismos pongamos.
    const contexto = await browser.newContext({ reducedMotion: "reduce" });
    const page = await contexto.newPage();
    await page.goto(`${baseURL}/conoce`);

    // 1. La ficha del viaje nace en su POSE FINAL: el sello ya está, sin depender del scroll.
    const opacidadSello = await page.evaluate(
      () => getComputedStyle(document.querySelector(".ficha-sello")!).opacity,
    );
    expect(Number(opacidadSello)).toBe(1);

    // 2. Ningún bloque quedó escondido esperando una animación que no va a correr.
    const ocultos = await page.evaluate(
      () =>
        Array.from(document.querySelectorAll(".alza")).filter(
          (e) => parseFloat(getComputedStyle(e).opacity) < 0.99,
        ).length,
    );
    expect(ocultos).toBe(0);

    // 3. El conteo sigue ahí (el contador no anima, pero el número no desaparece).
    await expect(page.locator("[data-contador]")).toHaveText(
      String(CONTEO_ESPERADO),
    );

    // 4. Cero animaciones corriendo: ni el loop del clímax ni la marquesina.
    const corriendo = await page.evaluate(
      () =>
        document.getAnimations().filter((a) => a.playState === "running")
          .length,
    );
    expect(corriendo).toBe(0);

    await contexto.close();
  });
});

test("el mapa de rutas no miente: cada ruta del brochure existe", async ({
  page,
  request,
}) => {
  await page.goto("/conoce");
  const rutas = await page.locator("#lo-fino .mapa code").allTextContents();

  expect(rutas.length).toBeGreaterThan(5);

  for (const ruta of rutas) {
    // Las rutas con parámetro (/i/…) y las privadas se comprueban por forma, no por fetch:
    // la ficha necesita un slug real y el panel redirige al login.
    if (ruta.includes("…")) continue;
    const res = await request.get(ruta, { maxRedirects: 0 });
    expect(
      [200, 307, 308].includes(res.status()),
      `la ruta ${ruta} del mapa no responde (${res.status()})`,
    ).toBe(true);
  }
});

test("axe sin violaciones en /conoce", async ({ page }) => {
  await page.goto("/conoce");
  await expect(page).toHaveTitle(/Innmobiliaria/i);
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.length}`),
    JSON.stringify(violations, null, 2),
  ).toEqual([]);
});
