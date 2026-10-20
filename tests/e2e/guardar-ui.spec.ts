import { randomBytes } from "node:crypto";
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { consultar, ejecutar } from "./utils/bd";
import { correoNuevo } from "./utils/alertas";
import { crearAnuncio, precioUnico } from "./utils/anuncios";
import { cookieCompradorVerificado } from "./utils/comprador";
import { formatearCOP } from "../../src/engine/format/cop";

// S9 «Guardar y avisar» POR LA UI, en español (el inglés se prueba al cierre del hito): el corazón, Guardados,
// comparar hasta 4, el paso de los favoritos a la cuenta al verificar, las listas compartidas con notas, una
// alerta desde la búsqueda hasta la baja en un clic, y el precio del dueño. Brevo en mock; la sesión del
// comprador se siembra como la dejaría el canje del webhook. Datos 100 % sintéticos.

const CLAVE_FAVORITOS = "inn:favoritos:v1";
const CLAVE_ALERTAS = "inn:alertas:v1";
const BARRIOS = [
  "Los Rosales",
  "Usaquén",
  "Britalia",
  "Chicó Norte",
  "La Cabrera",
];

function sembrar(contexto: BrowserContext, sesion: string) {
  return contexto.addCookies([
    { name: "inn_comprador", value: sesion, domain: "localhost", path: "/" },
  ]);
}

// Cada prueba usa su propia IP: la base local se comparte entre corridas y el tope de alertas por IP es diario.
async function conIpPropia(page: Page) {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `2001:db8::${Math.floor(Math.random() * 65_000).toString(16)}:${Date.now().toString(16)}`,
  });
}

async function sembrarFavoritos(page: Page, slugs: string[]) {
  await page.goto("/privacidad");
  await page.evaluate(
    ([clave, valor]) => window.localStorage.setItem(clave, valor),
    [CLAVE_FAVORITOS, JSON.stringify(slugs)],
  );
}

// Un token de enlace de correo que el servidor «mandó»: Brevo está en mock, así que el test lo siembra con el
// hash que la base espera (el crudo jamás se guarda).
function enlaceDeCorreo(email: string, proposito: "confirmar" | "baja") {
  const token = randomBytes(32).toString("base64url");
  ejecutar(`
    insert into public.enlaces_alerta (alerta_id, proposito, origen, token_hash)
    select id, '${proposito}', 'correo', public.hash_token('${token}')
      from public.alertas where email = '${email}';
  `);
  return token;
}

async function sinViolaciones(page: Page, donde: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
    ),
    donde,
  ).toEqual([]);
}

