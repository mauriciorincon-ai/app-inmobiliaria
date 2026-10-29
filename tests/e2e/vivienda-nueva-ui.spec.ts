import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { consultar, ejecutar } from "./utils/bd";
import demo from "../../scripts/seed-demo-edicion.json";
import { formatearCOP, formatearM2 } from "../../src/engine/format/cop";
import tarifasJson from "../../src/data/tarifas-escrituracion.json";
import {
  tarifasDelAnio,
  type TarifasEscrituracion,
} from "../../src/engine/vivienda-nueva/escrituracion";
import {
  deFila,
  type FilaProyecto,
} from "../../src/engine/vivienda-nueva/filas";
import { totalEspera } from "../../src/engine/vivienda-nueva/arriendo-local";
import { precioVerdadero } from "../../src/engine/vivienda-nueva/precio-verdadero";
import {
  PAGINA_NUEVOS,
  vistaIndice,
  vistaLista,
  vistaProyecto,
  type ProyectoPublicado,
} from "../../src/engine/vivienda-nueva/vista";

// S12 «Nuevos, con lo que pagas de verdad» POR LA UI, en español (el inglés se prueba al cierre del hito): «Usados |
// Nuevos» en Buscar, el índice, la ficha con «pagas al menos», la fuente y la ficha honesta, «lo que puedes pagar»,
// «mes sin edición» y que el arriendo de «la espera» NO viaje en ninguna petición. Datos 100 % sintéticos.
//
// La edición (nº 9500, nombres ficticios) se carga por SQL y se publica con su muestra. Para no pisar a otras specs ni al
// reloj real, su ventana está en 2035 y TODAS las peticiones llevan `x-hoy-simulado` (que el servidor solo honra con
// NUEVOS_SIMULACRO=1, como la CI): ve esta edición y ninguna otra. Las entregas del archivo de demostración se corren 8
// años para que «la espera» siga teniendo meses por contar.

const NUMERO = 9500;
const DESDE = "2035-01-15";
const HASTA = "2035-02-15";
const HOY = "2035-01-20";
const DESPUES = "2035-03-01"; // 14 días después de la vigencia
const SALTO = 8;

const tarifas = tarifasJson as unknown as TarifasEscrituracion;
const filas = (demo.proyectos as unknown as FilaProyecto[]).map((f) => ({
  ...f,
  entrega: /^\d{4}-\d{2}$/.test(f.entrega)
    ? `${Number(f.entrega.slice(0, 4)) + SALTO}${f.entrega.slice(4)}`
    : f.entrega,
}));
const proyectos: ProyectoPublicado[] = filas.map((f) => ({
  ...deFila(f),
  slug: f.slug,
}));
const muestra = filas.slice(0, 5).map((f) => f.clave);

function cargarYPublicar() {
  const edicion = {
    numero: NUMERO,
    nombre: demo.nombre,
    desde: DESDE,
    hasta: HASTA,
    paginas: demo.paginas,
    muestra_claves: muestra,
    muestra_semilla: NUMERO,
    proyectos: filas,
  };
  ejecutar(
    `select public.cargar_edicion($j$${JSON.stringify(edicion)}$j$::jsonb)`,
  );
  const lista = muestra.map((m) => `'${m}'`).join(", ");
  ejecutar(
    `select public.publicar_edicion(${NUMERO}, array[${lista}]::text[])`,
  );
}
const limpiar = () =>
  consultar(`delete from public.ediciones where numero = ${NUMERO}`);

const sinViolaciones = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations).toEqual([]);
};

const alMenosDe = (slug: string) => {
  const p = proyectos.find((x) => x.slug === slug)!;
  // Las tarifas de SU año, como la página: en 2035 ninguna está verificada (regla 23; S16).
  const pv = precioVerdadero(p, tarifasDelAnio(tarifas, HOY));
  if (pv.estado !== "calculado") throw new Error("debía calcular");
  return pv;
};

test.describe.configure({ mode: "serial" });
test.use({ extraHTTPHeaders: { "x-hoy-simulado": HOY } });

test.beforeEach(() => {
  test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
});
test.beforeAll(() => {
  // La cabecera `x-hoy-simulado` solo se honra con NUEVOS_SIMULACRO=1 en el servidor (y aquí, para que no se olvide).
  expect(
    process.env.NUEVOS_SIMULACRO,
    "esta spec necesita NUEVOS_SIMULACRO=1 en el entorno del servidor y de las pruebas",
  ).toBe("1");
  limpiar();
  cargarYPublicar();
});
test.afterAll(limpiar);

