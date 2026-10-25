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
import { HOGARES_EJEMPLO } from "../../src/engine/vivienda-nueva/te-alcanza";

// S13 «Nuevo o usado, con la misma plata» — las pantallas 03 (¿Nuevo o usado?) y 04 (¿Te alcanza con subsidio?) POR LA UI, en
// español (el inglés se prueba al cierre del hito). La edición (nº 9510, nombres ficticios) se carga por SQL y se publica con su
// muestra; su ventana está en 2037 (la de la spec de S12 está en 2035: así ninguna es candidata a «la última publicada» de la otra) y TODAS las peticiones llevan `x-hoy-simulado` (el servidor solo la honra con
// NUEVOS_SIMULACRO=1). Los usados son anuncios sintéticos creados por la RPC pública. Datos 100 % sintéticos.

const NUMERO = 9510;
const DESDE = "2037-01-15";
const HASTA = "2037-02-15";
const HOY = "2037-01-20";
const DESPUES = "2037-03-01"; // 14 días después de la vigencia
const SALTO = 8;

const filas = (demo.proyectos as unknown as FilaProyecto[]).map((f) => ({
  ...f,
  entrega: /^\d{4}-\d{2}$/.test(f.entrega)
    ? `${Number(f.entrega.slice(0, 4)) + SALTO}${f.entrega.slice(4)}`
    : f.entrega,
}));
const apartamentosBogota = filas
  .map((f) => ({ ...deFila(f), slug: f.slug }))
  .filter((p) => p.region === "bogota" && p.tipo === "apartamento");
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
  // Sin transiciones: axe mediría un color a medio camino de un hover y daría un contraste falso.
  await page.addStyleTag({
    content: "*,*::before,*::after{transition:none!important}",
  });
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations).toEqual([]);
};

test.describe.configure({ mode: "serial" });
test.use({ extraHTTPHeaders: { "x-hoy-simulado": HOY } });

test.beforeEach(() => {
  test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
});
test.beforeAll(async () => {
  expect(
    process.env.NUEVOS_SIMULACRO,
    "esta spec necesita NUEVOS_SIMULACRO=1 en el entorno del servidor y de las pruebas",
  ).toBe("1");
  limpiar();
  cargarYPublicar();
  // Seis usados de venta (apartamentos de 78 m²) con precios distintos y bajos: entran a «lo que cabe» de un presupuesto alto
  // y quedan FUERA de uno bajo. El resto de la base (de otras specs) también cuenta: por eso se afirman estados, no conteos.
  for (let i = 0; i < 6; i++) {
    await crearAnuncio({ precio: 200_000_000 + i * 15_000_000 });
  }
});
test.afterAll(limpiar);

test("¿Nuevo o usado? con presupuesto alto: lo nuevo que cabe frente a los usados, con su fuente y su veredicto", async ({
  page,
}) => {
  await page.goto("/nuevo-o-usado?zona=bogota&max=900000000");
  await expect(
    page.getByRole("heading", { level: 1, name: "¿Nuevo o usado?" }),
  ).toBeVisible();
  await expect(
    page.getByText("Fuente: Estrenar Vivienda, edición 9510").first(),
  ).toBeVisible();
  await expect(page.getByText("Tu presupuesto: $900.000.000")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Apartamentos nuevos que caben",
      exact: true,
    }),
  ).toBeVisible();
  // Hay usados de sobra: se comparan, con la fuente y la fecha de los anuncios.
  await expect(
    page.getByRole("heading", { name: "Usados en venta en Innmobiliaria" }),
  ).toBeVisible();
  await expect(page.getByText(/m² mediano: \$/)).toBeVisible();
  await expect(page.getByText(/La mitad entre/)).toBeVisible();
  await expect(
    page.getByText(/Anuncios vivos en Innmobiliaria al /),
  ).toBeVisible();
  await expect(
    page.getByText(/Estrenar cuesta (\d+ % (más|menos)|lo mismo) por m²/),
  ).toBeVisible();
  await expect(page.getByText("No hay comparación honesta")).toHaveCount(0);

  // Cada apartamento nuevo que cabe es una tarjeta de la ficha, con su espera dicha.
  const lista = page.getByRole("list").filter({ hasText: "Pagas al menos" });
  await expect(lista.getByRole("listitem").first()).toBeVisible();
  const caben = await lista.getByRole("listitem").count();
  expect(caben).toBeGreaterThan(0);
  expect(caben).toBeLessThanOrEqual(apartamentosBogota.length);
  await expect(
    page.getByText(/Espera: \d+ meses hasta la entrega/).first(),
  ).toBeVisible();
  // Lo que el aviso calla no se inventa.
  await expect(
    page.getByText(/no la imprime la revista y no se inventa/),
  ).toBeVisible();
  await sinViolaciones(page);
});

