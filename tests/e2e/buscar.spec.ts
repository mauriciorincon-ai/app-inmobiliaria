import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  ZONA_ROSALES,
  ZONA_SUBA,
  confirmadoHace,
  crearAnuncio,
  precioUnico,
  vencer,
  verificarConCtl,
  verificarSinFecha,
} from "./utils/anuncios";

// /buscar: filtros, lista y zona dibujada, contra Postgres real. El estado vive en la URL, así que las
// pruebas de filtros y de zona son DETERMINISTAS (por URL); el dibujo sobre el mapa va aparte, con un
// estilo vacío servido por la prueba (sin red, sin teselas de internet). Cada prueba aísla sus anuncios
// con un precio único. Datos sintéticos.

const ESTILO_VACIO = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "fondo",
      type: "background",
      paint: { "background-color": "#e7eefb" },
    },
  ],
};

async function estiloVacio(page: Page) {
  await page.route("**/styles/liberty*", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ESTILO_VACIO),
    }),
  );
}

// En el teléfono el mapa se abre con el botón «Mapa»; en escritorio ya está al lado de la lista. La
// página llega por STREAMING (primero el esqueleto de carga, luego la búsqueda) y el botón viene en el
// HTML del servidor pero no responde hasta hidratar: se espera a la búsqueda real y se reintenta el
// clic hasta que el botón quede pulsado.
async function abrirMapa(page: Page) {
  await page.getByRole("search").waitFor();
  if ((page.viewportSize()?.width ?? 0) >= 1024) return;
  const abrir = page.getByRole("button", { name: "Mapa", exact: true });
  await expect(async () => {
    await abrir.click();
    await expect(abrir).toHaveAttribute("aria-pressed", "true", {
      timeout: 1000,
    });
  }).toPass({ timeout: 15000 });
}

