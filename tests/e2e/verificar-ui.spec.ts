import { createHmac } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { conContactoPublico, crearAnuncio } from "./utils/anuncios";

// Verificar el WhatsApp y contactar a un dueño POR LA UI (S7, ADR 015): ficha → «Escribirle por WhatsApp»
// → /verificar → código en pantalla → el test firma el mensaje como lo haría Meta → la página lo nota →
// vuelta a la ficha → «Abrir WhatsApp» registra el contacto → el dueño lo ve en «Mi anuncio».
// WhatsApp no se abre de verdad: `wa.me` se intercepta. Datos 100 % sintéticos.

const SECRETO = process.env.WHATSAPP_APP_SECRET ?? "";
const NUMERO = (process.env.WHATSAPP_NUMERO ?? "").replace(/\D/g, "");
const DUENO = "573001234567";

test.beforeEach(async ({ page }) => {
  expect(SECRETO, "WHATSAPP_APP_SECRET en el entorno del e2e").not.toBe("");
  // Nada sale a internet: wa.me responde vacío y cada apertura queda registrada.
  await page
    .context()
    .route("https://wa.me/**", (r) =>
      r.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<p>wa.me</p>",
      }),
    );
});

let secuencia = 0;
function celularNuevo(): string {
  secuencia += 1;
  return `3${String(Date.now() * 10 + secuencia).slice(-9)}`;
}

// Lo que Meta entregaría al webhook, firmado con el secreto del servidor.
async function mensajeDeMeta(page: Page, desde: string, texto: string) {
  const cuerpo = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              messages: [
                { from: desde, id: "w", type: "text", text: { body: texto } },
              ],
            },
          },
        ],
      },
    ],
  });
  const firma = `sha256=${createHmac("sha256", SECRETO).update(cuerpo).digest("hex")}`;
  const r = await page.request.post("/api/whatsapp/webhook", {
    data: Buffer.from(cuerpo, "utf8"),
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": firma,
    },
  });
  expect(r.status()).toBe(200);
}

async function llenarYPedir(
  page: Page,
  celular: string,
  nombre = "Laura Sintetica",
) {
  await page.getByLabel("Cómo te llamas").fill(nombre);
  await page.getByLabel("Tu WhatsApp").fill(celular);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Verificar con WhatsApp" }).click();
  await expect(page.getByTestId("codigo-verificacion")).toBeVisible();
}

test("ficha → verificar → código → mensaje firmado → vuelta → contactar → el dueño lo ve", async ({
  page,
}) => {
  const anuncio = await crearAnuncio({ nombre: "Dueno Sintetico" });
  conContactoPublico(anuncio);
  const celular = celularNuevo();

  // Sin verificar, el botón explica y lleva a verificar (y la página pública no trae el número).
  await page.goto(`/i/${anuncio.slug}`);
  await expect(page.locator("body")).not.toContainText("3001234567");
  await page.getByRole("button", { name: "Escribirle por WhatsApp" }).click();
  await expect(page.getByText("Primero, verifica tu WhatsApp")).toBeVisible();
  await page.getByRole("link", { name: "Verificar mi WhatsApp" }).click();
  await expect(page).toHaveURL(/\/verificar\?volver=/);

  // WhatsApp se abre hacia el número de Innmobiliaria con el código ya escrito.
  const popup = page.waitForEvent("popup");
  await page.getByLabel("Cómo te llamas").fill("Laura Sintetica");
  await page.getByLabel("Tu WhatsApp").fill(celular);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Verificar con WhatsApp" }).click();
  const codigo =
    (await page.getByTestId("codigo-verificacion").textContent()) ?? "";
  expect(codigo).toMatch(/^INN-[A-HJ-NP-Z2-9]{6}$/);
  const abierta = new URL((await popup).url());
  expect(abierta.pathname).toBe(`/${NUMERO}`);
  expect(abierta.searchParams.get("text")).toContain(codigo);
  await expect(page.getByText("Esperando tu mensaje")).toBeVisible();

  // El comprador manda el código desde SU número; la página lo nota al pulsar «Ya lo envié».
  await mensajeDeMeta(page, `57${celular}`, codigo);
  await page.getByRole("button", { name: "Ya lo envié" }).click();
  await expect(page.getByText("Tu WhatsApp quedó verificado")).toBeVisible();

  // De vuelta en la ficha: ya no pide verificar y abre WhatsApp del dueño con el mensaje.
  await page.getByRole("link", { name: "Volver al anuncio" }).click();
  await expect(page).toHaveURL(new RegExp(`/i/${anuncio.slug}$`));
  await page.getByRole("button", { name: "Escribirle por WhatsApp" }).click();
  await expect(
    page.getByText("Se abrirá WhatsApp con este mensaje"),
  ).toBeVisible();
  await expect(
    page.getByText(/vi tu apartamento en Los Rosales/),
  ).toBeVisible();
  const aDueno = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Abrir WhatsApp" }).click();
  const enlace = new URL((await aDueno).url());
  expect(enlace.pathname).toBe(`/${DUENO}`);
  expect(enlace.searchParams.get("text")).toContain(
    "apartamento en Los Rosales",
  );

  // El dueño, por su enlace privado, ve quién le escribió: nombre, fin del teléfono y fecha.
  await page.goto(`/mi-anuncio#t=${anuncio.token}`);
  await expect(
    page.getByRole("heading", { name: "Compradores que te escribieron" }),
  ).toBeVisible();
  const fila = page
    .getByRole("listitem")
    .filter({ hasText: "Laura Sintetica" });
  await expect(fila).toContainText(`+57 3•• ••• ${celular.slice(-4)}`);
  await expect(fila).toContainText("WhatsApp verificado");
  await expect(page.locator("body")).not.toContainText(celular);
});

