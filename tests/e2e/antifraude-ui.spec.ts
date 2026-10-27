import { test, expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { consultar } from "./utils/bd";
import { crearAnuncio, type AnuncioCreado } from "./utils/anuncios";
import { cookieCompradorVerificado } from "./utils/comprador";
import { entrarOperador } from "./utils/registrar";
import { fechaBogota } from "./utils/fechas";
import { partesBogota } from "../../src/engine/agenda/bogota";
import { hashSesion } from "../../src/engine/verificacion/sesion";

// S15 «Aquí nadie te tumba» — las pantallas POR LA UI, en español (el inglés se prueba al cierre del hito): reportar (con y sin
// WhatsApp verificado, repetido y el tope), la cola del operador (pausar, reactivar, pedir el CTL, descartar), la sesión de fotos
// de punta a punta entre el dueño y el operador, lo que el dueño ve cuando el equipo pausó o pidió el CTL, y accesibilidad y
// ancho de teléfono de cada ruta nueva. Datos 100 % sintéticos.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const api = () => createClient(url, anon);

test.beforeEach(() => {
  test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
});

const enDias = (dias: number): string =>
  partesBogota(new Date(Date.now() + dias * 86_400_000)).fecha;

async function comoComprador(page: Page) {
  const c = await cookieCompradorVerificado();
  await page.context().addCookies([
    {
      name: "inn_comprador",
      value: c.sesion,
      domain: "localhost",
      path: "/",
    },
  ]);
  return { ...c, hash: await hashSesion(c.sesion) };
}

// La cola entrega las 200 filas más recientes y otras specs (y `revisar_banderas`) crean miles de banderas nuevas en la misma base: sin esto,
// la fila de la prueba podría quedar fuera de las 200. Se sube a la cima con una fecha futura, sin cambiar de qué se trata.
function alaCima(a: AnuncioCreado) {
  consultar(
    `update public.reportes set created_at = now() + interval '1 day' where inmueble_id = '${a.id}' and resolucion is null`,
  );
  consultar(
    `update public.inmuebles
        set pausado_at = case when pausado_at is not null then now() + interval '1 day' end,
            ctl_pedido_at = case when ctl_pedido_at is not null then now() + interval '1 day' end
      where id = '${a.id}'`,
  );
}

const banderasAbiertas = (a: AnuncioCreado) =>
  Number(
    consultar(
      `select count(*) from public.banderas where inmueble_id = '${a.id}' and resolucion is null`,
    )[0],
  );

// «Sale de la cola» salvo que, mientras tanto, una regla haya abierto una bandera nueva en este anuncio (otras pruebas corren
// `revisar_banderas` en paralelo y todos los anuncios de prueba comparten el mismo WhatsApp): entonces la tarjeta se queda, y con razón.
const saleDeLaCola = (fila: Locator, a: AnuncioCreado) =>
  expect
    .poll(async () => (await fila.count()) === 0 || banderasAbiertas(a) > 0)
    .toBe(true);

const fichaVisible = async (a: AnuncioCreado) =>
  (await api().rpc("obtener_ficha", { p_slug: a.slug })).data !== null;

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

const sinScrollHorizontal = async (page: Page) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const { ancho, visible } = await page.evaluate(() => ({
    ancho: document.documentElement.scrollWidth,
    visible: document.documentElement.clientWidth,
  }));
  expect(ancho).toBeLessThanOrEqual(visible);
};