// La base local se comparte entre specs: no se sabe cuántos usados hay. Un presupuesto justo debajo del TERCER usado más barato
// deja a lo sumo 2 dentro (menos de 5 por construcción), pase lo que pase con los anuncios de otras pruebas.
function presupuestoConMenosDeCinco(): number {
  const precios = consultar(
    `select (x->>'precio_esperado')::bigint from jsonb_array_elements(public.usados_para_comparar('venta', 'apartamento')) x order by 1`,
  ).map(Number);
  return precios.length >= 3 ? precios[2] - 1 : 1_000_000;
}

test("¿Nuevo o usado? con menos de 5 usados comparables NO compara: lo dice", async ({
  page,
}) => {
  const max = presupuestoConMenosDeCinco();
  await page.goto(`/nuevo-o-usado?zona=bogota&max=${max}`);
  await expect(page.getByText("Sin datos suficientes")).toBeVisible();
  await expect(
    page.getByText(
      /Hay \d+ usados en tu presupuesto y zona; hacen falta 5 para comparar\./,
    ),
  ).toBeVisible();
  await expect(page.getByText("No hay comparación honesta")).toBeVisible();
  await expect(page.getByText(/Estrenar cuesta/)).toHaveCount(0);
  await sinViolaciones(page);
});

test("¿Nuevo o usado? en la Sabana dice que no hay usados (Innmobiliaria publica solo en Bogotá); sin presupuesto pide calcularlo", async ({
  page,
}) => {
  await page.goto("/nuevo-o-usado?zona=sabana&max=900000000");
  await expect(
    page.getByText(
      /Innmobiliaria publica solo en Bogotá: en la Sabana no hay usados/,
    ),
  ).toBeVisible();
  await expect(page.getByText("No hay comparación honesta")).toBeVisible();

  await page.goto("/nuevo-o-usado");
  await expect(page.getByText("Falta tu presupuesto")).toBeVisible();
  await page.getByRole("link", { name: "Calcular lo que puedo pagar" }).click();
  await expect(page).toHaveURL(/\/herramientas$/);
});

test("¿Nuevo o usado? llega desde la pestaña «Nuevos» y desde la ficha, y conserva el tope", async ({
  page,
}) => {
  await page.goto("/buscar?v=nuevos&max=450000000");
  await page.getByRole("link", { name: "¿Nuevo o usado?" }).first().click();
  await expect(page).toHaveURL(/\/nuevo-o-usado\?zona=bogota&max=450000000$/);
  await expect(page.getByText("Tu presupuesto: $450.000.000")).toBeVisible();

  await page.goto("/nuevos/torre-alba-ficticia?max=450000000");
  await page.getByRole("link", { name: "¿Nuevo o usado?" }).click();
  await expect(page).toHaveURL(/\/nuevo-o-usado\?zona=bogota&max=450000000$/);
});

test("¿Te alcanza con subsidio?: tres hogares, programas con su norma y su fecha, lo sin cupos se dice, lo no verificado solo se nombra", async ({
  page,
}) => {
  await page.goto("/te-alcanza");
  await expect(
    page.getByRole("heading", { level: 1, name: "¿Te alcanza con subsidio?" }),
  ).toBeVisible();
  await expect(
    page.getByText("Fuente: Estrenar Vivienda, edición 9510"),
  ).toBeVisible();
  // Los tres hogares de ejemplo, del motor.
  const hogares = page.getByRole("navigation", { name: "Hogar de ejemplo" });
  for (const ingresos of HOGARES_EJEMPLO) {
    await expect(
      hogares.getByRole("link", {
        name: `Hogar de ${formatearCOP(ingresos, "es")}`,
      }),
    ).toBeVisible();
  }
  await expect(page.getByText("Sin subsidio te alcanzan")).toBeVisible();
  await expect(page.getByText("Con el mejor caso de subsidio")).toBeVisible();
  await expect(page.getByText(/no se suman programas entre sí/)).toBeVisible();

  // Los programas: nombre, norma, monto, lo que dicen para el hogar y la fecha de su estado.
  const tabla = page.getByRole("table");
  await expect(tabla).toContainText("Decreto Distrital 653 de 2025");
  await expect(tabla).toContainText("Resolución 836 de 2025");
  await expect(tabla).toContainText(/estado al \d{1,2} \p{L}+\.? \d{4}/u);
  await expect(tabla).toContainText("Oferta Preferente");
  // El nacional sigue SIN cupos: se dice y no suma.
  const nacional = tabla
    .getByRole("row")
    .filter({ hasText: "Decreto 1077 de 2015" });
  await expect(nacional).toContainText("Sin cupos");
  await expect(nacional).toContainText("Sin cupos a la fecha de la fuente");
  // «Reduce tu cuota» alivia la cuota, no el precio.
  await expect(
    tabla
      .getByRole("row")
      .filter({ hasText: "Reduce tu cuota" })
      .getByText("Alivia la cuota después, no el precio"),
  ).toBeVisible();
  // Lo no verificado: solo el nombre, nunca un monto.
  await expect(page.getByText("Lo que no mostramos")).toBeVisible();
  await expect(
    page.getByText(/no los pudimos verificar en la fuente primaria/),
  ).toBeVisible();
  await sinViolaciones(page);

  // El hogar de $8 M pasa el tope de ingresos de los programas de Bogotá.
  await hogares.getByRole("link", { name: "Hogar de $8.000.000" }).click();
  await expect(page).toHaveURL(/\/te-alcanza\?h=2$/);
  await expect(
    page.getByText("Tus ingresos pasan el tope del programa").first(),
  ).toBeVisible();
  await expect(page.getByText("No aplica").first()).toBeVisible();
  await sinViolaciones(page);
});