test("un mensaje firmado desde OTRO número muestra «el código llegó desde otro número»", async ({
  page,
}) => {
  await page.goto("/verificar");
  await llenarYPedir(page, celularNuevo());
  const codigo =
    (await page.getByTestId("codigo-verificacion").textContent()) ?? "";
  await mensajeDeMeta(page, `57${celularNuevo()}`, codigo);
  await page.getByRole("button", { name: "Ya lo envié" }).click();
  await expect(
    page.getByText("El código llegó desde otro número"),
  ).toBeVisible();
  // Y se puede pedir otro código desde ahí.
  await expect(
    page.getByRole("button", { name: "Pedir otro código" }),
  ).toBeVisible();
});

test("el formulario pide nombre, un celular de Colombia y el consentimiento", async ({
  page,
}) => {
  await page.goto("/verificar");
  await page.getByRole("button", { name: "Verificar con WhatsApp" }).click();
  await expect(
    page.getByText("Escribe tu nombre (mínimo 2 letras)."),
  ).toBeVisible();
  await expect(page.getByText(/celular de Colombia: 10 dígitos/)).toBeVisible();
  await expect(
    page.getByText("Necesitamos tu autorización para verificarte."),
  ).toBeVisible();
  await expect(page.getByTestId("codigo-verificacion")).toHaveCount(0);
});

test("«No se abrió WhatsApp» da el número de Innmobiliaria y copia el código", async ({
  page,
  context,
}) => {
  await context
    .grantPermissions(["clipboard-read", "clipboard-write"])
    .catch(() => undefined);
  await page.goto("/verificar");
  await llenarYPedir(page, celularNuevo());
  await page.getByRole("button", { name: "No se abrió WhatsApp" }).click();
  await expect(page.getByText(/número de Innmobiliaria:/)).toBeVisible();
  await page.getByRole("button", { name: "Copiar el código" }).click();
  await expect(page.getByText("Código copiado.")).toBeVisible();
});

test("la página de verificar en inglés habla inglés y ofrece volver solo a rutas internas", async ({
  browser,
}) => {
  const contexto = await browser.newContext({
    locale: "en-US",
    extraHTTPHeaders: { "accept-language": "en-US,en;q=0.9" },
  });
  const page = await contexto.newPage();
  await page.goto("/verificar?volver=//otro-sitio.example");
  await expect(
    page.getByRole("heading", { name: "Verify that your WhatsApp is yours" }),
  ).toBeVisible();
  await expect(page.getByLabel("Your WhatsApp number")).toBeVisible();
  await contexto.close();
});

test("axe sin violaciones en /verificar (formulario y espera del código)", async ({
  page,
}) => {
  await page.goto("/verificar");
  await expect(page.getByLabel("Cómo te llamas")).toBeVisible();
  const escanear = async () =>
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()
    ).violations;
  expect(await escanear()).toEqual([]);
  await llenarYPedir(page, celularNuevo());
  expect(await escanear()).toEqual([]);
});
