import { readFileSync } from "node:fs";
import { test, expect, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ejecutar } from "./utils/bd";
import { conContactoPublico, crearAnuncio } from "./utils/anuncios";
import { cookieCompradorVerificado } from "./utils/comprador";
import { partesBogota } from "../../src/engine/agenda/bogota";
import { CEDULAS_PRUEBA } from "../../src/engine/identidad/proveedor";

// S8 «La visita» POR LA UI, en español (el inglés se prueba al cierre del hito): ficha → pedir visita →
// el dueño propone desde Mi anuncio → el comprador confirma → se descarga el .ics → el dueño marca la
// asistencia. La sesión del comprador se siembra como la dejaría el canje del webhook (que ya tiene sus
// e2e); identidad por el simulador y Brevo en mock. Datos 100 % sintéticos.

const CORREO = "comprador.ui@ejemplo.test";

function sembrar(contexto: BrowserContext, sesion: string) {
  return contexto.addCookies([
    { name: "inn_comprador", value: sesion, domain: "localhost", path: "/" },
  ]);
}

function enDias(dias: number): string {
  return partesBogota(new Date(Date.now() + dias * 86_400_000)).fecha;
}

test.beforeEach(async ({ page }) => {
  // Nada sale a internet: wa.me responde vacío.
  await page.context().route("https://wa.me/**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<p>wa.me</p>",
    }),
  );
});