test.describe("favoritos, guardados y comparar", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
  });

  test("corazón → Guardados → comparar hasta 4 → verificar los pasa a la cuenta sin duplicar", async ({
    page,
  }) => {
    const anuncios = await Promise.all(
      BARRIOS.map((barrio) => crearAnuncio({ barrio })),
    );

    // 1. El corazón de la búsqueda guarda en ESTE teléfono; tocarlo de nuevo lo quita.
    const [a, b] = anuncios;
    await page.goto(`/buscar?min=${a.precio}&max=${a.precio}`);
    await page.getByRole("button", { name: "Guardar en favoritos" }).click();
    await expect(
      page.getByRole("button", { name: "Quitar de favoritos" }),
    ).toBeVisible();
    expect(
      JSON.parse(
        (await page.evaluate(
          (k) => localStorage.getItem(k),
          CLAVE_FAVORITOS,
        )) ?? "[]",
      ),
    ).toEqual([a.slug]);
    await page.getByRole("button", { name: "Quitar de favoritos" }).click();
    await expect(
      page.getByRole("button", { name: "Guardar en favoritos" }),
    ).toBeVisible();

    // 2. El corazón de la ficha también.
    await page.goto(`/i/${b.slug}`);
    await page.getByRole("button", { name: "Guardar en favoritos" }).click();
    await expect(
      page.getByRole("button", { name: "Quitar de favoritos" }),
    ).toBeVisible();

    // 3. Guardados: la navegación del comprador y el aviso de que viven en este teléfono.
    await page.goto("/guardados");
    await expect(
      page.getByRole("heading", { name: "Guardados", level: 1 }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Secciones del comprador" })
        .getByRole("link", { name: "Guardados" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByText("Tus favoritos viven en este teléfono."),
    ).toBeVisible();
    await expect(page.getByText(`Apartamento · ${BARRIOS[1]}`)).toBeVisible();

    // 4. Con los 5 guardados: se marcan 4 para comparar y el quinto avisa del tope.
    await sembrarFavoritos(
      page,
      anuncios.map((x) => x.slug),
    );
    await page.goto("/guardados");
    await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(5, {
      timeout: 15_000,
    });
    const marcar = (barrio: string) =>
      page.getByRole("checkbox", { name: `Comparar: Apartamento · ${barrio}` });
    for (const barrio of BARRIOS.slice(0, 4)) await marcar(barrio).check();
    await expect(page.getByText("4 de 4 para comparar")).toBeVisible();
    await marcar(BARRIOS[4]).click();
    await expect(
      page.getByText(/Puedes comparar hasta 4 a la vez/),
    ).toBeVisible();
    await expect(marcar(BARRIOS[4])).not.toBeChecked();
    await sinViolaciones(page, "/guardados con anuncios");

    // 5. Comparar: la tabla trae una columna por anuncio, con precio y precio por m².
    await marcar(BARRIOS[3]).uncheck();
    await marcar(BARRIOS[2]).uncheck();
    await page
      .locator("button:not([aria-pressed])", { hasText: /^Comparar$/ })
      .click();
    const tabla = page.getByRole("table", { name: "Comparación de anuncios" });
    await expect(tabla).toBeVisible();
    await expect(tabla.getByRole("columnheader")).toHaveCount(3);
    for (const fila of ["Precio", "Área", "Precio por m²", "Habitaciones"]) {
      await expect(
        tabla.getByRole("rowheader", { name: fila, exact: true }),
      ).toBeVisible();
    }
    await expect(tabla).toContainText(formatearCOP(anuncios[0].precio, "es"));
    await expect(tabla).toContainText(formatearCOP(anuncios[1].precio, "es"));
    await sinViolaciones(page, "/guardados comparando");

    // 6. Verificar el WhatsApp: los favoritos del teléfono pasan a la cuenta, una sola vez cada uno.
    const comprador = await cookieCompradorVerificado();
    await sembrar(page.context(), comprador.sesion);
    await page.reload();
    await expect(
      page.getByText(
        "Tus favoritos están guardados con tu WhatsApp verificado",
      ),
    ).toBeVisible();
    await expect
      .poll(async () => {
        const r = await page.request.get("/api/favoritos");
        return ((await r.json()) as { slugs: string[] }).slugs.sort();
      })
      .toEqual(anuncios.map((x) => x.slug).sort());
    await page.reload();
    const tras = await page.request.get("/api/favoritos");
    expect(((await tras.json()) as { slugs: string[] }).slugs).toHaveLength(5);

    // 7. Quitar uno desde Guardados también lo quita de la cuenta.
    await page
      .getByRole("button", { name: "Quitar de favoritos" })
      .first()
      .click();
    await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(4);
    await expect
      .poll(async () => {
        const r = await page.request.get("/api/favoritos");
        return ((await r.json()) as { slugs: string[] }).slugs.length;
      })
      .toBe(4);
  });
});

test.describe("listas compartidas con notas", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
  });

  test("crear → agregar → compartir → la nota pide WhatsApp verificado → revocar", async ({
    page,
    browser,
  }) => {
    const [a, b] = await Promise.all([
      crearAnuncio({ barrio: BARRIOS[0] }),
      crearAnuncio({ barrio: BARRIOS[1] }),
    ]);
    const duena = await cookieCompradorVerificado({
      nombre: "Laura Sintetica",
    });
    await sembrar(page.context(), duena.sesion);
    await sembrarFavoritos(page, [a.slug, b.slug]);

    // 1. Listas: crear y agregar de los favoritos.
    await page.goto("/guardados");
    await page
      .getByRole("group", { name: "Vista" })
      .getByRole("button", { name: "Listas" })
      .click();
    await page.getByLabel("Nombre de la lista").fill("Para nosotros");
    await page.getByRole("button", { name: "Crear lista" }).click();
    await expect(
      page.getByRole("heading", { name: "Para nosotros", level: 3 }),
    ).toBeVisible();
    for (const barrio of [BARRIOS[0], BARRIOS[1]]) {
      await page
        .getByLabel("Agregar de mis favoritos")
        .selectOption({ label: `Apartamento · ${barrio}` });
      await page.getByRole("button", { name: "Agregar", exact: true }).click();
      // Se espera a que la lista lo muestre antes de agregar el siguiente.
      await expect(
        page.getByRole("link", {
          name: `Ver el anuncio: Apartamento · ${barrio}`,
        }),
      ).toBeVisible();
    }
    await expect(page.getByText("Lista de Laura · 2 anuncios")).toBeVisible();
    await expect(
      page.getByText("Todos tus favoritos ya están en esta lista."),
    ).toBeVisible();

    // 2. Compartir: el enlace se muestra una vez y «Compartir por WhatsApp» no lleva número.
    await page.getByRole("button", { name: "Compartir por WhatsApp" }).click();
    await expect(page.getByText(/Enlace listo/)).toBeVisible();
    const enlace = (await page.getByText(/\/lista#t=/).innerText()).trim();
    const whatsapp = page.getByRole("link", { name: "Compartir por WhatsApp" });
    const destinoWhatsapp = (await whatsapp.getAttribute("href")) ?? "";
    expect(destinoWhatsapp.startsWith("https://wa.me/?text=")).toBe(true);
    expect(destinoWhatsapp).not.toMatch(/wa\.me\/\d/);
    await sinViolaciones(page, "/guardados con una lista abierta");

    // 3. Quien llega SIN verificar ve la lista, pero escribir una nota le pide verificar su WhatsApp.
    const anonimo = await browser.newContext();
    const paginaAnonima = await anonimo.newPage();
    await paginaAnonima.goto(enlace);
    await expect(
      paginaAnonima.getByRole("heading", { name: "Para nosotros", level: 1 }),
    ).toBeVisible();
    await expect(paginaAnonima.getByText("Lista de Laura")).toBeVisible();
    await expect(
      paginaAnonima.getByText("Para escribir notas, verifica tu WhatsApp."),
    ).toBeVisible();
    await expect(paginaAnonima.getByLabel(/Tu nota/)).toHaveCount(0);
    await expect(
      paginaAnonima.getByRole("link", { name: "Verificar mi WhatsApp" }),
    ).toHaveAttribute("href", /\/verificar\?volver=%2Flista#t=/);
    await sinViolaciones(paginaAnonima, "/lista sin verificar");

    // 4. Quien llega VERIFICADO escribe una nota; la duena la ve con su primer nombre.
    const camilo = await cookieCompradorVerificado({
      nombre: "Camilo Sintetico Apellido",
    });
    const contextoB = await browser.newContext();
    await sembrar(contextoB, camilo.sesion);
    const paginaB = await contextoB.newPage();
    await paginaB.goto(enlace);
    // Enter envía el formulario de ESA tarjeta (el orden de la lista es el más reciente primero).
    await paginaB
      .getByLabel(/Tu nota: Apartamento · Los Rosales/)
      .fill("Me gusta el balcón.");
    await paginaB
      .getByLabel(/Tu nota: Apartamento · Los Rosales/)
      .press("Enter");
    await expect(paginaB.getByText("Tú: Me gusta el balcón.")).toBeVisible();

    await page.getByRole("button", { name: "Cerrar" }).click();
    await page.getByRole("button", { name: "Abrir" }).click();
    await expect(page.getByText("Camilo: Me gusta el balcón.")).toBeVisible();
    await expect(page.locator("main")).not.toContainText("Apellido");

    // 5. Dejar de compartir: el enlace deja de funcionar para todos.
    await page.getByRole("button", { name: "Dejar de compartir" }).click();
    await expect(
      page.getByText("Listo: el enlace dejó de funcionar."),
    ).toBeVisible();
    await paginaB.reload();
    await expect(
      paginaB.getByRole("heading", { name: "Este enlace no funciona" }),
    ).toBeVisible();
    await paginaAnonima.reload();
    await expect(
      paginaAnonima.getByRole("heading", { name: "Este enlace no funciona" }),
    ).toBeVisible();
    await anonimo.close();
    await contextoB.close();
  });
});

test.describe("alertas por correo", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
  });

  test("desde la búsqueda → confirmar el correo → pausar → baja en un clic sin sesión", async ({
    page,
    browser,
  }) => {
    await conIpPropia(page);
    const precio = precioUnico();
    const correo = correoNuevo();

    // 1. «Guardar como alerta» lleva a la pantalla con la búsqueda ya escrita.
    await page.goto(
      `/buscar?op=venta&min=${precio - 1000}&max=${precio + 1000}`,
    );
    await page.getByRole("link", { name: /Guardar como alerta/ }).click();
    await expect(page).toHaveURL(/\/alertas\/nueva\?op=venta&min=/);
    await expect(page.getByText(/Tu búsqueda:/)).toBeVisible();
    await expect(page.locator("main")).toContainText("Venta · desde");
    await sinViolaciones(page, "/alertas/nueva");

    // 2. Sin autorización no se crea nada.
    await page.getByLabel("Tu correo").fill(correo);
    await page.getByRole("button", { name: "Crear alerta" }).click();
    await expect(
      page.getByText("Necesitamos tu autorización para guardar tu correo."),
    ).toBeVisible();
    await page
      .getByRole("checkbox", { name: /Acepto que Innmobiliaria/ })
      .check();
    await page.getByRole("button", { name: "Crear alerta" }).click();
    await expect(
      page.getByRole("heading", { name: "Revisa tu correo" }),
    ).toBeVisible();
    await expect(page.locator("main")).toContainText(correo);

    // La base la guardó SIN confirmar, y este teléfono guarda el token para «Mis alertas».
    expect(
      consultar(
        `select (confirmada_at is null)::text || ',' || (avisar_nuevos and avisar_bajas)::text from public.alertas where email = '${correo}'`,
      ),
    ).toEqual(["true,true"]);
    const guardados = JSON.parse(
      (await page.evaluate((k) => localStorage.getItem(k), CLAVE_ALERTAS)) ??
        "[]",
    ) as string[];
    expect(guardados).toHaveLength(1);

    // 3. Mis alertas: sin confirmar, el correo va enmascarado y no hay interruptores.
    await page.getByRole("link", { name: "Ver mis alertas" }).click();
    const tarjeta = page
      .getByRole("listitem")
      .filter({ hasText: "Falta confirmar" });
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta).toContainText("***@");
    await expect(tarjeta).not.toContainText(correo);
    await expect(tarjeta.getByRole("switch")).toHaveCount(0);

    // 4. El enlace «Confirmar» del correo (fragmento `#c=`): abrirlo NO confirma (un escáner de correo no puede
    // suscribir a nadie); hay que tocar el botón. El token se borra de la barra de direcciones.
    const confirmar = enlaceDeCorreo(correo, "confirmar");
    await page.goto("/privacidad");
    await page.goto(`/alertas#c=${confirmar}`);
    await expect(
      page.getByRole("heading", { name: "Confirma tu correo" }),
    ).toBeVisible();
    expect(
      consultar(
        `select (confirmada_at is null)::text from public.alertas where email = '${correo}'`,
      ),
    ).toEqual(["true"]);
    await page.getByRole("button", { name: "Confirmar mi correo" }).click();
    await expect(page.getByText("Correo confirmado")).toBeVisible();
    await expect(page).toHaveURL(/\/alertas$/);
    const viva = page.getByRole("listitem").filter({ hasText: "Activa" });
    await expect(viva).toBeVisible();
    await expect(viva).toContainText("Aún no te hemos enviado ningún resumen.");
    await sinViolaciones(page, "/alertas con una alerta activa");

    // 5. Pausar, reanudar y los interruptores (siempre queda un aviso encendido).
    await viva.getByRole("button", { name: "Pausar" }).click();
    const pausada = page.getByRole("listitem").filter({ hasText: "En pausa" });
    await expect(pausada).toBeVisible();
    await pausada.getByRole("button", { name: "Reanudar" }).click();
    await expect(viva).toBeVisible();
    const bajas = viva.getByRole("switch", {
      name: "Avisarme también si baja de precio",
    });
    await bajas.click();
    await expect(bajas).toHaveAttribute("aria-checked", "false");
    await viva
      .getByRole("switch", { name: "Avisarme de anuncios nuevos" })
      .click();
    await expect(
      page.getByText("Deja al menos un aviso encendido, o borra la alerta."),
    ).toBeVisible();

    // 6. La baja en un clic NO pide sesión: un navegador sin nada de este teléfono la hace.
    const baja = enlaceDeCorreo(correo, "baja");
    const otro = await browser.newContext();
    const paginaBaja = await otro.newPage();
    await paginaBaja.goto(`/baja#t=${baja}`);
    await expect(
      paginaBaja.getByRole("heading", {
        name: "Listo: no recibirás más avisos",
      }),
    ).toBeVisible();
    await sinViolaciones(paginaBaja, "/baja");
    await otro.close();
    expect(
      consultar(
        `select (baja_at is not null)::text from public.alertas where email = '${correo}'`,
      ),
    ).toEqual(["true"]);

    // 7. En este teléfono la alerta ya no existe y se limpia del almacenamiento.
    await page.goto("/privacidad");
    await page.goto("/alertas");
    await expect(
      page.getByRole("heading", { name: "No tienes alertas" }),
    ).toBeVisible();
    expect(
      await page.evaluate((k) => localStorage.getItem(k), CLAVE_ALERTAS),
    ).toBe("[]");
  });

  test("un enlace de baja roto no rompe la página", async ({ page }) => {
    await page.goto("/baja#t=corto");
    await expect(
      page.getByRole("heading", { name: "Este enlace no funciona" }),
    ).toBeVisible();
    await page.goto("/alertas/nueva");
    await expect(
      page.getByRole("heading", { name: "Primero elige qué buscas" }),
    ).toBeVisible();
  });
});

