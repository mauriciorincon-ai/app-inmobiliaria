import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { conContactoPublico, crearAnuncio } from "./utils/anuncios";
import { cookieCompradorVerificado } from "./utils/comprador";
import { enIdioma, rellenar } from "../../src/i18n/textos";
import { FICHA } from "../../src/textos/ficha";
import { VISITA } from "../../src/textos/visita";
import { GUARDADOS } from "../../src/textos/guardados";
import { ALERTAS } from "../../src/textos/alertas";
import { ANTIFRAUDE } from "../../src/textos/antifraude";
import { OPERADOR } from "../../src/textos/operador";

// S16 — el segundo idioma, por flujo (regla 20: los e2e y las capturas en UN idioma por sprint y el otro al cierre del hito). Un
// recorrido por flujo con el texto LEÍDO DEL DICCIONARIO `{es, en}` (no reescrito a mano) y axe: la ficha, el contacto, la visita, lo
// guardado y las alertas, reportar, y las pantallas del operador. Publicar, buscar, vivienda nueva, papeleo y el lector ya tienen su
// prueba en inglés en su propia spec. Lo que cubre: que cada pantalla salga en inglés, con el texto del diccionario y sin violaciones
// de accesibilidad. Lo que no cubre: el fraseo (eso es juicio tuyo, bloque S de la guía) ni el inglés de los correos.

test.use({ locale: "en-US" });

const F = enIdioma(FICHA, "en");
const V = enIdioma(VISITA, "en");
const G = enIdioma(GUARDADOS, "en");
const A = enIdioma(ALERTAS, "en");
const AF = enIdioma(ANTIFRAUDE, "en");
const O = enIdioma(OPERADOR, "en");
const CORREO = "comprador.en@ejemplo.test";

const sinViolaciones = async (page: Page) => {
  await page.addStyleTag({
    content: "*,*::before,*::after{transition:none!important}",
  });
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  // Con el selector del nodo en el mensaje: «contraste insuficiente» sin saber dónde no se arregla.
  expect(
    violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
    ),
    page.url(),
  ).toEqual([]);
};

const sembrar = (page: Page, sesion: string) =>
  page
    .context()
    .addCookies([
      { name: "inn_comprador", value: sesion, domain: "localhost", path: "/" },
    ]);

test.beforeEach(async ({ page }) => {
  // Nada sale a internet: wa.me responde vacío.
  await page.context().route("https://wa.me/**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html></html>",
    }),
  );
});

test("la ficha sale en inglés: encabezado, sello, «vivo», precio en COP y sin violaciones", async ({
  page,
}) => {
  const a = await crearAnuncio({ barrio: "Los Rosales" });
  await page.goto(`/i/${a.slug}`);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "in Los Rosales",
  );
  await expect(page.getByText(F.sello.fundador).first()).toBeVisible();
  await expect(page.getByText(F.vivo.hoy)).toBeVisible();
  await expect(
    page.getByText(`COP ${a.precio.toLocaleString("en-US")}`).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: F.compartir.boton }),
  ).toBeVisible();
  await sinViolaciones(page);
});

test("contactar: sin verificar pide verificar el WhatsApp; verificado abre el mensaje", async ({
  page,
}) => {
  const a = await crearAnuncio({});
  conContactoPublico(a);
  await page.goto(`/i/${a.slug}`);
  await page.getByRole("button", { name: F.contacto.boton }).click();
  await expect(
    page.getByRole("heading", { name: F.contacto.pedir.titulo }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: F.contacto.pedir.verificar }),
  ).toBeVisible();

  const comprador = await cookieCompradorVerificado({ idioma: "en" });
  await sembrar(page, comprador.sesion);
  await page.reload();
  await page.getByRole("button", { name: F.contacto.boton }).click();
  await expect(page.getByText(F.contacto.listo.titulo)).toBeVisible();
  await sinViolaciones(page);
});

