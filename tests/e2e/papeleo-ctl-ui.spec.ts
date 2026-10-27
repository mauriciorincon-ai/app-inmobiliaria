import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// S15 — el lector de CTL en /papeleo (maqueta 11) POR LA UI, en español. Lo que no puede fallar: lo pegado se queda en el teléfono
// (ninguna petición lo lleva, nada queda guardado, ni siquiera el corrector del navegador lo ve) y la lectura marca lo que dice
// el texto, con su anotación, su vigencia y su norma. Los certificados son SINTÉTICOS (`tests/fixtures/ctl`): «PERSONA A».
// El lector existe solo con LECTOR_CTL_ACTIVO=1 (apagado por omisión; ver `src/lib/ctl-activo.ts`): esta spec lo enciende.

const HOY = "2026-10-25";
const CENTINELA = "CENTINELA-LECTOR-4471";
const FIXTURES = join(process.cwd(), "tests", "fixtures", "ctl");
const certificado = (nombre: string) =>
  readFileSync(join(FIXTURES, `${nombre}.txt`), "utf8");

test.use({ extraHTTPHeaders: { "x-hoy-simulado": HOY } });
test.beforeEach(() => {
  expect(
    process.env.LECTOR_CTL_ACTIVO,
    "esta spec necesita LECTOR_CTL_ACTIVO=1 en el entorno del servidor y de las pruebas",
  ).toBe("1");
  expect(
    process.env.NUEVOS_SIMULACRO,
    "esta spec necesita NUEVOS_SIMULACRO=1 (la fecha de hoy se fija con una cabecera)",
  ).toBe("1");
  test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
});

async function abrirLector(page: Page) {
  await page.goto("/papeleo");
  await page.getByRole("button", { name: "Certificado (CTL)" }).click();
  await expect(
    page.getByRole("heading", { name: "Lee tu certificado de tradición" }),
  ).toBeVisible();
  return page.getByLabel("Texto del certificado");
}

const leer = (page: Page) =>
  page.getByRole("button", { name: "Leer el certificado" }).click();
const marcas = (page: Page) => page.getByTestId("ctl-marca");

test("la quinta sección existe con el interruptor encendido y la cuarta sigue ahí", async ({
  page,
}) => {
  await page.goto("/papeleo");
  const grupo = page.getByRole("group", { name: "Sección" });
  for (const nombre of [
    "Gastos",
    "Documentos",
    "Plazos",
    "Qué dice cada documento",
    "Certificado (CTL)",
  ]) {
    await expect(grupo.getByRole("button", { name: nombre })).toBeVisible();
  }
});

test("marca cada anotación con su vigencia, su norma y lo que conviene hacer", async ({
  page,
}) => {
  const campo = await abrirLector(page);
  await campo.fill(certificado("embargo-y-familia"));
  await leer(page);

  // Tres marcas vigentes, por orden de anotación; la cancelación de la 5 no nombra a quién cancela y por eso no se da nada por cancelado.
  await expect(marcas(page)).toHaveCount(3);
  await expect(marcas(page).nth(0)).toHaveAttribute(
    "data-tipo",
    "vivienda_familiar",
  );
  await expect(marcas(page).nth(1)).toHaveAttribute("data-tipo", "embargo");
  await expect(marcas(page).nth(2)).toHaveAttribute(
    "data-tipo",
    "medida_cautelar",
  );
  for (let i = 0; i < 3; i++) {
    await expect(marcas(page).nth(i)).toHaveAttribute("data-vigente", "si");
  }
  await expect(page.getByTestId("ctl-resultado")).toContainText(
    "Anotaciones leídas: 5 · marcas vigentes: 3 · marcas canceladas: 0",
  );
  await expect(
    page.getByText(
      "La anotación 5 es una cancelación que no dice qué anotación cancela: no damos nada por cancelado.",
    ),
  ).toBeVisible();

  // Una marca vigente trae su anotación, qué es, qué hacer y su norma.
  const familiar = page.locator('[data-tipo="vivienda_familiar"]');
  await expect(familiar).toContainText("Afectación a vivienda familiar");
  await expect(familiar).toContainText("Anotación 2");
  await expect(familiar).toContainText("Que los dos cónyuges firmen");
  await expect(familiar).toContainText("Ley 258 de 1996, art. 3");
  await expect(familiar).toContainText("Vigente");
  const embargo = page.locator('[data-tipo="embargo"]');
  await expect(embargo).toContainText("Código General del Proceso, art. 593");
  await expect(
    page.getByText("no reemplaza a un abogado", { exact: false }),
  ).toBeVisible();
  // Las normas citadas dicen cuándo se leyeron.
  await expect(
    page
      .locator("#pap-ctl")
      .getByText(/leídas en su texto oficial el 25 de octubre de 2026/),
  ).toBeVisible();
});

