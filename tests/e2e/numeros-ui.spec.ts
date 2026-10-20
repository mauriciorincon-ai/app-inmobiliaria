import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { consultar } from "./utils/bd";
import { crearAnuncio, type AnuncioCreado } from "./utils/anuncios";
import { formatearCOP } from "../../src/engine/format/cop";
import {
  CAMPOS_INICIALES,
  enlaceAlerta,
  enlaceBuscar,
  precioMaximoDe,
} from "../../src/engine/simulador/formulario";

// S10 «Decidir con números» POR LA UI, en español (el inglés se prueba al cierre del hito): «¿Está caro?» en la ficha y
// su detalle con los cuatro estados, los datos de la zona, el simulador (que filtra /buscar y llena una alerta), la
// cuota en la ficha, el rango del dueño al publicar y en Mi anuncio, la fila de Comparar y la navegación de cuatro
// secciones. Y que NINGUNA petición lleve los ingresos. Datos 100 % sintéticos.
//
// Los comparables son de un grupo que ninguna otra prueba usa (venta · casa · Tunal Oriental, Tunjuelito) y se limpian
// antes y después: la base local se comparte entre specs. Todos de 78 m² (el helper fija el área), así que el precio por
// m² es exacto. Ocho de 5,0 a 6,0 millones por m² + uno en rango, uno caro (8,5) y uno sospechosamente barato (2,8).

const LOCALIDAD = "Tunjuelito";
const BARRIO = "Tunal Oriental";
const SECTOR = "002401";
const AREA = 78;
const M2 = 1_000_000;
const CLAVE_CAPACIDAD = "inn:capacidad:v1";
const CLAVE_FAVORITOS = "inn:favoritos:v1";
const INGRESOS_UNICOS = "8123456";

const precioPorM2 = (v: number) => Math.round(v * M2 * AREA);
const BASE = [5.0, 5.2, 5.4, 5.6, 5.8, 6.0, 5.3, 5.7].map(precioPorM2);

function limpiar() {
  consultar(
    `delete from public.inmuebles where sector_codigo = '${SECTOR}' and tipo in ('casa', 'apartaestudio')`,
  );
}

let enRango: AnuncioCreado;
let caro: AnuncioCreado;
let barato: AnuncioCreado;
let pocos: AnuncioCreado;

const casa = (precio: number) =>
  crearAnuncio({ barrio: BARRIO, localidad: LOCALIDAD, tipo: "casa", precio });

test.describe.configure({ mode: "serial" });

// Los comparables se siembran UNA vez, en el proyecto de escritorio: con dos proyectos en paralelo se pisarían entre sí.
test.beforeAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "desktop-chromium") return;
  limpiar();
  await Promise.all(BASE.map((p) => casa(p)));
  [enRango, caro, barato] = await Promise.all([
    casa(precioPorM2(5.5)),
    casa(precioPorM2(8.5)),
    casa(precioPorM2(2.8)),
  ]);
  // Otro grupo con solo tres anuncios: «sin datos suficientes».
  const apartaestudio = (n: number) =>
    crearAnuncio({
      barrio: BARRIO,
      localidad: LOCALIDAD,
      tipo: "apartaestudio",
      precio: precioPorM2(4 + n * 0.1),
    });
  [pocos] = await Promise.all([
    apartaestudio(0),
    apartaestudio(1),
    apartaestudio(2),
  ]);
});

test.afterAll(({}, testInfo) => {
  if (testInfo.project.name === "desktop-chromium") limpiar();
});

async function sinViolaciones(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations).toEqual([]);
}

async function sembrarLocal(page: Page, clave: string, valor: unknown) {
  await page.goto("/privacidad");
  await page.evaluate(
    ([k, v]) => window.localStorage.setItem(k, v),
    [clave, JSON.stringify(valor)],
  );
}