test("«Tu hogar» se calcula en el teléfono con lo que guardó «lo que puedes pagar» y NINGUNA petición lleva los ingresos", async ({
  page,
  context,
}) => {
  const INGRESOS = 5_432_187; // un número que nada más en la app puede contener
  const peticiones: string[] = [];
  context.on("request", (req) => {
    peticiones.push(
      `${req.method()} ${req.url()} ${req.postData() ?? ""} ${JSON.stringify(req.headers())}`,
    );
  });

  // Sin nada guardado: invita a calcularlo.
  await page.goto("/te-alcanza");
  await expect(page.getByRole("heading", { name: "Tu hogar" })).toBeVisible();
  await expect(
    page.getByText(/Calcula lo que puedes pagar y aquí verás tus números/),
  ).toBeVisible();

  // Con lo guardado por el simulador (solo en este teléfono): los mismos números del motor, en la isla.
  await page.evaluate((ingresos) => {
    localStorage.setItem(
      "inn:capacidad:v1",
      JSON.stringify({ ingresos, inicial: 0.3, plazoAnos: 20, tasaEA: null }),
    );
  }, INGRESOS);
  await page.reload();
  const isla = page.getByRole("region", { name: "Tu hogar" });
  await expect(
    isla.getByText(/Con \$5\.432\.187 al mes|Hogar de ejemplo/).first(),
  ).toBeVisible();
  await expect(isla.getByText(/puedes pagar hasta \$/)).toBeVisible();
  await expect(isla.getByText("Sin subsidio te alcanzan")).toBeVisible();
  await expect(isla.getByRole("table")).toBeVisible();
  await expect(
    isla.getByText(/ninguna petición lleva tus ingresos/),
  ).toBeVisible();
  await sinViolaciones(page);

  // Se puede cambiar o borrar desde el simulador; aquí solo comprobamos que lo borrado vuelve a invitar.
  await page.evaluate(() => localStorage.removeItem("inn:capacidad:v1"));
  await page.reload();
  await expect(isla.getByText(/Calcula lo que puedes pagar/)).toBeVisible();

  // Ninguna petición del recorrido llevó los ingresos (ni en la URL, ni en el cuerpo, ni en las cabeceras).
  expect(peticiones.length).toBeGreaterThan(3);
  const miles = (n: number) => n.toLocaleString("es-CO");
  const conIngresos = peticiones.filter((r) =>
    [
      String(INGRESOS),
      miles(INGRESOS),
      encodeURIComponent(miles(INGRESOS)),
    ].some((s) => r.includes(s)),
  );
  expect(conIngresos).toEqual([]);
});

test("con la edición vencida: «mes sin edición» en las pantallas 03 y 04", async ({
  browser,
}) => {
  const contexto = await browser.newContext({
    extraHTTPHeaders: { "x-hoy-simulado": DESPUES },
  });
  const page = await contexto.newPage();
  for (const ruta of ["/nuevo-o-usado?max=900000000", "/te-alcanza"]) {
    await page.goto(ruta);
    await expect(page.getByText("Mes sin edición")).toBeVisible();
    await expect(page.getByText(/venció hace 14 días/)).toBeVisible();
  }
  await contexto.close();
});