test("pedir una visita: los errores y el consentimiento salen en inglés y se envía", async ({
  page,
}) => {
  const a = await crearAnuncio({ nombre: "Dueno Sintetico" });
  conContactoPublico(a);
  const comprador = await cookieCompradorVerificado({
    nombre: "Laura Sintetica",
    idioma: "en",
  });
  await sembrar(page, comprador.sesion);
  await page.goto(`/i/${a.slug}`);
  await page.getByRole("link", { name: V.boton.pedir }).click();
  await expect(page).toHaveURL(/\/pedir-visita\?slug=/);
  await expect(
    page.getByRole("heading", { name: V.pedir.titulo }),
  ).toBeVisible();
  await sinViolaciones(page);

  const enviar = page.getByRole("button", { name: V.pedir.formulario.enviar });
  await enviar.click();
  await expect(page.getByText(V.pedir.errores.intencion)).toBeVisible();
  await expect(page.getByText(V.pedir.errores.correo)).toBeVisible();
  await page.getByRole("radio", { name: V.intencion.vivir }).check();
  await page.getByLabel(V.pedir.formulario.correo).fill(CORREO);
  await enviar.click();
  // Sin la casilla de autorización no se envía: lo dice en inglés.
  await expect(page.getByText(V.pedir.errores.consentimiento)).toBeVisible();
  await page
    .getByRole("checkbox", { name: /I agree that Innmobiliaria keeps/ })
    .check();
  await enviar.click();
  await expect(page.getByText(V.pedir.listo.titulo)).toBeVisible();
});

test("lo guardado y las alertas salen en inglés, con su estado vacío y sin violaciones", async ({
  page,
}) => {
  await page.goto("/guardados");
  await expect(
    page.getByRole("heading", { level: 1, name: G.titulo }),
  ).toBeVisible();
  await expect(page.getByText(G.favoritos.vacio.titulo)).toBeVisible();
  await sinViolaciones(page);
  await page.goto("/alertas");
  await expect(
    page.getByRole("heading", { level: 1, name: A.mias.titulo }),
  ).toBeVisible();
  await expect(page.getByText(A.mias.vacio.titulo)).toBeVisible();
  await sinViolaciones(page);
});

test("reportar: la página de las reglas y el formulario salen en inglés y el reporte se envía", async ({
  page,
}) => {
  await page.goto("/antifraude");
  await expect(
    page.getByRole("heading", { level: 1, name: AF.pagina.titulo }),
  ).toBeVisible();
  await expect(page.getByText(AF.pagina.reglas.telefono.titulo)).toBeVisible();
  await sinViolaciones(page);

  const a = await crearAnuncio({});
  const comprador = await cookieCompradorVerificado({ idioma: "en" });
  await sembrar(page, comprador.sesion);
  await page.goto(`/i/${a.slug}/reportar`);
  await expect(
    page.getByRole("heading", { name: AF.reportar.titulo }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: AF.motivos.precio_irreal }).check();
  await page.getByRole("button", { name: AF.reportar.enviar }).click();
  await expect(page.getByText(AF.reportar.listo.titulo)).toBeVisible();
});

test.describe("el operador en inglés", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
  });

  test("entra en inglés y las pantallas del panel salen en inglés, sin violaciones", async ({
    page,
  }) => {
    const email = process.env.OPERADOR_EMAIL ?? "operador@innmobiliaria.test";
    const password = process.env.OPERADOR_PASSWORD ?? "operador-seguro-123";
    await page.goto("/operador/login");
    await expect(
      page.getByRole("heading", { name: O.login.titulo }),
    ).toBeVisible();
    await page.getByLabel(O.login.correo).fill(email);
    await page.getByLabel(O.login.contrasena).fill(password);
    await page.getByRole("button", { name: O.login.entrar }).click();
    await expect(page).toHaveURL(/\/operador$/);
    await expect(
      page.getByRole("navigation", { name: O.nav.etiqueta }),
    ).toBeVisible();

    const pantallas: Array<[string, string]> = [
      ["/operador", O.registros.titulo],
      ["/operador/antifraude", AF.cola.titulo],
      ["/operador/sesiones", O.sesiones.titulo],
      ["/operador/salas", O.salas.titulo],
      ["/operador/campana", O.campana.titulo],
      ["/operador/zonas", O.zonas.titulo],
    ];
    for (const [ruta, titulo] of pantallas) {
      await page.goto(ruta);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(
        page.getByRole("heading", { level: 1, name: titulo }),
        ruta,
      ).toBeVisible();
      await sinViolaciones(page);
    }
    // Una etiqueta del panel con marcador: el diccionario las rellena igual en los dos idiomas.
    expect(rellenar(O.salas.grupos.cerradas, {})).toBe(O.salas.grupos.cerradas);
  });
});