test.describe("¿Está caro? en la ficha y su detalle", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
  });

  test("en rango: la ficha lo dice, el detalle da el rango con su N, su fecha y su fuente, y cómo se calculó", async ({
    page,
  }) => {
    await page.goto(`/i/${enRango.slug}`);
    const tarjeta = page.getByRole("region", { name: "¿Está caro?" });
    await expect(tarjeta).toContainText("En rango");
    await expect(tarjeta).toContainText("Frente a 8 anuncios comparables");
    await expect(tarjeta).toContainText("no un avalúo");
    await sinViolaciones(page);

    await tarjeta.getByRole("link", { name: "Ver el detalle" }).click();
    await expect(page).toHaveURL(new RegExp(`/i/${enRango.slug}/esta-caro$`));
    await expect(
      page.getByRole("heading", { level: 1, name: "¿Está caro este anuncio?" }),
    ).toBeVisible();
    await expect(
      page.getByText(/frente a 8 anuncios comparables de Tunal Oriental/),
    ).toBeVisible();
    await expect(page.getByText("Dentro del rango de su zona")).toBeVisible();
    // P25–P75 del precio por m² con 8 comparables: 5,275 y 5,725 millones ⇒ $5,3 M y $5,7 M; este pide $5,5 M.
    await expect(
      page.getByText(/entre \$5,3 M y \$5,7 M por m²\. Este pide \$5,5 M/),
    ).toBeVisible();
    await expect(
      page.getByText(
        `Para ${AREA} m²: entre ${formatearCOP(411_450_000, "es")} y ${formatearCOP(446_550_000, "es")}`,
      ),
    ).toBeVisible();
    // Un rango y nunca un valor único ni un avalúo.
    await expect(page.locator("main")).not.toContainText(/avalúo de /i);

    // Cómo lo calculamos: el método, la fuente y la fecha.
    await page.getByText("Cómo lo calculamos").click();
    await expect(
      page.getByText(
        "Es el precio que piden los dueños, no el de cierre. No es un avalúo.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText(/Fuente: anuncios vivos en Innmobiliaria al \d/),
    ).toBeVisible();

    // Datos de la zona: tres cifras, cada una con su fuente, y el catastro rotulado como TERRENO.
    const zona = page.getByRole("region", { name: "Datos de la zona" });
    await expect(zona).toContainText("m² mediano de oferta");
    await expect(zona).toContainText("$5,5 M");
    await expect(zona).toContainText("9 anuncios del barrio");
    await expect(zona).toContainText("11 en el barrio · vivos hoy");
    await expect(zona).toContainText("Valor de referencia del m² de terreno");
    await expect(zona).toContainText("$2 M");
    await expect(zona).toContainText("Catastro Bogotá (UAECD)");
    await expect(zona).toContainText("mediana de 34 manzanas");
    await expect(zona).toContainText("es solo del terreno, por manzana");
    await expect(zona).toContainText("licencia CC BY 4.0");
    // No hay «Reportar»: eso llega con las reglas antifraude.
    await expect(page.getByText(/Reportar/)).toHaveCount(0);
    await sinViolaciones(page);
  });

  test("caro: por encima del tope del rango, con el consejo de preguntarle al dueño", async ({
    page,
  }) => {
    await page.goto(`/i/${caro.slug}`);
    await expect(
      page.getByRole("region", { name: "¿Está caro?" }),
    ).toContainText("Por encima del rango");
    await page.goto(`/i/${caro.slug}/esta-caro`);
    await expect(page.getByText("Por encima del rango").first()).toBeVisible();
    await expect(page.getByText(/Pide \$8,5 M por m²/)).toBeVisible();
    await expect(page.getByText(/pregúntale al dueño qué/)).toBeVisible();
    await sinViolaciones(page);
  });

  test("sospechosamente barato: avisa con el consejo (visitar, CTL, sin anticipos) y sin bandera", async ({
    page,
  }) => {
    await page.goto(`/i/${barato.slug}`);
    await expect(
      page.getByRole("region", { name: "¿Está caro?" }),
    ).toContainText("Sospechosamente barato");
    await page.goto(`/i/${barato.slug}/esta-caro`);
    await expect(
      page.getByText("Muy por debajo de su zona: revisa con cuidado"),
    ).toBeVisible();
    await expect(page.getByText(/nunca des anticipos/)).toBeVisible();
    await expect(page.getByText(/Reportar/)).toHaveCount(0);
    await sinViolaciones(page);
  });

  test("con menos de 5 comparables NO hay rango: «sin datos suficientes» con cuántos hay", async ({
    page,
  }) => {
    await page.goto(`/i/${pocos.slug}`);
    await expect(
      page.getByRole("region", { name: "¿Está caro?" }),
    ).toContainText("Sin datos suficientes");
    await page.goto(`/i/${pocos.slug}/esta-caro`);
    await expect(
      page.getByText("Aún no hay suficientes comparables"),
    ).toBeVisible();
    await expect(
      page.getByText(/al menos 5 anuncios parecidos.*hoy hay 2/),
    ).toBeVisible();
    // Ni barra ni rango en pesos.
    await expect(page.getByRole("img")).toHaveCount(0);
    await expect(page.getByText(/entre \$/)).toHaveCount(0);
    await sinViolaciones(page);
  });

  test("un anuncio que no existe da 404 también en el detalle", async ({
    page,
  }) => {
    const r = await page.goto("/i/no-existe-este-anuncio/esta-caro");
    expect(r?.status()).toBe(404);
  });
});