test("«Usados | Nuevos» vive dentro de Buscar y la barra del comprador sigue en cuatro", async ({
  page,
}) => {
  await page.goto("/buscar");
  const pestanas = page.getByRole("navigation", { name: "Usados o nuevos" });
  await expect(pestanas.getByRole("link", { name: "Usados" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await pestanas.getByRole("link", { name: "Nuevos" }).click();
  await expect(page).toHaveURL(/\/buscar\?v=nuevos$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Vivienda nueva en Bogotá y la Sabana",
    }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Usados o nuevos" })
      .getByRole("link", { name: "Nuevos" }),
  ).toHaveAttribute("aria-current", "true");
  // La fuente va en la pantalla, con el número de la edición.
  await expect(
    page.getByText(`Fuente: Estrenar Vivienda, edición ${NUMERO}`),
  ).toBeVisible();
  // Buscar sigue siendo la sección activa y la barra sigue en cuatro.
  const barra = page
    .getByRole("navigation", { name: "Secciones del comprador" })
    .first();
  await expect(barra.getByRole("link")).toHaveCount(4);
  await expect(barra.getByRole("link", { name: "Buscar" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // El tope de un arriendo es una renta mensual: no viaja a «Nuevos» como si fuera un precio de compra.
  await page.goto("/buscar?op=arriendo&max=3000000");
  await expect(
    page
      .getByRole("navigation", { name: "Usados o nuevos" })
      .getByRole("link", { name: "Nuevos" }),
  ).toHaveAttribute("href", "/buscar?v=nuevos");
  await page.goto("/buscar?op=venta&max=300000000&pago=1");
  await expect(
    page
      .getByRole("navigation", { name: "Usados o nuevos" })
      .getByRole("link", { name: "Nuevos" }),
  ).toHaveAttribute("href", "/buscar?v=nuevos&max=300000000&pago=1");
  // De vuelta a los usados.
  await page.goto("/buscar?v=nuevos");
  await page
    .getByRole("navigation", { name: "Usados o nuevos" })
    .getByRole("link", { name: "Usados" })
    .click();
  await expect(page).toHaveURL(/\/buscar$/);
});

test("el índice es el del motor: Suba con 5 proyectos tiene mediana, Kennedy con 4 dice «sin datos suficientes»", async ({
  page,
}) => {
  const indice = vistaIndice(proyectos, tarifas);
  const suba = indice.porZona.find((g) => g.clave === "bogota:Suba")!;
  const kennedy = indice.porZona.find((g) => g.clave === "bogota:Kennedy")!;
  if (suba.estado !== "mediana") throw new Error("Suba debía tener mediana");
  expect(kennedy.estado).toBe("sin_datos");
  expect(kennedy.n).toBe(4);

  await page.goto("/buscar?v=nuevos");
  await page.getByText("Por zona, franja de precio y segmento").click();
  const zona = (nombre: string) =>
    page
      .getByRole("table", { name: "Zona" })
      .getByRole("row")
      .filter({
        has: page.getByRole("rowheader", { name: nombre, exact: true }),
      });
  await expect(zona("Suba")).toContainText(formatearM2(suba.medianaM2, "es"));
  await expect(zona("Suba")).toContainText("mediana de 5");
  await expect(zona("Kennedy")).toContainText("Sin datos suficientes");
  await expect(zona("Kennedy")).toContainText("hacen falta 5");
  // El proyecto con las páginas en conflicto se nombra, no entra a la mediana.
  await expect(zona("Suba")).toContainText(
    "1 proyecto con cifras en conflicto",
  );
  await sinViolaciones(page);
});

test("una tarjeta abre la ficha: «pagas al menos» del motor con las tarifas de su año, la fuente y la ficha honesta", async ({
  page,
}) => {
  const pv = alMenosDe("torre-alba-ficticia");
  await page.goto("/buscar?v=nuevos");
  await page.getByRole("link", { name: "Torre Alba Ficticia" }).click();
  await expect(page).toHaveURL(/\/nuevos\/torre-alba-ficticia$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Torre Alba Ficticia" }),
  ).toBeVisible();
  // La fuente con las páginas donde aparece.
  await expect(
    page.getByText(`Fuente: Estrenar Vivienda, edición ${NUMERO}, p. 4 y 12`),
  ).toBeVisible();
  // «Pagas al menos» tal como lo calcula el motor. La ventana de esta spec está en 2035 y las tarifas son de 2026: el registro y
  // la notaría se NOMBRAN sin monto, y la nota de la VIS («se sumó con la mitad») no sale porque no se sumó nada (S16). Cada
  // peso con su norma, en un año con tarifas, lo prueba la ficha de `papeleo-ui` (junio de 2026).
  await expect(
    page.getByText(formatearCOP(pv.alMenos, "es"), { exact: true }),
  ).toBeVisible();
  for (const partida of pv.partidas) {
    await expect(
      page.getByText(formatearCOP(partida.monto, "es"), { exact: true }),
    ).toBeVisible();
  }
  expect(pv.partidas.map((x) => x.id)).toEqual(["precio_desde", "parqueadero"]);
  await expect(
    page.getByText(
      "Derechos de registro: no pudimos verificar la tarifa en la norma, no se suman.",
    ),
  ).toBeVisible();
  await expect(page.getByText(/el registro se sumó con la mitad/)).toHaveCount(
    0,
  );
  await expect(page.getByText(/Resolución 2026-001726-6/)).toHaveCount(0);
  await expect(
    page.getByText(
      "Impuesto de registro (la gente lo llama «beneficencia»): se reparte entre comprador y vendedor y no se suma aquí.",
    ),
  ).toBeVisible();
  // El m² es aproximado y lo dice.
  await expect(
    page.getByText(/m² aproximado: .* por m² privado/),
  ).toBeVisible();
  // La ficha honesta: este proyecto dice los 9 datos.
  await expect(
    page.getByText("El aviso dice 9 de 9 datos que necesitas para decidir"),
  ).toBeVisible();
  // Se llega por navegación cliente (Link): en `next dev` el <title> de generateMetadata se aplica con retraso.
  await expect(page).toHaveTitle(
    /Torre Alba Ficticia — vivienda nueva — Innmobiliaria/,
  );
  await sinViolaciones(page);
});

test("el que más calla: la ficha lo nombra campo por campo y la espera dice que no se puede calcular", async ({
  page,
}) => {
  await page.goto("/nuevos/silencio-ficticio");
  await expect(
    page.getByText("El aviso dice 1 de 9 datos que necesitas para decidir"),
  ).toBeVisible();
  const fila = page
    .getByRole("table", { name: "La ficha honesta" })
    .getByRole("row", { name: /Fecha de entrega/ });
  await expect(fila).toContainText("No lo dice");
  await expect(
    page.getByText(
      "El aviso no dice cuándo entregan: la espera no se puede calcular",
    ),
  ).toBeVisible();
  await sinViolaciones(page);
});

test("dos páginas imprimen precios distintos: no se elige uno, se nombra y no hay «pagas al menos»", async ({
  page,
}) => {
  await page.goto("/nuevos/dilema-ficticio");
  await expect(
    page.getByText("Dos páginas de la revista imprimen precios distintos"),
  ).toBeVisible();
  await expect(page.getByText("Pagas al menos")).toHaveCount(0);
  await expect(
    page
      .getByRole("table", { name: "La ficha honesta" })
      .getByRole("row", { name: /Precio desde/ }),
  ).toContainText("Dos páginas imprimen cifras distintas");
  await expect(
    page.getByText(/m² aproximado: no hay, porque dos páginas/),
  ).toBeVisible();
});

test("«lo que puedes pagar» filtra los nuevos por el precio verdadero y rotula de dónde sale el tope", async ({
  page,
}) => {
  const tope = 280_000_000;
  await page.goto(`/buscar?v=nuevos&max=${tope}&pago=1`);
  await expect(
    page.getByText(`Lo que puedes pagar: ${formatearCOP(tope, "es")}`),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Tus ingresos no salen de tu teléfono: solo viaja este tope.",
    ),
  ).toBeVisible();
  // Lo que cabe y lo que no lo decide el motor con el precio VERDADERO, no el «desde» del aviso.
  const lista = vistaLista(proyectos, tarifas, { max: tope, pago: true });
  expect(lista.fuera.map((t) => t.slug)).toContain("atico-ficticio");
  expect(lista.dentro.map((t) => t.slug)).toContain("torre-alba-ficticia");
  const visibles = [...lista.dentro, ...lista.fuera, ...lista.sinPrecio].slice(
    0,
    PAGINA_NUEVOS,
  );
  const esperadosFuera = visibles
    .filter((v) => lista.fuera.some((f) => f.slug === v.slug))
    .map((v) => String(v.nombre));
  const fuera = page.getByRole("heading", {
    level: 3,
    name: "Fuera de lo que puedes pagar",
  });
  await expect(fuera).toBeVisible();
  const grupoFuera = fuera.locator("xpath=..");
  await expect(grupoFuera.getByRole("heading", { level: 3 })).toHaveCount(
    esperadosFuera.length + 1,
  );
  for (const nombre of esperadosFuera) {
    await expect(grupoFuera.getByRole("link", { name: nombre })).toBeVisible();
  }
  await expect(
    page.getByText(
      `${lista.dentro.length} caben · ${lista.fuera.length} no caben · ${lista.sinPrecio.length} sin precio en el aviso`,
    ),
  ).toBeVisible();
  // La ficha del Ático conserva el tope y dice cuánto falta.
  await page.goto(`/nuevos/atico-ficticio?max=${tope}`);
  const pv = alMenosDe("atico-ficticio");
  await expect(
    page.getByText(
      `Pagas al menos ${formatearCOP(pv.alMenos, "es")} y lo que puedes pagar es ${formatearCOP(tope, "es")}: faltan ${formatearCOP(pv.alMenos - tope, "es")}`,
    ),
  ).toBeVisible();
  await sinViolaciones(page);
});

test("«ver más» es un enlace y los filtros se aplican sin JavaScript", async ({
  browser,
  baseURL,
}) => {
  const contexto = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    locale: "es-CO",
    extraHTTPHeaders: { "x-hoy-simulado": HOY },
  });
  const sinJs = await contexto.newPage();
  await sinJs.goto("/buscar?v=nuevos");
  // 15 proyectos, 12 por página: hay un enlace que trae el resto.
  await expect(
    sinJs.getByRole("link", { name: /Ver más proyectos \(3 más\)/ }),
  ).toBeVisible();
  await sinJs.getByRole("link", { name: /Ver más proyectos/ }).click();
  await expect(sinJs).toHaveURL(/pag=2/);
  await expect(sinJs.getByRole("link", { name: "Ya Ficticio" })).toBeVisible();
  // Filtrar por lugar con el formulario GET.
  await sinJs.goto("/buscar?v=nuevos&lugar=bogota:Kennedy");
  await expect(sinJs.getByText("4 proyectos", { exact: true })).toBeVisible();
  await expect(
    sinJs.getByRole("link", { name: "Cedro Ficticio" }),
  ).toBeVisible();
  await expect(
    sinJs.getByRole("link", { name: "Torre Alba Ficticia" }),
  ).toHaveCount(0);
  await contexto.close();
});

test("«mes sin edición»: pasada la vigencia, la pantalla lo dice con los días y no presenta la edición como de hoy", async ({
  browser,
  baseURL,
}) => {
  const contexto = await browser.newContext({
    baseURL,
    locale: "es-CO",
    extraHTTPHeaders: { "x-hoy-simulado": DESPUES },
  });
  const page = await contexto.newPage();
  await page.goto("/buscar?v=nuevos");
  await expect(page.getByText("Mes sin edición")).toBeVisible();
  await expect(
    page.getByText(`Lo que ves es la ${NUMERO}, que venció hace 14 días`),
  ).toBeVisible();
  // La ficha también avisa.
  await page.goto("/nuevos/torre-alba-ficticia");
  await expect(page.getByText("Mes sin edición")).toBeVisible();
  await sinViolaciones(page);
  await contexto.close();
});

test("un proyecto que no existe, o un slug que no es válido, da 404", async ({
  page,
}) => {
  const r = await page.goto("/nuevos/no-existe-este-proyecto");
  expect(r?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Ese proyecto no está en la edición" }),
  ).toBeVisible();
  const mala = await page.goto("/nuevos/UN_SLUG_CON_MAYÚSCULAS");
  expect(mala?.status()).toBe(404);
});

test("la espera: el arriendo se escribe, se guarda SOLO en el teléfono y NINGUNA petición lo lleva", async ({
  page,
  context,
}) => {
  const ARRIENDO = 1_847_321; // un número que nada más en la app puede contener
  const p = proyectos.find((x) => x.slug === "torre-alba-ficticia")!;
  const meses = vistaProyecto(proyectos, p.slug, tarifas, HOY)!.espera;
  if (meses.estado !== "calculada") throw new Error("debía calcular");
  const total = totalEspera(meses.meses, ARRIENDO);

  // Todo lo que sale del navegador: URL, cuerpo y cabeceras. El arriendo y el total no pueden estar en ninguna.
  const peticiones: string[] = [];
  context.on("request", (req) => {
    peticiones.push(
      `${req.method()} ${req.url()} ${req.postData() ?? ""} ${JSON.stringify(req.headers())}`,
    );
  });

  await page.goto("/nuevos/torre-alba-ficticia");
  await expect(
    page.getByText(new RegExp(`${meses.meses} meses hasta la entrega`)),
  ).toBeVisible();
  const campo = page.getByLabel("Tu arriendo mensual (COP)");
  await expect(campo).toBeVisible();
  await campo.fill(String(ARRIENDO));
  await expect(
    page.getByText(
      `Con ese arriendo, la espera te cuesta ${formatearCOP(total, "es")}.`,
    ),
  ).toBeVisible();
  await expect(page.getByText("Guardado solo en este teléfono.")).toBeVisible();
  // Un valor que no sirve no se guarda y se dice.
  await campo.fill("mucho");
  await expect(page.getByText("Escribe el arriendo en pesos")).toBeVisible();
  await campo.fill(String(ARRIENDO));

  // Recuerda en ESTE teléfono (localStorage) y vuelve al recargar.
  expect(
    JSON.parse(
      (await page.evaluate(() => localStorage.getItem("inn:arriendo:v1"))) ??
        "null",
    ),
  ).toEqual({ arriendo: ARRIENDO });
  await page.reload();
  await expect(page.getByLabel("Tu arriendo mensual (COP)")).toHaveValue(
    formatearCOP(ARRIENDO, "es"),
  );
  await expect(
    page.getByText(
      `Con ese arriendo, la espera te cuesta ${formatearCOP(total, "es")}.`,
    ),
  ).toBeVisible();
  await sinViolaciones(page);

  // Se puede borrar.
  await page
    .getByRole("button", { name: "Borrar mi arriendo de este teléfono" })
    .click();
  await expect(page.getByLabel("Tu arriendo mensual (COP)")).toHaveValue("");
  expect(
    await page.evaluate(() => localStorage.getItem("inn:arriendo:v1")),
  ).toBeNull();

  // Ninguna petición de todo el recorrido llevó el arriendo ni el total (ni en la URL, ni en el cuerpo, ni en las cabeceras).
  expect(peticiones.length).toBeGreaterThan(3);
  const miles = (n: number) => n.toLocaleString("es-CO");
  const conArriendo = peticiones.filter((r) =>
    [
      String(ARRIENDO),
      miles(ARRIENDO),
      String(total),
      miles(total),
      encodeURIComponent(miles(ARRIENDO)),
    ].some((s) => r.includes(s)),
  );
  expect(conArriendo).toEqual([]);
});

test("en inglés: la lista y la ficha salen redactadas en inglés, con la fuente y las cifras del motor", async ({
  browser,
  baseURL,
}) => {
  const contexto = await browser.newContext({
    baseURL,
    locale: "en-US",
    extraHTTPHeaders: { "x-hoy-simulado": HOY },
  });
  await contexto.addCookies([{ name: "idioma", value: "en", url: baseURL! }]);
  const page = await contexto.newPage();
  await page.goto("/buscar?v=nuevos");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "New homes in Bogotá and the savanna",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(`Source: Estrenar Vivienda, edition ${NUMERO}`),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Resale or new" }),
  ).toBeVisible();
  const pv = alMenosDe("torre-alba-ficticia");
  await page.goto("/nuevos/torre-alba-ficticia");
  await expect(page.getByText("You pay at least").first()).toBeVisible();
  await expect(
    page.getByText(formatearCOP(pv.alMenos, "en"), { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(`Source: Estrenar Vivienda, edition ${NUMERO}, p. 4 and 12`),
  ).toBeVisible();
  await expect(page.getByText("The honest sheet").first()).toBeVisible();
  await contexto.close();
});

test("en el teléfono la lista y la ficha no se salen de la pantalla", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const ruta of ["/buscar?v=nuevos", "/nuevos/torre-alba-ficticia"]) {
    await page.goto(ruta);
    const [ancho, visible] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      window.innerWidth,
    ]);
    expect(ancho, ruta).toBeLessThanOrEqual(visible);
  }
});