test("lo vigente va primero y lo cancelado dice qué anotación lo canceló", async ({
  page,
}) => {
  const campo = await abrirLector(page);
  await campo.fill(certificado("hipoteca-cancelada"));
  await leer(page);

  await expect(marcas(page)).toHaveCount(2);
  const vigente = marcas(page).nth(0);
  await expect(vigente).toHaveAttribute("data-tipo", "hipoteca");
  await expect(vigente).toHaveAttribute("data-vigente", "si");
  await expect(vigente).toContainText("Anotación 4");
  const cancelada = marcas(page).nth(1);
  await expect(cancelada).toHaveAttribute("data-vigente", "no");
  await expect(cancelada).toContainText("Anotación 2");
  await expect(cancelada).toContainText("Cancelada");
  await expect(cancelada).toContainText("Cancelada por la anotación 3");
  await expect(cancelada).toContainText("Ley 1579 de 2012, arts. 61, 62 y 63");
  // La cancelada ya no pide hacer nada.
  await expect(cancelada).not.toContainText("Qué hacer");
  await expect(vigente).toContainText("Qué hacer");
  await expect(page.getByTestId("ctl-resultado")).toContainText(
    "marcas vigentes: 1 · marcas canceladas: 1",
  );
});

test("un certificado limpio lo dice, y lo que no entiende lo nombra sin darlo por bueno", async ({
  page,
}) => {
  const campo = await abrirLector(page);
  await campo.fill(certificado("limpio"));
  await leer(page);
  await expect(marcas(page)).toHaveCount(0);
  await expect(
    page.getByText("no encontramos nada de lo que este lector marca"),
  ).toBeVisible();

  // Una anotación sin código y con un acto que el lector no conoce queda como «no reconocida» (con código, el grupo del
  // art. 8 decide). Va ANTES del cierre del certificado, numerada en orden y contada en el total: el texto está completo.
  const extra =
    "ANOTACION: Nro 003 Fecha: 01-09-2026 Radicacion: 2026-000099\nESPECIFICACION: ACTO NUEVO QUE NADIE CONOCE\nDE: PERSONA Z\n\n";
  await campo.fill(
    certificado("limpio")
      .replace("NRO TOTAL", `${extra}NRO TOTAL`)
      .replace(
        "NRO TOTAL DE ANOTACIONES: *2*",
        "NRO TOTAL DE ANOTACIONES: *3*",
      ),
  );
  await leer(page);
  await expect(page.getByTestId("ctl-no-reconocida")).toHaveCount(1);
  // Con una anotación sin entender, el ✓ verde de «no encontramos nada» NO sale: un aviso neutro manda a leerla.
  await expect(
    page.getByText(/pero hay anotaciones que no entendimos/),
  ).toBeVisible();
  await expect(
    page.getByText("no encontramos nada de lo que este lector marca"),
  ).toHaveCount(0);
  await expect(page.getByTestId("ctl-no-reconocida")).toContainText(
    "Anotación 3",
  );
  await expect(page.getByTestId("ctl-incompleto")).toHaveCount(0);
  await expect(
    page.getByText(
      "No sabemos qué dicen: pregúntale al dueño o a un abogado antes de firmar.",
    ),
  ).toBeVisible();
});