test("por filtro: encuentra el anuncio vivo y no el vencido", async ({
  page,
}) => {
  const precio = precioUnico();
  const vivo = await crearAnuncio({ precio });
  const vencido = await crearAnuncio({ precio });
  vencer(vencido);

  await page.goto(`/buscar?min=${precio}&max=${precio}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "1 anuncio vivo con tus filtros",
  );
  await expect(page.locator(`a[href="/i/${vivo.slug}"]`)).toBeVisible();
  await expect(page.locator(`a[href="/i/${vencido.slug}"]`)).toHaveCount(0);
  // La tarjeta dice dónde queda por el NOMBRE de su barrio y su localidad, no por un punto.
  const tarjeta = page
    .locator("article")
    .filter({ has: page.locator(`a[href="/i/${vivo.slug}"]`) });
  await expect(tarjeta).toContainText("Apartamento · Los Rosales");
  await expect(tarjeta).toContainText("Chapinero");
  await expect(tarjeta).toContainText("Vivo hoy");
});

test("los demás filtros recortan: operación, tipo, habitaciones y localidad", async ({
  page,
}) => {
  const precio = precioUnico();
  const casa = await crearAnuncio({ precio, tipo: "casa", habitaciones: 4 });
  const apto = await crearAnuncio({
    precio,
    tipo: "apartamento",
    habitaciones: 1,
  });
  const arriendo = await crearAnuncio({
    precio,
    operacion: "arriendo",
    habitaciones: 2,
  });
  const base = `min=${precio}&max=${precio}`;
  const slugs = async (q: string) => {
    await page.goto(`/buscar?${base}${q}`);
    // La lista llega por streaming: se espera a que el título deje de decir «Buscando…».
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
      "Buscando…",
    );
    return page
      .locator('main ul a[href^="/i/"]')
      .evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  };
  expect(await slugs("")).toHaveLength(3);
  expect(await slugs("&tipo=casa")).toEqual([`/i/${casa.slug}`]);
  expect(await slugs("&hab=2")).toEqual(
    expect.arrayContaining([`/i/${casa.slug}`, `/i/${arriendo.slug}`]),
  );
  expect(await slugs("&hab=2")).not.toContain(`/i/${apto.slug}`);
  expect(await slugs("&op=arriendo")).toEqual([`/i/${arriendo.slug}`]);
  expect(await slugs("&loc=Suba")).toEqual([]);
  // Un valor que no existe se ignora: la búsqueda sigue, sin ese filtro y sin error.
  expect(await slugs("&tipo=castillo&hab=99")).toHaveLength(3);
});

test("por zona: entra el anuncio cuyo barrio queda dentro y no el que queda fuera", async ({
  page,
}) => {
  const precio = precioUnico();
  const rosales = await crearAnuncio({ precio });
  await page.goto(`/buscar?min=${precio}&max=${precio}&zona=${ZONA_ROSALES}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "1 anuncio vivo en tu zona",
  );
  await expect(page.locator(`a[href="/i/${rosales.slug}"]`)).toBeVisible();

  await page.goto(`/buscar?min=${precio}&max=${precio}&zona=${ZONA_SUBA}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "0 anuncios vivos en tu zona",
  );
  await expect(
    page.getByText("Aún no hay anuncios vivos con esa búsqueda"),
  ).toBeVisible();
  await expect(page.locator(`a[href="/i/${rosales.slug}"]`)).toHaveCount(0);
  // Se sale del vacío quitando la zona.
  await page.getByRole("link", { name: "Quitar la zona" }).click();
  await expect(page.locator(`a[href="/i/${rosales.slug}"]`)).toBeVisible();
});

test("una zona imposible se ignora (no rompe la página)", async ({ page }) => {
  const precio = precioUnico();
  const a = await crearAnuncio({ precio });
  for (const mala of [
    "basura",
    "4.65,-74.06;4.65,-74.04",
    "40,-3;40,-4;41,-4",
    "<script>",
  ]) {
    await page.goto(
      `/buscar?min=${precio}&max=${precio}&zona=${encodeURIComponent(mala)}`,
    );
    await expect(page.locator(`a[href="/i/${a.slug}"]`)).toBeVisible();
  }
});

test("la respuesta de la página jamás contiene la dirección ni al vendedor", async ({
  page,
}) => {
  const precio = precioUnico();
  const direccion = `Direccion Sintetica ${Date.now()}`;
  const vendedor = `Vendedor Secreto ${Date.now()}`;
  const a = await crearAnuncio({ precio, direccion, nombre: vendedor });
  const respuesta = await page.goto(`/buscar?min=${precio}&max=${precio}`);
  const html = await respuesta!.text();
  expect(html).toContain(a.slug);
  for (const prohibido of [
    direccion,
    vendedor,
    "+573001234567",
    "direccion_aproximada",
  ]) {
    expect(html, prohibido).not.toContain(prohibido);
  }
  // Tampoco en lo que el navegador ya hidrató.
  const dom = await page.content();
  for (const prohibido of [direccion, vendedor, "+573001234567"]) {
    expect(dom, prohibido).not.toContain(prohibido);
  }
});

test("las tarjetas muestran los tres estados del sello y «vivo hace N días»", async ({
  page,
}) => {
  const precio = precioUnico();
  const fundador = await crearAnuncio({ precio });
  const verificado = await crearAnuncio({ precio });
  const pendiente = await crearAnuncio({ precio });
  verificarConCtl(verificado, 3);
  verificarSinFecha(pendiente);
  confirmadoHace(verificado, 12);

  await page.goto(`/buscar?min=${precio}&max=${precio}`);
  const de = (a: { slug: string }) =>
    page
      .locator("article")
      .filter({ has: page.locator(`a[href="/i/${a.slug}"]`) });
  await expect(de(fundador)).toContainText("Fundador");
  await expect(de(verificado)).toContainText(/⭐ CTL del \d{1,2} \w+ \d{4}/);
  await expect(de(verificado)).toContainText("Vivo hace 12 días");
  await expect(de(pendiente)).toContainText("Re-verificación pendiente");
  await expect(de(fundador)).toContainText("Vivo hoy");
});

test("en inglés: textos propios, precio en COP y el término local explicado", async ({
  browser,
}) => {
  const precio = precioUnico();
  await crearAnuncio({ precio });
  const ctx = await browser.newContext({ locale: "en-US" });
  const page = await ctx.newPage();
  await page.goto(`/buscar?min=${precio}&max=${precio}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "1 live listing matching your filters",
  );
  await expect(
    page.locator("article").getByText(`COP ${precio.toLocaleString("en-US")}`),
  ).toBeVisible();
  await page.getByText("Filters · 2").click();
  await expect(
    page.getByText(/A localidad is one of Bogotá's administrative districts/),
  ).toBeVisible();
  await expect(page.getByText("Most recently confirmed first")).toBeVisible();
  await ctx.close();
});

test("el formulario de filtros funciona sin mapa y la URL guarda la búsqueda", async ({
  page,
}) => {
  const precio = precioUnico();
  const a = await crearAnuncio({ precio, tipo: "casa" });
  await page.goto("/buscar");
  await page.getByText("Filtros", { exact: true }).click();
  await page.getByLabel("Tipo de inmueble").selectOption("casa");
  await page
    .getByLabel("Precio mínimo (COP)")
    .fill(String(precio).replace(/\B(?=(\d{3})+(?!\d))/g, "."));
  await page.getByLabel("Precio máximo (COP)").fill(String(precio));
  await page.getByRole("button", { name: "Ver resultados" }).click();
  await expect(page).toHaveURL(/tipo=casa/);
  await expect(page.locator(`a[href="/i/${a.slug}"]`)).toBeVisible();
  // Cada filtro activo es un enlace que lo quita.
  await page.getByRole("link", { name: /Quitar el filtro: Casa/ }).click();
  await expect(page).not.toHaveURL(/tipo=casa/);
});

test("el mapa: dibujar una zona de 3 esquinas filtra la lista y la URL recibe zona=", async ({
  page,
}) => {
  await estiloVacio(page);
  await page.goto("/buscar");
  // En el teléfono el mapa se abre con su botón; en escritorio ya está al lado de la lista.
  await abrirMapa(page);
  await expect(page.locator('[data-mapa-listo="true"]')).toBeVisible({
    timeout: 30000,
  });

  await page.getByRole("button", { name: /Dibujar zona/ }).click();
  const lienzo = page.locator("canvas.maplibregl-canvas");
  const caja = (await lienzo.boundingBox())!;
  for (const [fx, fy] of [
    [0.35, 0.35],
    [0.65, 0.35],
    [0.5, 0.65],
  ]) {
    await page.mouse.click(caja.x + caja.width * fx, caja.y + caja.height * fy);
  }
  await expect(page.getByText("3 esquinas marcadas")).toBeVisible();
  await page.getByRole("button", { name: "Listo" }).click();

  await expect(page).toHaveURL(
    /zona=([\d.-]+%2C[\d.-]+%3B){2}[\d.-]+%2C[\d.-]+/,
  );
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "en tu zona",
  );
  await expect(
    page.getByRole("link", { name: /Quitar el filtro: Zona dibujada/ }),
  ).toBeVisible();

  // Borrar la zona vuelve a la búsqueda sin ella (en el teléfono se vuelve a abrir el mapa).
  await abrirMapa(page);
  await expect(page.locator('[data-mapa-listo="true"]')).toBeVisible({
    timeout: 30000,
  });
  await page.getByRole("button", { name: "Borrar zona" }).click();
  await expect(page).not.toHaveURL(/zona=/);
});

test("el mapa caído no tumba la búsqueda: aviso, lista viva y reintentar", async ({
  page,
}) => {
  await page.route("**/styles/liberty*", (r) => r.abort());
  const precio = precioUnico();
  const a = await crearAnuncio({ precio });
  await page.goto(`/buscar?min=${precio}&max=${precio}`);
  await abrirMapa(page);
  await expect(page.getByText("El mapa no cargó")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  // La lista sigue funcionando (en el teléfono se vuelve a ella).
  if ((page.viewportSize()?.width ?? 0) < 1024) {
    await page.getByRole("button", { name: "Lista", exact: true }).click();
  }
  await expect(page.locator(`a[href="/i/${a.slug}"]`)).toBeVisible();
});

test("axe sin violaciones en /buscar (con el mapa cargado)", async ({
  page,
}) => {
  await estiloVacio(page);
  const precio = precioUnico();
  const a = await crearAnuncio({ precio });
  verificarConCtl(a, 2);
  await page.goto(`/buscar?min=${precio}&max=${precio}`);
  await abrirMapa(page);
  await expect(page.locator('[data-mapa-listo="true"]')).toBeVisible({
    timeout: 30000,
  });
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations).toEqual([]);
});