test.describe("el simulador, la ficha y la alerta", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
  });

  test("calcula la cuota, filtra /buscar, llena la alerta, recuerda en el teléfono y NINGUNA petición lleva los ingresos", async ({
    page,
    context,
  }) => {
    // Todo lo que sale del navegador: URL, cuerpo y cabeceras. Los ingresos no pueden estar en ninguna.
    const peticiones: string[] = [];
    context.on("request", (req) => {
      peticiones.push(
        `${req.method()} ${req.url()} ${req.postData() ?? ""} ${JSON.stringify(req.headers())}`,
      );
    });

    await page.goto("/herramientas?precio=300000000");
    await expect(
      page.getByRole("heading", { level: 1, name: "¿Cuánto pagarías al mes?" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Secciones del comprador" })
        .getByRole("link", { name: "Herramientas" }),
    ).toHaveAttribute("aria-current", "page");
    // El precio de la ficha llega prellenado; la tasa de referencia sale con su fecha y su fuente.
    await expect(page.getByLabel("Precio del inmueble (COP)")).toHaveValue(
      "300000000",
    );
    await expect(
      page.getByText(/Tasa de referencia: .* % EA, con corte al/),
    ).toBeVisible();
    await expect(
      page.getByText(/Superintendencia Financiera/).first(),
    ).toBeVisible();
    // Sin ingresos: la cuota se calcula pero no dice si cabe.
    await expect(
      page.getByText(
        "Escribe los ingresos de tu hogar para ver si la cuota cabe.",
      ),
    ).toBeVisible();

    // La tasa propia pisa a la de referencia: 300 M, 30 %, 20 años, 15,48 % EA ⇒ $2.684.822 (la cuenta está en el motor).
    await page.getByLabel("Tasa efectiva anual (%)").fill("15,48");
    await page
      .getByLabel("Ingresos mensuales del hogar (COP)")
      .fill(INGRESOS_UNICOS);
    await expect(page.getByText("$2.684.822", { exact: true })).toBeVisible();
    await expect(
      page.getByText("La cuota no pasa del 40 % de tus ingresos."),
    ).toBeVisible();
    await expect(page.getByText("Un cálculo, no una aprobación")).toBeVisible();
    await expect(page.getByText(/Decreto 583 de 2025/).first()).toBeVisible();
    await sinViolaciones(page);

    // Lo que puedes pagar: el precio máximo sale del motor (redondeado hacia abajo al millón).
    const max = precioMaximoDe(
      {
        ...CAMPOS_INICIALES,
        precio: "300000000",
        tasa: "15,48",
        ingresos: INGRESOS_UNICOS,
      },
      15.48,
    )!;
    await expect(
      page.getByText(`puedes pagar hasta ${formatearCOP(max, "es")}`),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Avísame de lo que puedo pagar" }),
    ).toHaveAttribute("href", enlaceAlerta(max));

    // «Ver lo que puedo pagar» → /buscar filtrado por ese tope y rotulado de dónde sale.
    await page.getByRole("link", { name: "Ver lo que puedo pagar" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/buscar\\?op=venta&max=${max}&pago=1$`),
    );
    expect(enlaceBuscar(max)).toContain(`max=${max}`);
    await expect(
      page.getByText(`Hasta ${formatearCOP(max, "es")} · lo que puedes pagar`),
    ).toBeVisible();
    // El tope filtra el catálogo de verdad: el sospechosamente barato (218 M) entra; el caro (663 M) no.
    await page.goto(`${enlaceBuscar(max)}&min=${barato.precio}`);
    await expect(
      page.locator(`a[href="/i/${barato.slug}"]`).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(`a[href="/i/${caro.slug}"]`)).toHaveCount(0);
    await expect(page.locator(`a[href="/i/${enRango.slug}"]`)).toHaveCount(0);

    // La alerta nace con el tope.
    await page.goto(enlaceAlerta(max));
    await expect(
      page.getByText(
        new RegExp(String(max).replace(/(\d)(?=(\d{3})+$)/g, "$1.")),
      ),
    ).toBeVisible();

    // Recuerda en ESTE teléfono (localStorage) y se puede borrar.
    await page.goto("/herramientas");
    await expect(
      page.getByLabel("Ingresos mensuales del hogar (COP)"),
    ).toHaveValue(INGRESOS_UNICOS);
    expect(
      JSON.parse(
        (await page.evaluate(
          (k) => localStorage.getItem(k),
          CLAVE_CAPACIDAD,
        )) ?? "null",
      ),
    ).toMatchObject({
      ingresos: Number(INGRESOS_UNICOS),
      inicial: 0.3,
      plazoAnos: 20,
    });
    await page
      .getByRole("button", { name: "Borrar mis números de este teléfono" })
      .click();
    await expect(
      page.getByLabel("Ingresos mensuales del hogar (COP)"),
    ).toHaveValue("");
    expect(
      await page.evaluate((k) => localStorage.getItem(k), CLAVE_CAPACIDAD),
    ).toBeNull();

    // Ninguna petición de todo el recorrido llevó los ingresos (ni en la URL, ni en el cuerpo, ni en las cabeceras).
    expect(peticiones.length).toBeGreaterThan(5);
    const conIngresos = peticiones.filter(
      (p) => p.includes(INGRESOS_UNICOS) || p.includes("8.123.456"),
    );
    expect(conIngresos).toEqual([]);
  });

  test("fuera de capacidad: el aviso lo dice y sugiere qué cambiar", async ({
    page,
  }) => {
    await page.goto("/herramientas?precio=900000000");
    await page.getByLabel("Tasa efectiva anual (%)").fill("15,48");
    await page.getByLabel("Ingresos mensuales del hogar (COP)").fill("5000000");
    await expect(
      page.getByText("La cuota pasa del 40 % de tus ingresos"),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Prueba con una cuota inicial más alta o un plazo más largo.",
      ),
    ).toBeVisible();
    await page.getByLabel("Cuota inicial (%)").fill("10");
    await expect(
      page.getByText(/el crédito pasa del 70 % del valor/),
    ).toBeVisible();
    await page.evaluate((k) => localStorage.removeItem(k), CLAVE_CAPACIDAD);
  });

  test("la ficha dice «cabe» o «pasa» con el cálculo guardado, y sin él invita a calcular", async ({
    page,
  }) => {
    const ficha = `/i/${enRango.slug}`;
    // Sin cálculo guardado.
    await page.goto(ficha);
    const cuota = page.getByRole("region", { name: "Tu cuota" });
    await expect(
      cuota.getByRole("link", { name: "Calcula tu cuota" }),
    ).toHaveAttribute("href", `/herramientas?precio=${enRango.precio}`);

    // Ingresos altos, tasa de referencia del día: cabe.
    await sembrarLocal(page, CLAVE_CAPACIDAD, {
      ingresos: 40_000_000,
      inicial: 0.3,
      plazoAnos: 20,
      tasaEA: null,
    });
    await page.goto(ficha);
    await expect(cuota).toContainText(
      /con la tasa del .*: cabe en lo que puedes pagar/,
    );
    await expect(cuota).toContainText("Tu cálculo vive solo en este teléfono");

    // Ingresos bajos con su propia tasa: pasa.
    await sembrarLocal(page, CLAVE_CAPACIDAD, {
      ingresos: 5_000_000,
      inicial: 0.3,
      plazoAnos: 20,
      tasaEA: 15.48,
    });
    await page.goto(ficha);
    await expect(cuota).toContainText(
      "con tu tasa: pasa de lo que puedes pagar",
    );
    // El cálculo de la ficha es el del motor: 429 M ⇒ cuota ≈ $3,8 millones.
    await expect(cuota).toContainText(/≈ \$3\.8\d\d\.\d{3} al mes/);
    await sinViolaciones(page);

    // Con menos de 30 % de cuota inicial el crédito pasa del 70 % que permite la norma: la ficha no lo calla.
    await sembrarLocal(page, CLAVE_CAPACIDAD, {
      ingresos: 40_000_000,
      inicial: 0.1,
      plazoAnos: 20,
      tasaEA: null,
    });
    await page.goto(ficha);
    await expect(cuota).toContainText("pasaría del 70 % del valor");
    await page.evaluate((k) => localStorage.removeItem(k), CLAVE_CAPACIDAD);
  });
});

test.describe("el dueño y Comparar", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
  });

  test("el dueño ve el rango al publicar (con su precio frente a él) y sin escribirlo no ve estado", async ({
    page,
  }) => {
    await page.goto("/publicar");
    await page.getByLabel("Cómo te llamas").fill("Dueño Sintético Numeros");
    await page.getByLabel("Tu WhatsApp").fill("300 123 4567");
    await page.getByLabel("ciudad está tu inmueble").fill("Bogotá");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(
      page.getByText(
        /Elige el tipo, la localidad, el barrio y escribe el área/,
      ),
    ).toBeVisible();
    await page.getByRole("radio", { name: "Venta" }).check({ force: true });
    await page.getByLabel("Tipo de inmueble").selectOption("casa");
    await page.getByLabel("Localidad").selectOption(LOCALIDAD);
    await page.getByLabel("Barrio").selectOption(BARRIO);
    await page.getByLabel("Área (m²)").fill(String(AREA));

    const bloque = page
      .getByText("Lo que piden por anuncios parecidos")
      .locator("..");
    // 9 comparables tras el recorte de atípicos: P25 5,3 y P75 5,7 millones por m² ⇒ ×78.
    await expect(bloque).toContainText(
      `entre ${formatearCOP(413_400_000, "es")} y ${formatearCOP(444_600_000, "es")} por ${AREA} m²`,
      { timeout: 15_000 },
    );
    await expect(bloque).toContainText("9 anuncios al");
    await expect(bloque).toContainText("No es un avalúo");
    await expect(bloque).not.toContainText("Tu precio");

    await page.getByLabel("Precio esperado (COP)").fill("429000000");
    await expect(bloque).toContainText("Tu precio está dentro de ese rango.");
    await page.getByLabel("Precio esperado (COP)").fill("700000000");
    await expect(bloque).toContainText(
      "Tu precio está por encima de ese rango.",
    );
    await page.getByLabel("Precio esperado (COP)").fill("200000000");
    await expect(bloque).toContainText("revisa que no falte un cero");
    // El radio recién marcado anima su color (transition-colors): axe mediría un tono a medias. Sin animaciones.
    await page.addStyleTag({ content: "*{transition:none!important}" });
    await sinViolaciones(page);
  });

  test("Mi anuncio muestra el mismo rango bajo el precio, sin contarse a sí mismo", async ({
    page,
  }) => {
    await page.goto(`/mi-anuncio#t=${enRango.token}`);
    await expect(
      page.getByRole("heading", { name: "Precio", level: 2 }),
    ).toBeVisible({ timeout: 15_000 });
    const bloque = page
      .getByText("Lo que piden por anuncios parecidos")
      .locator("..");
    // Sin el propio anuncio son 8 comparables: P25 5,275 y P75 5,725 millones por m² ⇒ ×78.
    await expect(bloque).toContainText(
      `entre ${formatearCOP(411_450_000, "es")} y ${formatearCOP(446_550_000, "es")}`,
      { timeout: 15_000 },
    );
    await expect(bloque).toContainText("8 anuncios al");
    await expect(bloque).toContainText("Tu precio está dentro de ese rango.");
  });

  test("Comparar trae la fila «¿Está caro?» con el estado de cada anuncio", async ({
    page,
  }) => {
    await sembrarLocal(page, CLAVE_FAVORITOS, [
      enRango.slug,
      caro.slug,
      barato.slug,
    ]);
    await page.goto("/guardados");
    const marcas = page.getByRole("checkbox", {
      name: `Comparar: Casa · ${BARRIO}`,
    });
    await expect(marcas).toHaveCount(3, { timeout: 15_000 });
    for (let i = 0; i < 3; i += 1) await marcas.nth(i).check();
    await page
      .locator("button:not([aria-pressed])", { hasText: /^Comparar$/ })
      .click();
    const tabla = page.getByRole("table", { name: "Comparación de anuncios" });
    await expect(tabla).toBeVisible();
    const fila = tabla.getByRole("row").filter({
      has: page.getByRole("rowheader", { name: "¿Está caro?" }),
    });
    await expect(fila).toContainText("En rango", { timeout: 15_000 });
    await expect(fila).toContainText("Por encima del rango");
    await expect(fila).toContainText("Sospechosamente barato");
    // Cada estado lleva al detalle del anuncio.
    await expect(fila.getByRole("link")).toHaveCount(3);
    await sinViolaciones(page);
  });
});

test.describe("la navegación del comprador con Herramientas", () => {
  test("en el teléfono son cuatro secciones y el rótulo cabe sin cortarse", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile-chromium",
      "solo en el teléfono",
    );
    await page.goto("/herramientas");
    const nav = page
      .getByRole("navigation", { name: "Secciones del comprador" })
      .last();
    await expect(nav.getByRole("link")).toHaveCount(4);
    await expect(
      nav.getByRole("link", { name: "Herramientas" }),
    ).toHaveAttribute("aria-current", "page");
    const cortados = await nav
      .getByRole("link")
      .evaluateAll(
        (links) => links.filter((a) => a.scrollWidth > a.clientWidth).length,
      );
    expect(cortados).toBe(0);
    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(desborda).toBe(false);
    await sinViolaciones(page);
  });
});