test("sin texto o sin anotaciones lo dice; borrar vacía el campo y el resultado", async ({
  page,
}) => {
  const campo = await abrirLector(page);
  await leer(page);
  await expect(page.getByText("Pega el texto para leerlo.")).toBeVisible();
  await campo.fill("esto no es un certificado");
  await leer(page);
  await expect(
    page.getByText(/No encontramos anotaciones en este texto/),
  ).toBeVisible();
  await campo.fill(certificado("hipoteca-cancelada"));
  await leer(page);
  await expect(marcas(page).first()).toBeVisible();
  await page.getByRole("button", { name: "Borrar el texto" }).click();
  await expect(campo).toHaveValue("");
  await expect(marcas(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Borrar el texto" }),
  ).toBeDisabled();
  // Cambiar el texto después de leer retira la lectura vieja: no queda un resultado de otro texto.
  await campo.fill(certificado("embargo-y-familia"));
  await leer(page);
  await expect(marcas(page).first()).toBeVisible();
  await campo.fill(`${certificado("embargo-y-familia")} `);
  await expect(marcas(page)).toHaveCount(0);
});

test("avisa cuánto lleva expedido el certificado y cuándo pasa de 30 días", async ({
  page,
}) => {
  const campo = await abrirLector(page);
  // El sintético trae «Fecha de expedición: 15/10/2026»: 10 días antes del «hoy» fijado.
  await campo.fill(certificado("patrimonio-y-falsa-tradicion"));
  await leer(page);
  await expect(page.getByText("Días desde que se expidió: 10.")).toBeVisible();
  await expect(page.getByText(/Tiene más de 30 días/)).toHaveCount(0);

  await campo.fill(
    certificado("patrimonio-y-falsa-tradicion").replace(
      "15/10/2026",
      "01/09/2026",
    ),
  );
  await leer(page);
  await expect(page.getByText("Días desde que se expidió: 54.")).toBeVisible();
  await expect(
    page.getByText(/Tiene más de 30 días: pide uno reciente/),
  ).toBeVisible();
});

test("lo pegado se queda en el teléfono: ninguna petición lo lleva, nada queda guardado y el corrector no lo ve", async ({
  page,
}) => {
  const salientes: { tipo: string; url: string; cuerpo: string }[] = [];
  page.on("request", (r) =>
    salientes.push({
      tipo: r.resourceType(),
      url: r.url(),
      cuerpo: r.postData() ?? "",
    }),
  );

  await page.goto("/papeleo");
  await expect(page.getByRole("button", { name: "Gastos" })).toBeVisible();
  const texto = `${certificado("embargo-y-familia")}\nDE: PERSONA ${CENTINELA}\n`;
  const antes = salientes.length;
  await page.getByRole("button", { name: "Certificado (CTL)" }).click();
  const campo = page.getByLabel("Texto del certificado");
  await expect(campo).toBeVisible();
  await campo.fill(texto);
  await leer(page);
  await expect(marcas(page).first()).toBeVisible();
  await page.getByRole("button", { name: "Gastos" }).click();
  await page.getByRole("button", { name: "Certificado (CTL)" }).click();
  // Cambiar de pestaña no borra lo pegado (sigue montado), y tampoco lo manda a ningún lado.
  await expect(campo).toHaveValue(texto);

  const desde = salientes.slice(antes);
  const datos = desde.filter(
    (x) => ["fetch", "xhr"].includes(x.tipo) && !/[?&]_rsc=/.test(x.url),
  );
  expect(datos).toEqual([]);
  // Ninguna petición, de ningún tipo, lleva la cadena centinela ni parte del certificado en su URL o cuerpo.
  expect(desde.filter((x) => (x.url + x.cuerpo).includes(CENTINELA))).toEqual(
    [],
  );
  expect(
    desde.filter((x) => /PERSONA(%20|\+| )C/.test(x.url + x.cuerpo)),
  ).toEqual([]);

  // Tampoco queda guardado en el navegador, ni hay un formulario que lo envíe.
  const guardado = await page.evaluate(() =>
    JSON.stringify([
      { ...localStorage },
      { ...sessionStorage },
      document.cookie,
    ]),
  );
  expect(guardado).not.toContain(CENTINELA);
  await expect(page.locator("#pap-ctl form")).toHaveCount(0);
  // Sin corrector ni autocompletado: algunos navegadores mandan lo escrito a su servicio de ortografía.
  await expect(campo).toHaveAttribute("spellcheck", "false");
  await expect(campo).toHaveAttribute("autocomplete", "off");
  await expect(campo).toHaveAttribute("autocorrect", "off");
});

test("accesibilidad y teléfono: sin violaciones con el resultado a la vista y sin scroll horizontal", async ({
  page,
}) => {
  const campo = await abrirLector(page);
  await campo.fill(certificado("embargo-y-familia"));
  await leer(page);
  await expect(marcas(page).first()).toBeVisible();
  await page.addStyleTag({
    content: "*,*::before,*::after{transition:none!important}",
  });
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations).toEqual([]);

  await page.setViewportSize({ width: 360, height: 780 });
  const { ancho, visible } = await page.evaluate(() => ({
    ancho: document.documentElement.scrollWidth,
    visible: document.documentElement.clientWidth,
  }));
  expect(ancho).toBeLessThanOrEqual(visible);
});
