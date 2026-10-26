import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { consultar, ejecutar } from "./utils/bd";
import { crearAnuncio } from "./utils/anuncios";
import demo from "../../scripts/seed-demo-edicion.json";
import { formatearCOP } from "../../src/engine/format/cop";
import {
  deFila,
  type FilaProyecto,
} from "../../src/engine/vivienda-nueva/filas";

// S14 «El papeleo, sin sorpresas» — la pantalla /papeleo (maqueta 11) POR LA UI, en español; el inglés, el teléfono y la accesibilidad
// se prueban aquí también porque la ruta es nueva. Las cifras del caso Bogotá/1.150 M son las que la prueba unitaria recalcula a mano de
// la norma. La fecha es una perilla: TODAS las peticiones llevan `x-hoy-simulado` (el servidor solo la honra con NUEVOS_SIMULACRO=1), así
// la pantalla no envejece con el reloj. Datos 100 % sintéticos: solo precios.

const HOY = "2026-10-25";
const PRECIO = 1_150_000_000;
const COMPRADOR = 23_191_550;
const VENDEDOR = 19_032_450;

const sinViolaciones = async (page: Page) => {
  // Sin transiciones: axe mediría un color a medio camino de un hover y daría un contraste falso.
  await page.addStyleTag({
    content: "*,*::before,*::after{transition:none!important}",
  });
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations).toEqual([]);
};

test.use({ extraHTTPHeaders: { "x-hoy-simulado": HOY } });
test.beforeEach(() => {
  expect(
    process.env.NUEVOS_SIMULACRO,
    "esta spec necesita NUEVOS_SIMULACRO=1 en el entorno del servidor y de las pruebas",
  ).toBe("1");
  test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
});

const total = (page: Page, actor: "comprador" | "vendedor") =>
  page
    .getByRole("region", {
      name: actor === "comprador" ? "Paga el comprador" : "Paga el vendedor",
    })
    .getByRole("row", { name: /Total verificado/ });

async function conPrecio(page: Page, precio: string) {
  await page.goto("/papeleo");
  const campo = page.getByLabel("Precio de la compraventa (COP)");
  await expect(campo).toBeVisible();
  await campo.fill(precio);
}