test.describe("reportar un anuncio", () => {
  test("sin WhatsApp verificado invita a verificarlo y no pide nada más", async ({
    page,
  }) => {
    const a = await crearAnuncio();
    await page.goto(`/i/${a.slug}/reportar`);
    await expect(
      page.getByRole("heading", { name: "Primero, verifica tu WhatsApp" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Verificar mi WhatsApp" }),
    ).toHaveAttribute("href", /\/verificar\?volver=/);
    await expect(page.getByLabel("Cuéntanos más (opcional)")).toHaveCount(0);
  });

  test("verificado: valida, envía, no cambia la ficha y un segundo reporte dice que ya lo tiene", async ({
    page,
  }) => {
    const a = await crearAnuncio();
    await comoComprador(page);

    // El enlace sale de la ficha, junto a «Compartir».
    await page.goto(`/i/${a.slug}`);
    await page.getByRole("link", { name: "Reportar este anuncio" }).click();
    await expect(page).toHaveURL(new RegExp(`/i/${a.slug}/reportar$`));

    // Sin motivo no se envía.
    await page.getByRole("button", { name: "Enviar reporte" }).click();
    await expect(page.getByText("Elige al menos un motivo.")).toBeVisible();

    await page
      .getByLabel("El precio es demasiado bueno para ser verdad")
      .check();
    await page
      .getByLabel("Cuéntanos más (opcional)")
      .fill("Me pidió un anticipo");
    await page.getByRole("button", { name: "Enviar reporte" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Gracias: una persona del equipo lo revisa",
      }),
    ).toBeVisible();

    // Un reporte NO cambia lo que ve nadie: la ficha sigue ahí.
    expect(await fichaVisible(a)).toBe(true);
    await page.goto(`/i/${a.slug}`);
    await expect(
      page.getByRole("link", { name: "Reportar este anuncio" }),
    ).toBeVisible();

    // Reportarlo otra vez: la base dice que ya lo reportó y la pantalla lo dice en llano.
    await page.goto(`/i/${a.slug}/reportar`);
    await page.getByLabel("Otra cosa").check();
    await page.getByRole("button", { name: "Enviar reporte" }).click();
    await expect(
      page.getByText("Ya reportaste este anuncio: el equipo lo tiene."),
    ).toBeVisible();
  });

  test("el tope: a lo sumo 5 reportes por persona al día", async ({ page }) => {
    const c = await comoComprador(page);
    for (let i = 0; i < 5; i++) {
      const otro = await crearAnuncio();
      const { error } = await api().rpc("reportar_anuncio", {
        p_sesion_hash: c.hash,
        p_slug: otro.slug,
        p_motivos: ["otra_cosa"],
        p_detalle: null,
      });
      expect(error).toBeNull();
    }
    const sexto = await crearAnuncio();
    await page.goto(`/i/${sexto.slug}/reportar`);
    await page.getByLabel("Otra cosa").check();
    await page.getByRole("button", { name: "Enviar reporte" }).click();
    await expect(
      page.getByText(
        "Llegaste al tope de reportes de hoy. Vuelve a intentarlo mañana.",
      ),
    ).toBeVisible();
  });

  test("un anuncio pausado ya no tiene página de reporte", async ({ page }) => {
    const a = await crearAnuncio();
    consultar(`select public.pausar_anuncio('${a.id}')`);
    const r = await page.goto(`/i/${a.slug}/reportar`);
    expect(r?.status()).toBe(404);
  });
});

test.describe("la cola antifraude del operador", () => {
  // Cada acción cierra lo que había abierto: por eso cada caso parte de su propio anuncio con su propio reporte.
  async function anuncioReportado(page: Page, detalle: string) {
    const a = await crearAnuncio({ nombre: "Dueno Sintetico" });
    const c = await comoComprador(page);
    expect(
      (
        await api().rpc("reportar_anuncio", {
          p_sesion_hash: c.hash,
          p_slug: a.slug,
          p_motivos: ["precio_irreal", "pidio_plata"],
          p_detalle: detalle,
        })
      ).error,
    ).toBeNull();
    alaCima(a);
    await entrarOperador(page);
    await page.goto("/operador/antifraude");
    const fila = page.locator(
      `[data-testid="fila-antifraude"][data-slug="${a.slug}"]`,
    );
    await expect(fila).toBeVisible();
    return { a, c, fila };
  }
  const estadoDelReporte = (a: AnuncioCreado) =>
    consultar(
      `select coalesce(resolucion, 'abierto') || ':' || coalesce(razon, '') from public.reportes where inmueble_id = '${a.id}'`,
    )[0];

  test("el reporte llega con motivos y detalle, sin quién lo hizo, y no cambia lo que ve nadie", async ({
    page,
  }) => {
    const { a, c, fila } = await anuncioReportado(
      page,
      "Pidió un anticipo por WhatsApp",
    );
    await expect(fila).toContainText(
      "El precio es demasiado bueno para ser verdad",
    );
    await expect(fila).toContainText("Me pidió plata antes de la visita");
    await expect(fila).toContainText("Pidió un anticipo por WhatsApp");
    await expect(fila).not.toContainText(c.telefono);
    expect(await fichaVisible(a)).toBe(true);
    expect(estadoDelReporte(a)).toBe("abierto:");
  });

  test("pausar saca el anuncio de la ficha y deja el texto de la pausa listo; reactivar lo devuelve", async ({
    page,
  }) => {
    const { a, fila } = await anuncioReportado(page, "Algo no cuadra");
    await fila.getByRole("button", { name: "Pausar el anuncio" }).click();
    await expect(
      fila.getByText(/Anuncio pausado: salió de la búsqueda/),
    ).toBeVisible();
    await expect.poll(() => fichaVisible(a)).toBe(false);
    expect(estadoDelReporte(a)).toBe("pausar:");
    alaCima(a);
    await page.reload();
    await expect(fila).toBeVisible();

    // La tarjeta sigue ahí (está pausado) con el WhatsApp del dueño y el texto de la pausa ya escrito.
    const escribir = fila.getByRole("link", {
      name: "Escribirle al dueño por WhatsApp",
    });
    await expect(escribir).toHaveAttribute("href", /^https:\/\/wa\.me\/57/);
    expect(
      decodeURIComponent((await escribir.getAttribute("href")) ?? ""),
    ).toContain("Pausamos el anuncio");

    await fila.getByRole("button", { name: "Reactivar el anuncio" }).click();
    await expect.poll(() => fichaVisible(a)).toBe(true);
    // Reactivado y sin nada abierto, sale de la cola.
    await saleDeLaCola(fila, a);
  });

  test("pedir el CTL no oculta nada y la tarjeta se queda, con el texto del CTL, hasta que se verifique", async ({
    page,
  }) => {
    const { a, fila } = await anuncioReportado(page, "Algo no cuadra");
    await fila.getByRole("button", { name: "Pedir el CTL al dueño" }).click();
    await expect(
      fila.getByText(/CTL pedido\. Escríbele al dueño/),
    ).toBeVisible();
    expect(await fichaVisible(a)).toBe(true);
    expect(estadoDelReporte(a)).toBe("pedir_ctl:");
    alaCima(a);

    // Sigue en la cola, con la marca de que el CTL está pedido y el enlace de WhatsApp con el texto ya escrito.
    await expect(fila).toContainText("CTL pedido el");
    const escribir = fila.getByRole("link", {
      name: "Escribirle al dueño por WhatsApp",
    });
    expect(
      decodeURIComponent((await escribir.getAttribute("href")) ?? ""),
    ).toContain("certificado de tradición y libertad");
    await page.reload();
    await expect(fila).toBeVisible();

    // Verificado con un CTL nuevo, se va de la cola.
    consultar(
      `select public.marcar_verificado_ctl('${a.id}', '50N-1122334', date '${fechaBogota(2)}')`,
    );
    await page.reload();
    await saleDeLaCola(fila, a);
  });

  test("descartar exige una razón y deja el registro con su razón; el anuncio sigue donde estaba", async ({
    page,
  }) => {
    const { a, fila } = await anuncioReportado(page, "Algo no cuadra");
    await fila.getByRole("button", { name: "Descartar las banderas" }).click();
    await fila.getByRole("button", { name: "Descartar", exact: true }).click();
    await expect(fila.getByText("Elige una razón.")).toBeVisible();
    await fila.getByLabel("Comprobé que publica el dueño").check();
    await fila.getByRole("button", { name: "Descartar", exact: true }).click();
    // Primero el efecto en la base: `saleDeLaCola` también se cumple si el cron de otra spec le abre una bandera al anuncio,
    // y entonces leía el reporte antes de que el descarte llegara (S16, con datos acumulados).
    await expect.poll(() => estadoDelReporte(a)).toBe("descartar:es_el_dueno");
    await saleDeLaCola(fila, a);
    expect(await fichaVisible(a)).toBe(true);
  });
});

test.describe("la sesión de fotos, del dueño al operador", () => {
  test("pedir, agendar, confirmar por WhatsApp, dar por hecha y pedir otra", async ({
    page,
  }) => {
    const a = await crearAnuncio({ nombre: "Dueno Sintetico" });
    const mi = `/mi-anuncio#t=${a.token}`;

    // El dueño la pide.
    await page.goto(mi);
    await expect(
      page.getByRole("heading", { name: "Sesión de fotos" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Pedir la sesión" }).click();
    await expect(page.getByText("Elige la franja que te sirve.")).toBeVisible();
    await page.getByLabel("¿Qué franja te sirve?").selectOption("sabado");
    await page.getByRole("button", { name: "Pedir la sesión" }).click();
    const estado = page.getByTestId("sesion-fotos-estado");
    await expect(estado).toHaveAttribute("data-estado", "solicitada");
    await expect(estado).toContainText("Pediste una sesión (franja: Sábado)");
    // Con una abierta ya no se pide otra: se puede cancelar.
    await expect(
      page.getByRole("button", { name: "Pedir la sesión" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Cancelar la sesión" }),
    ).toBeVisible();

    // El operador la ve y la agenda.
    await entrarOperador(page);
    await page.goto("/operador/sesiones");
    const fila = page.locator(
      `[data-testid="fila-sesion"][data-slug="${a.slug}"]`,
    );
    await expect(fila).toHaveAttribute("data-estado", "solicitada");
    await expect(fila).toContainText("Sábado");
    const escribir = await fila
      .getByRole("link", { name: "Escribir al dueño" })
      .getAttribute("href");
    expect(decodeURIComponent(escribir ?? "")).toContain("(franja: Sábado)");

    await fila.getByRole("button", { name: "Agendar" }).click();
    // Sin fecha y hora no se guarda; una fecha de ayer tampoco.
    await fila.getByRole("button", { name: "Guardar" }).click();
    await expect(fila.getByText("Completa la fecha y la hora.")).toBeVisible();
    await fila.getByLabel("Fecha").fill(enDias(-1));
    await fila.getByLabel("Hora (Bogotá)").selectOption("10:00");
    await fila.getByRole("button", { name: "Guardar" }).click();
    await expect(
      fila.getByText("La sesión debe ser al menos una hora después de ahora."),
    ).toBeVisible();
    await fila.getByLabel("Fecha").fill(enDias(3));
    await fila.getByRole("button", { name: "Guardar" }).click();
    await expect(fila.getByText("Sesión agendada.")).toBeVisible();
    await expect(fila).toHaveAttribute("data-estado", "agendada");
    await expect(fila).toContainText("Agendada para el");
    const confirmar = await fila
      .getByRole("link", { name: "Confirmar con el dueño" })
      .getAttribute("href");
    expect(decodeURIComponent(confirmar ?? "")).toContain("(hora de Bogotá)");

    // El dueño ve la fecha.
    await page.goto(mi);
    await expect(page.getByTestId("sesion-fotos-estado")).toHaveAttribute(
      "data-estado",
      "agendada",
    );
    await expect(
      page.getByText(/Tu sesión está agendada para el/),
    ).toBeVisible();

    // El operador la da por hecha.
    await page.goto("/operador/sesiones");
    await fila.getByRole("button", { name: "Marcar como hecha" }).click();
    await fila.getByRole("button", { name: "Sí", exact: true }).click();
    await expect(fila.getByText("Sesión marcada como hecha.")).toBeVisible();
    await expect(fila).toHaveAttribute("data-estado", "hecha");

    // El dueño la ve hecha y puede pedir otra.
    await page.goto(mi);
    await expect(page.getByTestId("sesion-fotos-estado")).toHaveAttribute(
      "data-estado",
      "hecha",
    );
    await page.getByLabel("¿Qué franja te sirve?").selectOption("entre_semana");
    await page.getByRole("button", { name: "Pedir otra sesión" }).click();
    await expect(page.getByTestId("sesion-fotos-estado")).toHaveAttribute(
      "data-estado",
      "solicitada",
    );
  });

  test("el dueño cancela y el operador cancela; en los dos casos se puede pedir otra", async ({
    page,
  }) => {
    const a = await crearAnuncio();
    const mi = `/mi-anuncio#t=${a.token}`;
    await page.goto(mi);
    await page.getByLabel("¿Qué franja te sirve?").selectOption("domingo");
    await page.getByRole("button", { name: "Pedir la sesión" }).click();
    await expect(page.getByTestId("sesion-fotos-estado")).toHaveAttribute(
      "data-estado",
      "solicitada",
    );

    await page.getByRole("button", { name: "Cancelar la sesión" }).click();
    await expect(page.getByTestId("sesion-fotos-estado")).toHaveAttribute(
      "data-estado",
      "cancelada",
    );
    await expect(page.getByText("La sesión se canceló.")).toBeVisible();

    // Pide otra y ahora cancela el operador, que puede avisar al dueño con el texto ya escrito.
    await page.getByLabel("¿Qué franja te sirve?").selectOption("sabado");
    await page.getByRole("button", { name: "Pedir otra sesión" }).click();
    await expect(page.getByTestId("sesion-fotos-estado")).toHaveAttribute(
      "data-estado",
      "solicitada",
    );

    await entrarOperador(page);
    await page.goto("/operador/sesiones");
    // Las abiertas van primero: la que pidió de nuevo es la primera tarjeta del anuncio.
    const filas = page.locator(
      `[data-testid="fila-sesion"][data-slug="${a.slug}"]`,
    );
    await expect(filas).toHaveCount(2);
    const abierta = filas.first();
    await expect(abierta).toHaveAttribute("data-estado", "solicitada");
    await abierta.getByRole("button", { name: "Cancelar la sesión" }).click();
    await abierta.getByRole("button", { name: "Sí", exact: true }).click();
    await expect(abierta.getByText("Sesión cancelada.")).toBeVisible();
    await expect(abierta).toHaveAttribute("data-estado", "cancelada");
    await expect(filas.getByText("La canceló el dueño")).toHaveCount(1);
    await expect(filas.getByText("La cancelaste tú")).toHaveCount(1);
    // Avisar al dueño solo cabe cuando canceló el operador.
    await expect(
      filas.getByRole("link", { name: "Avisar al dueño" }),
    ).toHaveCount(1);

    await page.goto(mi);
    await expect(page.getByTestId("sesion-fotos-estado")).toHaveAttribute(
      "data-estado",
      "cancelada",
    );
    await expect(
      page.getByRole("button", { name: "Pedir otra sesión" }),
    ).toBeVisible();
  });
});

test.describe("lo que el dueño ve cuando el equipo actuó", () => {
  test("pausa y pedido de CTL en «Mi anuncio»; renovar dice que sigue en pausa", async ({
    page,
  }) => {
    const a = await crearAnuncio();
    const mi = `/mi-anuncio#t=${a.token}`;
    await page.goto(mi);
    await expect(
      page.getByRole("heading", { name: "Sesión de fotos" }),
    ).toBeVisible();
    await expect(page.getByTestId("aviso-pausado")).toHaveCount(0);
    await expect(page.getByTestId("aviso-ctl-pedido")).toHaveCount(0);

    consultar(`select public.pausar_anuncio('${a.id}')`);
    consultar(`select public.pedir_ctl('${a.id}')`);
    await page.reload();
    await expect(page.getByTestId("aviso-pausado")).toContainText(
      "Tu anuncio está en pausa",
    );
    await expect(page.getByTestId("aviso-ctl-pedido")).toContainText(
      "El equipo te pidió el certificado de tradición",
    );

    // Renovar le da días, pero el anuncio sigue en pausa y la tarjeta lo dice.
    await page.getByRole("button", { name: /Renovar 60 días más/ }).click();
    await expect(page.getByTestId("renovar-pausado")).toContainText(
      "lo tiene en pausa",
    );
    expect(await fichaVisible(a)).toBe(false);

    // La página de renovar también lo dice desde el principio.
    await page.goto(`/renovar#t=${a.token}`);
    await expect(page.getByTestId("renovar-pausado")).toBeVisible();

    // Reactivado, los avisos desaparecen.
    consultar(`select public.reactivar_anuncio('${a.id}')`);
    await page.goto(mi);
    await expect(
      page.getByRole("heading", { name: "Sesión de fotos" }),
    ).toBeVisible();
    await expect(page.getByTestId("aviso-pausado")).toHaveCount(0);
    await expect(page.getByTestId("aviso-ctl-pedido")).toBeVisible();
  });
});

test.describe("accesibilidad y ancho de teléfono de cada ruta nueva", () => {
  test("/antifraude: las reglas a la vista", async ({ page }) => {
    await page.goto("/antifraude");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await sinViolaciones(page);
    await sinScrollHorizontal(page);
  });

  test("/i/[slug]/reportar: sin verificar, con el formulario y ya enviado", async ({
    page,
  }) => {
    const a = await crearAnuncio();
    await page.goto(`/i/${a.slug}/reportar`);
    await expect(
      page.getByRole("heading", { name: "Primero, verifica tu WhatsApp" }),
    ).toBeVisible();
    await sinViolaciones(page);
    await sinScrollHorizontal(page);

    await comoComprador(page);
    await page.goto(`/i/${a.slug}/reportar`);
    await expect(page.getByLabel("Otra cosa")).toBeVisible();
    await sinViolaciones(page);
    await sinScrollHorizontal(page);

    await page.getByLabel("Otra cosa").check();
    await page.getByRole("button", { name: "Enviar reporte" }).click();
    await expect(page.getByRole("heading", { name: /Gracias/ })).toBeVisible();
    await sinViolaciones(page);
  });

  test("/operador/antifraude y /operador/sesiones", async ({ page }) => {
    const a = await crearAnuncio();
    const c = await comoComprador(page);
    await api().rpc("reportar_anuncio", {
      p_sesion_hash: c.hash,
      p_slug: a.slug,
      p_motivos: ["otra_cosa"],
      p_detalle: "Algo no cuadra",
    });
    await api().rpc("solicitar_sesion_fotos", {
      p_token: a.token,
      p_franja: "sabado",
    });
    await entrarOperador(page);

    await page.goto("/operador/antifraude");
    await expect(page.locator(`[data-slug="${a.slug}"]`)).toBeVisible();
    await sinViolaciones(page);
    await sinScrollHorizontal(page);

    await page.goto("/operador/sesiones");
    await expect(page.locator(`[data-slug="${a.slug}"]`)).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page
      .locator(`[data-slug="${a.slug}"]`)
      .getByRole("button", { name: "Agendar" })
      .click();
    await sinViolaciones(page);
    await sinScrollHorizontal(page);
  });

  test("«Mi anuncio» con la sesión y los avisos del equipo", async ({
    page,
  }) => {
    const a = await crearAnuncio();
    consultar(`select public.pausar_anuncio('${a.id}')`);
    consultar(`select public.pedir_ctl('${a.id}')`);
    await api().rpc("solicitar_sesion_fotos", {
      p_token: a.token,
      p_franja: "domingo",
    });
    await page.goto(`/mi-anuncio#t=${a.token}`);
    await expect(page.getByTestId("sesion-fotos-estado")).toBeVisible();
    await expect(page.getByTestId("aviso-pausado")).toBeVisible();
    await sinViolaciones(page);
    await sinScrollHorizontal(page);
  });
});