test.describe("pedir, proponer, confirmar, calendario y asistencia", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
  });

  test("de punta a punta por la UI", async ({ page, browser }) => {
    const anuncio = await crearAnuncio({ nombre: "Dueno Sintetico" });
    conContactoPublico(anuncio);
    const comprador = await cookieCompradorVerificado({
      nombre: "Laura Sintetica",
    });
    await sembrar(page.context(), comprador.sesion);

    // 1. La ficha trae el botón y lleva al formulario.
    await page.goto(`/i/${anuncio.slug}`);
    await page.getByRole("link", { name: "Pedir una visita" }).click();
    await expect(page).toHaveURL(/\/pedir-visita\?slug=/);
    await expect(
      page.getByRole("heading", { name: "Pide una visita" }),
    ).toBeVisible();

    // 2. El formulario valida y envía.
    await page.getByRole("button", { name: "Pedir la visita" }).click();
    await expect(page.getByText("Elige para qué lo buscas.")).toBeVisible();
    await expect(page.getByText("Escribe un correo válido.")).toBeVisible();
    await page.getByRole("radio", { name: "Para vivir" }).check();
    await page.getByLabel("Desde (millones)").fill("300");
    await page.getByLabel("Hasta (millones)").fill("450");
    await page.getByRole("checkbox", { name: "Crédito hipotecario" }).check();
    await page
      .getByLabel(/Un mensaje para el dueño/)
      .fill("Quisiera verlo un sábado en la mañana.");
    await page.getByLabel("Tu correo").fill(CORREO);
    await page.getByRole("button", { name: "Pedir la visita" }).click();
    await expect(page.getByText("Aceptar", { exact: false })).toHaveCount(0);
    await expect(page.getByText("Necesitamos tu autorización")).toBeVisible();
    await page
      .getByRole("checkbox", {
        name: /Acepto que Innmobiliaria guarde mi correo/,
      })
      .check();
    await page.getByRole("button", { name: "Pedir la visita" }).click();
    await expect(page.getByText("Solicitud enviada")).toBeVisible();
    await page.getByRole("link", { name: "Ver mi solicitud" }).click();
    await expect(page).toHaveURL(/\/visita#t=/);
    await expect(
      page.getByRole("heading", { name: "Esperando horarios" }),
    ).toBeVisible();
    const urlComprador = page.url();

    // 3. El dueño (otro navegador, sin la cookie del comprador) ve la tarjeta y propone un horario.
    const contextoDueno = await browser.newContext();
    const dueno = await contextoDueno.newPage();
    await dueno.goto(`/mi-anuncio#t=${anuncio.token}`);
    await expect(
      dueno.getByRole("heading", { name: "Solicitudes de visita" }),
    ).toBeVisible();
    const tarjeta = dueno.getByRole("article", { name: "Laura Sintetica" });
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta).toContainText("Para vivir");
    await expect(tarjeta).toContainText("300 a 450 millones");
    await expect(tarjeta).toContainText(
      "Lo declara el comprador; no lo verificamos.",
    );
    await expect(tarjeta).toContainText("Crédito hipotecario");
    await expect(tarjeta).toContainText("Primera visita en Innmobiliaria");
    await expect(tarjeta).toContainText("Quisiera verlo un sábado");
    // Del comprador, jamás el correo ni el número completo.
    await expect(dueno.locator("body")).not.toContainText(CORREO);
    await expect(dueno.locator("body")).not.toContainText(comprador.telefono);

    await tarjeta.getByRole("button", { name: "Proponer horarios" }).click();
    await dueno.getByLabel(/Horario 1 · Fecha/).fill(enDias(3));
    await dueno.getByLabel(/Horario 1 · Hora/).selectOption("10:00");
    await dueno
      .getByRole("button", { name: /Enviar horarios a Laura/ })
      .click();
    await expect(tarjeta).toContainText("Esperando su respuesta");

    // 4. El comprador ve el horario y lo confirma.
    await page.goto(urlComprador);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: /te propone estos horarios/ }),
    ).toBeVisible();
    await page.getByRole("radio").first().check();
    await page.getByRole("button", { name: "Confirmar la visita" }).click();
    await expect(
      page.getByRole("heading", { name: /Visita confirmada/ }),
    ).toBeVisible();
    await expect(page.getByTestId("visita-horario")).toContainText("10:00");
    await expect(page.locator("body")).toContainText("Lleva tu cédula");
    await expect(page.locator("body")).toContainText(
      "Te recordamos por correo el",
    );

    // 5. El .ics baja con la hora de Bogotá.
    const descarga = page.waitForEvent("download");
    await page.getByRole("button", { name: "Agregar a mi calendario" }).click();
    const archivo = await descarga;
    expect(archivo.suggestedFilename()).toBe("visita-innmobiliaria.ics");
    const ics = readFileSync((await archivo.path()) as string, "utf8");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("TZID=America/Bogota");
    expect(ics).toContain(
      `DTSTART;TZID=America/Bogota:${enDias(3).replaceAll("-", "")}T100000`,
    );
    await expect(page.getByText("Descargamos el evento")).toBeVisible();

    // 6. El dueño ve la visita confirmada y el botón para escribirle por WhatsApp (solo ahora).
    await dueno.reload();
    await expect(tarjeta).toContainText("Visita confirmada");
    await expect(tarjeta.getByTestId("tarjeta-horario")).toContainText("10:00");
    const escribir = tarjeta.getByRole("link", {
      name: "Escribirle por WhatsApp",
    });
    await expect(escribir).toHaveAttribute(
      "href",
      new RegExp(
        `^https://wa\\.me/${comprador.telefono.replace("+", "")}\\?text=`,
      ),
    );

    // 7. Pasó la hora: el dueño marca que vino y queda el conteo en la tarjeta.
    ejecutar(
      `update public.visitas set inicio = now() - interval '2 hours' where solicitud_id = (select s.id from public.solicitudes_visita s join public.compradores c on c.id = s.comprador_id where c.telefono = '${comprador.telefono}' and s.inmueble_id = '${anuncio.id}')`,
    );
    await dueno.reload();
    await expect(tarjeta).toContainText("¿Laura vino a la visita");
    await tarjeta.getByRole("button", { name: "Sí, vino" }).click();
    await expect(tarjeta.getByTestId("asistencia-marcada")).toContainText(
      "Marcaste que vino.",
    );
    await expect(tarjeta).toContainText(
      "Asistió a 1 de 1 visita en Innmobiliaria",
    );
    await contextoDueno.close();
  });

  test("el comprador cancela su visita desde el enlace y el dueño la ve cancelada", async ({
    page,
    browser,
  }) => {
    const anuncio = await crearAnuncio();
    conContactoPublico(anuncio);
    const comprador = await cookieCompradorVerificado({
      nombre: "Camilo Prueba",
    });
    await sembrar(page.context(), comprador.sesion);
    const solicitar = await page.request.post("/api/visitas/solicitar", {
      data: {
        slug: anuncio.slug,
        intencion: "invertir",
        email: CORREO,
        consentimiento: true,
        formaPago: [],
      },
    });
    const { token } = await solicitar.json();
    await page.goto(`/visita#t=${token}`);
    await expect(
      page.getByRole("heading", { name: "Esperando horarios" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Retirar mi solicitud" }).click();
    await page.getByRole("button", { name: "Sí, cancelar" }).click();
    await expect(
      page.getByRole("heading", { name: "La visita quedó cancelada" }),
    ).toBeVisible();

    const contexto = await browser.newContext();
    const dueno = await contexto.newPage();
    await dueno.goto(`/mi-anuncio#t=${anuncio.token}`);
    const tarjeta = dueno.getByRole("article", { name: "Camilo Prueba" });
    await expect(tarjeta).toContainText("Cancelada");
    await expect(tarjeta).toContainText("Para invertir");
    await expect(tarjeta).toContainText("Presupuesto");
    await expect(
      tarjeta.getByRole("button", { name: "Proponer horarios" }),
    ).toHaveCount(0);
    await contexto.close();
  });

  test("«solo identificados»: el dueño lo activa, la solicitud queda en espera y la acepta igual", async ({
    page,
    browser,
  }) => {
    const anuncio = await crearAnuncio();
    conContactoPublico(anuncio);
    const contexto = await browser.newContext();
    const dueno = await contexto.newPage();
    await dueno.goto(`/mi-anuncio#t=${anuncio.token}`);
    await dueno
      .getByRole("checkbox", {
        name: /Visitas solo de compradores identificados/,
      })
      .click();
    await expect(
      dueno.getByRole("checkbox", {
        name: /Visitas solo de compradores identificados/,
      }),
    ).toBeChecked();

    // La ficha avisa que este dueño prefiere compradores identificados.
    const comprador = await cookieCompradorVerificado({
      nombre: "Camilo Prueba",
    });
    await sembrar(page.context(), comprador.sesion);
    await page.goto(`/i/${anuncio.slug}`);
    await expect(
      page.getByText("Este dueño prefiere compradores identificados."),
    ).toBeVisible();
    await page.goto(`/pedir-visita?slug=${anuncio.slug}`);
    await expect(
      page.getByRole("heading", {
        name: "Este dueño prefiere compradores identificados",
      }),
    ).toBeVisible();
    await page.getByRole("radio", { name: "Para invertir" }).check();
    await page.getByLabel("Tu correo").fill(CORREO);
    await page
      .getByRole("checkbox", {
        name: /Acepto que Innmobiliaria guarde mi correo/,
      })
      .check();
    await page.getByRole("button", { name: "Pedir la visita" }).click();
    await page.getByRole("link", { name: "Ver mi solicitud" }).click();
    await expect(
      page.getByRole("heading", { name: "Tu solicitud está en espera" }),
    ).toBeVisible();

    // Desde la solicitud en espera, «Identificarme» lleva el token en el FRAGMENTO (no en la consulta, que
    // sí llega al servidor y a sus registros) y al volver la solicitud sigue ahí.
    const enlace = page.getByRole("link", {
      name: "Identificarme con mi cédula",
    });
    const href = (await enlace.getAttribute("href")) ?? "";
    expect(href).toMatch(
      /^\/identificarse\?volver=%2Fvisita#t=[A-Za-z0-9_-]{43}$/,
    );
    const peticiones: string[] = [];
    page.on("request", (r) => peticiones.push(r.url()));
    await enlace.click();
    await expect(page).toHaveURL(/\/identificarse\?volver=%2Fvisita#t=/);
    await page
      .getByRole("textbox", { name: /^Número de cédula/ })
      .fill(CEDULAS_PRUEBA.identificado);
    await page
      .getByRole("textbox", { name: /^Fecha de expedición/ })
      .fill("2009-07-14");
    await page
      .getByRole("textbox", { name: /^Nombres y apellidos/ })
      .fill("Camilo Prueba Sintetico");
    await page
      .getByRole("checkbox", { name: /Autorizo que mi número de cédula/ })
      .check();
    await page.getByRole("button", { name: "Validar mi cédula" }).click();
    await expect(
      page.getByRole("heading", { name: /tu identificación quedó validada/ }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Volver" }).click();
    await expect(page).toHaveURL(/\/visita#t=/);
    // La identificación sacó la solicitud del «en espera».
    await expect(
      page.getByRole("heading", { name: "Esperando horarios" }),
    ).toBeVisible();
    // Ninguna petición llevó el token en su dirección.
    expect(
      peticiones.filter(
        (u) =>
          /[?&]volver=[^&]*t(%3D|=)/i.test(u) || /t=[A-Za-z0-9_-]{43}/.test(u),
      ),
    ).toEqual([]);

    await dueno.reload();
    const tarjeta = dueno.getByRole("article", {
      name: "Camilo Prueba Sintetico",
    });
    await expect(tarjeta).toContainText("Nueva");
    await expect(tarjeta).toContainText("Identificado con cédula");
    await contexto.close();
  });

  test("«solo identificados»: la solicitud sin identificar queda en espera y el dueño la acepta igual", async ({
    page,
    browser,
  }) => {
    const anuncio = await crearAnuncio();
    conContactoPublico(anuncio);
    const contexto = await browser.newContext();
    const dueno = await contexto.newPage();
    await dueno.goto(`/mi-anuncio#t=${anuncio.token}`);
    await dueno
      .getByRole("checkbox", {
        name: /Visitas solo de compradores identificados/,
      })
      .click();
    const comprador = await cookieCompradorVerificado({
      nombre: "Camilo Prueba",
    });
    await sembrar(page.context(), comprador.sesion);
    const solicitar = await page.request.post("/api/visitas/solicitar", {
      data: {
        slug: anuncio.slug,
        intencion: "invertir",
        email: CORREO,
        consentimiento: true,
        formaPago: [],
      },
    });
    expect((await solicitar.json()).estado).toBe("en_espera");
    await dueno.reload();
    const tarjeta = dueno.getByRole("article", { name: "Camilo Prueba" });
    await expect(tarjeta).toContainText("En espera");
    await expect(tarjeta).toContainText("Sin identificar");
    await expect(tarjeta).toContainText(
      "Pediste visitas solo de compradores identificados",
    );
    await expect(tarjeta).toContainText("No lo dijo");
    await tarjeta.getByRole("button", { name: "Aceptar igual" }).click();
    await expect(tarjeta).toContainText("Nueva");
    await expect(
      tarjeta.getByRole("button", { name: "Proponer horarios" }),
    ).toBeVisible();
    await contexto.close();
  });
});

test.describe("identificarse", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
  });

  test("sin WhatsApp verificado pide verificar primero", async ({ page }) => {
    await page.goto("/identificarse");
    await expect(
      page.getByRole("heading", { name: "Primero verifica tu WhatsApp" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Verificar mi WhatsApp" }),
    ).toBeVisible();
  });

  test("no coincide, identificado y borrar la identificación; el número no se queda en la página", async ({
    page,
  }) => {
    const comprador = await cookieCompradorVerificado({
      nombre: "Laura Sintetica",
    });
    await sembrar(page.context(), comprador.sesion);
    await page.goto("/identificarse");
    await expect(
      page.getByRole("textbox", { name: /^Número de cédula/ }),
    ).toBeVisible();

    // Validación local de campos.
    await page.getByRole("button", { name: "Validar mi cédula" }).click();
    await expect(page.getByText("Escribe tu número de cédula")).toBeVisible();

    const llenar = async (cedula: string) => {
      await page
        .getByRole("textbox", { name: /^Número de cédula/ })
        .fill(cedula);
      await page
        .getByRole("textbox", { name: /^Fecha de expedición/ })
        .fill("2009-07-14");
      await page
        .getByRole("textbox", { name: /^Nombres y apellidos/ })
        .fill("Laura Sintetica Prueba");
    };
    await llenar(CEDULAS_PRUEBA.no_coincide);
    await page
      .getByRole("checkbox", { name: /Autorizo que mi número de cédula/ })
      .check();
    await page.getByRole("button", { name: "Validar mi cédula" }).click();
    await expect(
      page.getByText("Los datos no coinciden con la Registraduría"),
    ).toBeVisible();
    // La cédula escrita se vació del formulario en cuanto el servidor respondió.
    await expect(
      page.getByRole("textbox", { name: /^Número de cédula/ }),
    ).toHaveValue("");

    await llenar(CEDULAS_PRUEBA.identificado);
    await page.getByRole("button", { name: "Intentar de nuevo" }).click();
    await expect(
      page.getByRole("heading", { name: /tu identificación quedó validada/ }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      CEDULAS_PRUEBA.identificado,
    );
    await expect(page.getByText("✓ Identificado")).toBeVisible();

    // Al recargar sigue identificado (lo dice la base), y se puede borrar.
    await page.reload();
    await expect(page.getByText("✓ Identificado")).toBeVisible();
    await page
      .getByRole("button", { name: "Borrar mi identificación" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Borramos tu identificación" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("textbox", { name: /^Número de cédula/ }),
    ).toBeVisible();
  });
});

test.describe("accesibilidad de las pantallas nuevas", () => {
  test("/identificarse, /pedir-visita y /visita no tienen violaciones de axe", async ({
    page,
  }) => {
    const anuncio = await crearAnuncio();
    conContactoPublico(anuncio);
    const comprador = await cookieCompradorVerificado();
    await sembrar(page.context(), comprador.sesion);
    const revisar = async (ruta: string, listo: RegExp | string) => {
      await page.goto(ruta);
      // Un cambio solo de fragmento no recarga la página: como al abrir el enlace del correo, se recarga.
      if (ruta.includes("#")) await page.reload();
      await expect(page.locator("main")).toContainText(listo);
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        violations.map(
          (v) =>
            `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
        ),
        ruta,
      ).toEqual([]);
    };
    await revisar("/identificarse", "Identifícate con tu cédula");
    await revisar(`/pedir-visita?slug=${anuncio.slug}`, "¿Para qué lo buscas?");
    await revisar("/visita", "Necesitas tu enlace");
    // Con una solicitud real: la página de la visita en su estado «esperando horarios».
    const r = await page.request.post("/api/visitas/solicitar", {
      data: {
        slug: anuncio.slug,
        intencion: "vivir",
        email: CORREO,
        consentimiento: true,
        formaPago: ["ahorros"],
      },
    });
    const { token } = await r.json();
    await revisar(`/visita#t=${token}`, "Esperando horarios");
  });

  test("Mi anuncio con una solicitud y el formulario de horarios no tienen violaciones de axe", async ({
    page,
    browser,
  }) => {
    test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
    const anuncio = await crearAnuncio();
    conContactoPublico(anuncio);
    const comprador = await cookieCompradorVerificado({
      nombre: "Laura Sintetica",
    });
    const contexto = await browser.newContext();
    await sembrar(contexto, comprador.sesion);
    const buyer = await contexto.newPage();
    await buyer.request.post("/api/visitas/solicitar", {
      data: {
        slug: anuncio.slug,
        intencion: "vivir",
        email: CORREO,
        consentimiento: true,
        formaPago: ["ahorros"],
        presupuestoMin: 300_000_000,
      },
    });
    await contexto.close();
    await page.goto(`/mi-anuncio#t=${anuncio.token}`);
    const tarjeta = page.getByRole("article", { name: "Laura Sintetica" });
    await expect(tarjeta).toBeVisible();
    await tarjeta.getByRole("button", { name: "Proponer horarios" }).click();
    await expect(page.getByLabel(/Horario 1 · Fecha/)).toBeVisible();
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
      ),
    ).toEqual([]);
  });
});