test("sin precio la pantalla invita a escribirlo; con él, cada parte con sus líneas, su norma, su año y su total", async ({
  page,
}) => {
  await page.goto("/papeleo");
  await expect(
    page.getByRole("heading", { level: 1, name: "El papeleo, sin sorpresas" }),
  ).toBeVisible();
  // El selector de herramienta: Papeleo es la actual y el Simulador está a un clic.
  const herramientas = page.getByRole("group", { name: "Herramienta" });
  await expect(
    herramientas.getByRole("link", { name: "Papeleo" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    herramientas.getByRole("link", { name: "Simulador" }),
  ).toHaveAttribute("href", "/herramientas");
  await expect(
    page.getByText(/Escribe el precio de la compraventa/),
  ).toBeVisible();

  await page.getByLabel("Precio de la compraventa (COP)").fill(String(PRECIO));
  const comprador = page.getByRole("region", { name: "Paga el comprador" });
  const vendedor = page.getByRole("region", { name: "Paga el vendedor" });
  await expect(comprador).toBeVisible();
  await expect(total(page, "comprador")).toContainText(formatearCOP(COMPRADOR));
  await expect(total(page, "vendedor")).toContainText(formatearCOP(VENDEDOR));
  // Cada línea dice su norma y el año de la tarifa; el impuesto de registro es el de la ordenanza, no una «beneficencia» aparte.
  await expect(
    comprador.getByRole("row", { name: /Impuesto de registro/ }),
  ).toContainText(/Ordenanza 039 de 2020 de Cundinamarca[\s\S]*tarifa 2026/);
  await expect(
    comprador.getByRole("row", { name: /Derechos de registro/ }),
  ).toContainText("Resolución 2026-001726-6 de la SNR");
  await expect(
    comprador.getByRole("row", { name: /Certificado de tradición/ }),
  ).toContainText(formatearCOP(23_000));
  await expect(
    vendedor.getByRole("row", { name: /Retención en la fuente/ }),
  ).toContainText(formatearCOP(11_500_000));
  await expect(vendedor).toContainText("Estatuto Tributario, art. 398");
  // El IVA de los derechos notariales no se pudo verificar: se nombra, con símbolo y texto, y el total dice que es un mínimo.
  await expect(
    comprador.getByRole("row", { name: /IVA de los derechos notariales/ }),
  ).toContainText("Sin cifra");
  await expect(comprador).toContainText(
    "Falta 1 concepto sin verificar: este total es lo mínimo que pagas.",
  );
  await expect(
    page.getByText(/Tarifas 2026, de una tabla versionada/),
  ).toBeVisible();
  await expect(page.getByText(/La ganancia ocasional/)).toBeVisible();
});

test("un precio que no se entiende lo dice; vaciarlo vuelve a la invitación", async ({
  page,
}) => {
  await conPrecio(page, "85.5");
  await expect(page.getByText("No pudimos leer este número.")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Paga el comprador" }),
  ).toHaveCount(0);
  await page.getByLabel("Precio de la compraventa (COP)").fill("");
  await expect(
    page.getByText(/Escribe el precio de la compraventa/),
  ).toBeVisible();
});

test("otra ciudad: el impuesto de registro se nombra sin cifra y el aviso dice por qué", async ({
  page,
}) => {
  await conPrecio(page, "400.000.000");
  await page.getByLabel("Ciudad del inmueble").selectOption("Otra ciudad");
  const comprador = page.getByRole("region", { name: "Paga el comprador" });
  await expect(
    comprador.getByRole("row", { name: /Impuesto de registro/ }),
  ).toContainText("Sin cifra");
  await expect(
    page.getByText(/El impuesto de registro depende del departamento/),
  ).toBeVisible();
});

test("VIS sin subsidio: el registro no baja a la mitad y el aviso lo dice; con subsidio, el aviso se va", async ({
  page,
}) => {
  await conPrecio(page, "200.000.000");
  await page
    .getByLabel("Tipo de vivienda")
    .selectOption("VIS (interés social)");
  const aviso = page.getByText(/Sin subsidio de vivienda del Estado/);
  await expect(aviso).toBeVisible();
  await page
    .getByLabel(
      "Tengo un subsidio de vivienda del Estado o de una caja de compensación",
    )
    .check();
  await expect(aviso).toHaveCount(0);
});

test("con crédito entran los documentos del banco, el plazo de la hipoteca y su línea sin cifra", async ({
  page,
}) => {
  await conPrecio(page, "450.000.000");
  await page.locator("summary").click();
  await page.getByLabel("Compro con crédito hipotecario").check();
  await expect(
    page
      .getByRole("region", { name: "Paga el comprador" })
      .getByRole("row", { name: /Hipoteca/ }),
  ).toContainText("Sin cifra");
  await page.getByRole("button", { name: "Documentos" }).click();
  await expect(
    page.getByText(
      "Si compras con crédito: la aprobación del banco y su avalúo",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Plazos" }).click();
  await expect(
    page.getByText("Hipoteca: dentro de 90 días hábiles"),
  ).toBeVisible();
});

test("documentos y plazos: cada paso con su norma o dicho que es práctica; el plazo de registro con su norma exacta", async ({
  page,
}) => {
  await conPrecio(page, "450.000.000");
  await page.getByRole("button", { name: "Documentos" }).click();
  const ctl = page.getByLabel(
    "Un certificado de tradición y libertad (CTL) reciente",
  );
  await ctl.check();
  await expect(ctl).toBeChecked();
  await expect(
    page.getByText("Ley 1579 de 2012, art. 72").first(),
  ).toBeVisible();
  // Lo que es práctica no se disfraza de norma.
  await expect(page.getByText("Práctica, no norma").first()).toBeVisible();
  await page.getByRole("button", { name: "Plazos" }).click();
  await expect(
    page.getByText("Pedir el registro: dentro de 2 meses"),
  ).toBeVisible();
  await expect(
    page.getByText("Ordenanza 039 de 2020 de Cundinamarca, arts. 218 y 220."),
  ).toBeVisible();
  await expect(
    page.getByText("La oficina registra: 5 días hábiles"),
  ).toBeVisible();
  await expect(page.getByText("Ley 1579 de 2012, art. 27.")).toBeVisible();
  await expect(
    page.getByText("Hipoteca: dentro de 90 días hábiles"),
  ).toHaveCount(0);
});

test("qué dice cada documento: tres documentos, el aviso de que no es asesoría legal en cada uno y cada cláusula con su artículo", async ({
  page,
}) => {
  await conPrecio(page, "450.000.000");
  await page.getByRole("button", { name: "Qué dice cada documento" }).click();
  for (const doc of [
    "Promesa de compraventa",
    "Escritura pública",
    "Registro",
  ]) {
    await expect(
      page.getByRole("heading", { level: 3, name: doc, exact: true }),
    ).toBeVisible();
  }
  await expect(page.getByText(/no es asesoría legal/)).toHaveCount(3);
  await expect(
    page.getByText(
      "Código Civil, art. 756; Ley 1579 de 2012, art. 2, literal a.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText(/Código Civil, arts. 1859, 1860 y 1861/),
  ).toBeVisible();
  await expect(
    page.getByText(/Normas leídas en su texto oficial el/),
  ).toBeVisible();
  // La cláusula de la hipoteca solo aparece con crédito.
  await expect(
    page.getByRole("heading", { level: 4, name: "La hipoteca del crédito" }),
  ).toHaveCount(0);
});

test("desde el 2027-01-01 no se muestra ninguna cifra de 2026; el 2026-12-31 todavía sí", async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({ "x-hoy-simulado": "2026-12-31" });
  await page.goto(`/papeleo?precio=${PRECIO}`);
  await expect(total(page, "comprador")).toContainText(formatearCOP(COMPRADOR));

  await page.setExtraHTTPHeaders({ "x-hoy-simulado": "2027-01-01" });
  await page.goto(`/papeleo?precio=${PRECIO}`);
  await expect(
    page.getByText(/Las tarifas que tenemos son de 2026 y estamos en 2027/),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Paga el comprador" }),
  ).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(formatearCOP(COMPRADOR));
});

test("el enlace de una ficha llega con el precio, la ciudad y el vendedor ya puestos", async ({
  page,
}) => {
  await page.goto(
    "/papeleo?precio=450000000&ciudad=chia&tipo=vis&vende=empresa",
  );
  await expect(page.getByLabel("Precio de la compraventa (COP)")).toHaveValue(
    "450000000",
  );
  await expect(page.getByLabel("Ciudad del inmueble")).toHaveValue("chia");
  await expect(page.getByLabel("Tipo de vivienda")).toHaveValue("vis");
  // Los ajustes nacen abiertos porque el enlace ya salió de lo habitual.
  await expect(page.getByLabel("Quién vende")).toBeVisible();
  await expect(
    page.getByText(/Si vende una empresa o una constructora/),
  ).toBeVisible();
  // Lo que no se entiende en la URL no tumba la página.
  await page.goto("/papeleo?precio=abc&ciudad=zzz&tipo=otro&reparto=x");
  await expect(page.getByLabel("Precio de la compraventa (COP)")).toHaveValue(
    "",
  );
  await expect(page.getByLabel("Ciudad del inmueble")).toHaveValue("bogota");
});

type Saliente = { tipo: string; url: string; cuerpo: string };

/** Anota cada petición que sale de la página desde ahora (tipo, URL y cuerpo). */
function registrarPeticiones(page: Page): Saliente[] {
  const salientes: Saliente[] = [];
  page.on("request", (r) =>
    salientes.push({
      tipo: r.resourceType(),
      url: r.url(),
      cuerpo: r.postData() ?? "",
    }),
  );
  return salientes;
}
// Una petición de datos: un fetch o xhr que no sea el prefetch de navegación de Next (`?_rsc=`, que pide OTRA página, como la portada,
// cuando su enlace entra al visor; nunca lleva lo escrito y por eso se revisa aparte con `conElPrecio`).
const deDatos = (s: Saliente[]) =>
  s.filter(
    (x) => ["fetch", "xhr"].includes(x.tipo) && !/[?&]_rsc=/.test(x.url),
  );
const conElPrecio = (s: Saliente[]) =>
  s.filter((x) => /987\.?654\.?321/.test(x.url + x.cuerpo));

test("el precio se queda en el teléfono: escribirlo, cambiar de ciudad y de sección no hace ninguna petición", async ({
  page,
}) => {
  await page.goto("/papeleo");
  const campo = page.getByLabel("Precio de la compraventa (COP)");
  await expect(campo).toBeVisible();
  const salientes = registrarPeticiones(page);
  await campo.fill("987654321");
  await page.getByLabel("Ciudad del inmueble").selectOption("Otra ciudad");
  await page.getByRole("button", { name: "Documentos" }).click();
  await page.getByRole("button", { name: "Plazos" }).click();
  await page.getByRole("button", { name: "Qué dice cada documento" }).click();
  await page.getByRole("button", { name: "Gastos" }).click();
  await expect(
    page.getByRole("region", { name: "Paga el comprador" }),
  ).toBeVisible();
  // Ni una petición de datos, y ninguna lleva el precio en la URL ni en el cuerpo.
  expect(deDatos(salientes)).toEqual([]);
  expect(conElPrecio(salientes)).toEqual([]);
  // Tampoco queda guardado en el navegador.
  const guardado = await page.evaluate(() =>
    JSON.stringify([
      { ...localStorage },
      { ...sessionStorage },
      document.cookie,
    ]),
  );
  expect(guardado).not.toMatch(/987\.?654\.?321/);
});

test("DEMO EN ROJO: el mismo detector ve una petición que sí lleve el precio", async ({
  page,
}) => {
  await page.goto("/papeleo");
  await expect(page.getByLabel("Precio de la compraventa (COP)")).toBeVisible();
  const salientes = registrarPeticiones(page);
  await page.evaluate(() =>
    fetch("/api/no-existe?precio=987654321").catch(() => null),
  );
  await expect.poll(() => deDatos(salientes).length).toBe(1);
  expect(conElPrecio(salientes)).toHaveLength(1);
});

test("en el teléfono ninguna sección se sale de la pantalla", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await conPrecio(page, String(PRECIO));
  await page.locator("summary").click();
  await page.getByLabel("Compro con crédito hipotecario").check();
  for (const seccion of [
    "Gastos",
    "Documentos",
    "Plazos",
    "Qué dice cada documento",
  ]) {
    await page.getByRole("button", { name: seccion, exact: true }).click();
    const desborde = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(desborde, seccion).toBeLessThanOrEqual(0);
  }
});

test("axe: sin violaciones en cada sección", async ({ page }) => {
  await conPrecio(page, String(PRECIO));
  await page.locator("summary").click();
  await page.getByLabel("Compro con crédito hipotecario").check();
  for (const seccion of [
    "Gastos",
    "Documentos",
    "Plazos",
    "Qué dice cada documento",
  ]) {
    await page.getByRole("button", { name: seccion, exact: true }).click();
    await sinViolaciones(page);
  }
});

test.describe("en inglés", () => {
  test.use({ locale: "en-US" });

  test("la pantalla, las líneas y las cláusulas salen en inglés, con el mismo aviso y la misma norma", async ({
    page,
  }) => {
    await page.goto("/papeleo");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "The paperwork, with no surprises",
      }),
    ).toBeVisible();
    await page.getByLabel("Sale price (COP)").fill(String(PRECIO));
    const comprador = page.getByRole("region", { name: "The buyer pays" });
    await expect(
      comprador.getByRole("row", { name: /Verified total/ }),
    ).toContainText(formatearCOP(COMPRADOR, "en"));
    await expect(
      comprador.getByRole("row", { name: /Registration tax/ }),
    ).toContainText(/Ordinance 039 of 2020[\s\S]*2026 rate/);
    await page.getByRole("button", { name: "What each document says" }).click();
    await expect(page.getByText(/not legal advice/)).toHaveCount(3);
    await expect(page.getByText(/Civil Code, art. 756/)).toBeVisible();
    await sinViolaciones(page);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// Los enlaces «Lo que te cuesta escriturar este» desde las dos fichas. La edición (nº 8990, nombres ficticios) se carga por SQL con una
// ventana de junio de 2026 que contiene el día simulado pero NO el día real, y con un número menor que el de toda otra spec: la base
// es compartida y la RPC elige por «ventana que contiene hoy, luego mayor número», así ninguna otra spec la ve como la suya.
// El anuncio usado lo crea la RPC pública.
test.describe("desde las fichas", () => {
  test.describe.configure({ mode: "serial" });

  const NUMERO = 8990;
  const DIA_DE_FICHAS = "2026-06-15";
  const filas = demo.proyectos as unknown as FilaProyecto[];
  const bogota = filas
    .map((f) => ({ f, p: deFila(f) }))
    .filter(
      ({ p }) =>
        p.region === "bogota" &&
        typeof p.precio_desde === "number" &&
        p.tipo === "apartamento",
    );
  const proyecto = bogota[0];
  const limpiar = () =>
    consultar(`delete from public.ediciones where numero = ${NUMERO}`);

  test.beforeAll(() => {
    limpiar();
    const edicion = {
      numero: NUMERO,
      nombre: demo.nombre,
      desde: "2026-06-01",
      hasta: "2026-06-30",
      paginas: demo.paginas,
      muestra_claves: filas.slice(0, 5).map((f) => f.clave),
      muestra_semilla: NUMERO,
      proyectos: filas,
    };
    ejecutar(
      `select public.cargar_edicion($j$${JSON.stringify(edicion)}$j$::jsonb)`,
    );
    const lista = filas
      .slice(0, 5)
      .map((f) => `'${f.clave}'`)
      .join(", ");
    ejecutar(
      `select public.publicar_edicion(${NUMERO}, array[${lista}]::text[])`,
    );
  });
  test.afterAll(limpiar);

  test("la ficha de vivienda nueva manda con su precio «desde», su ciudad, su tipo y vendedor constructora", async ({
    page,
  }) => {
    await page.setExtraHTTPHeaders({ "x-hoy-simulado": DIA_DE_FICHAS });
    await page.goto(`/nuevos/${proyecto.f.slug}`);
    const enlace = page.getByRole("link", {
      name: "Lo que costaría escriturar al precio «desde»",
    });
    await expect(enlace).toBeVisible();
    const href = (await enlace.getAttribute("href")) ?? "";
    expect(href).toMatch(/^\/papeleo\?/);
    expect(href).toContain(`precio=${proyecto.p.precio_desde}`);
    expect(href).toContain("vende=empresa");
    await enlace.click();
    await expect(page).toHaveURL(/\/papeleo\?/);
    await expect(page.getByLabel("Precio de la compraventa (COP)")).toHaveValue(
      String(proyecto.p.precio_desde),
    );
    await expect(
      page.getByText("Viene del anuncio que estabas mirando."),
    ).toBeVisible();
    await expect(
      page.getByText(/Si vende una empresa o una constructora/),
    ).toBeVisible();
    // Editado el precio, ya no «viene del anuncio» (S16).
    await page.getByLabel("Precio de la compraventa (COP)").fill("123000000");
    await expect(
      page.getByText("Viene del anuncio que estabas mirando."),
    ).toHaveCount(0);
  });

  test("la ficha de un anuncio usado manda con el precio del anuncio", async ({
    page,
  }) => {
    const { slug, precio } = await crearAnuncio({ precio: 333_000_000 });
    await page.goto(`/i/${slug}`);
    const enlace = page.getByRole("link", {
      name: "Lo que te cuesta escriturar este",
    });
    await expect(enlace).toHaveAttribute("href", `/papeleo?precio=${precio}`);
    await enlace.click();
    await expect(page.getByLabel("Precio de la compraventa (COP)")).toHaveValue(
      String(precio),
    );
    await expect(total(page, "comprador")).toBeVisible();
  });

  test("un anuncio de arriendo no trae el enlace: el canon de un arriendo no es el precio de una compraventa", async ({
    page,
  }) => {
    const { slug } = await crearAnuncio({
      precio: 2_500_000,
      operacion: "arriendo",
    });
    await page.goto(`/i/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Lo que te cuesta escriturar este" }),
    ).toHaveCount(0);
  });

  test("el enlace de un anuncio usado lleva la ciudad del anuncio: Chía llega como Chía", async ({
    page,
  }) => {
    const a = await crearAnuncio({ precio: 380_000_000 });
    consultar(
      `update public.vendedores set ciudad = 'Chía' where id = (select vendedor_id from public.inmuebles where id = '${a.id}')`,
    );
    await page.goto(`/i/${a.slug}`);
    await expect(
      page.getByRole("link", { name: "Lo que te cuesta escriturar este" }),
    ).toHaveAttribute("href", `/papeleo?precio=${a.precio}&ciudad=chia`);
  });
});