test.describe("el precio del dueño", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
  });

  test("bajarlo desde Mi anuncio deja el cambio en el historial", async ({
    page,
  }) => {
    const anuncio = await crearAnuncio();
    await page.goto(`/mi-anuncio#t=${anuncio.token}`);
    await expect(
      page.getByRole("heading", { name: "Precio", level: 2 }),
    ).toBeVisible();
    const nuevo = anuncio.precio - 5_000_000;
    await page.getByLabel("Precio esperado (COP)").fill(String(nuevo));
    await page.getByRole("button", { name: "Guardar precio" }).click();
    await expect(page.getByText("Precio guardado ✓")).toBeVisible();
    expect(
      consultar(
        `select anterior || ',' || nuevo from public.cambios_de_precio where inmueble_id = '${anuncio.id}'`,
      ),
    ).toEqual([`${anuncio.precio},${nuevo}`]);

    await page.getByLabel("Precio esperado (COP)").fill("12");
    await page.getByRole("button", { name: "Guardar precio" }).click();
    await expect(
      page.getByText("Escribe un precio válido en pesos."),
    ).toBeVisible();
  });
});

// La navegación del comprador y la accesibilidad de las pantallas nuevas, en el teléfono y en el escritorio.
test.describe("navegación del comprador y accesibilidad", () => {
  test("Buscar · Guardados · Alertas · Herramientas, y las pantallas nuevas sin violaciones de axe", async ({
    page,
  }, info) => {
    const movil = info.project.name === "mobile-chromium";
    const nav = page.getByRole("navigation", {
      name: "Secciones del comprador",
    });

    await page.goto("/guardados");
    await expect(nav).toBeVisible();
    // Desde el S10 son cuatro: la cuarta, Herramientas, es el simulador.
    for (const seccion of ["Buscar", "Guardados", "Alertas", "Herramientas"]) {
      await expect(nav.getByRole("link", { name: seccion })).toBeVisible();
    }
    // En el teléfono es una barra inferior fija; en escritorio vive en la cabecera.
    const caja = await nav.boundingBox();
    const alto = page.viewportSize()?.height ?? 0;
    if (movil) expect(caja!.y + caja!.height).toBeGreaterThan(alto - 4);
    else expect(caja!.y).toBeLessThan(120);

    await nav.getByRole("link", { name: "Alertas" }).click();
    await expect(page).toHaveURL(/\/alertas$/);
    await expect(
      page
        .getByRole("navigation", { name: "Secciones del comprador" })
        .getByRole("link", { name: "Alertas" }),
    ).toHaveAttribute("aria-current", "page");

    for (const ruta of [
      "/guardados",
      "/alertas",
      "/alertas/nueva?op=venta",
      "/lista",
      "/baja",
    ]) {
      await page.goto(ruta);
      await expect(page.locator("main")).not.toContainText("Un momento…");
      await sinViolaciones(page, ruta);
    }
  });
});
