import { test, expect } from "@playwright/test";
import { registrar, entrarOperador } from "./utils/registrar";
import { consultar, ejecutar } from "./utils/bd";
import { fechaBogota } from "./utils/fechas";

// Verificación nivel 2 + re-contacto desde el panel (POR LA UI). El CTL se VE fuera de la app; aquí el
// operador captura la matrícula y la FECHA en que se expidió (máximo 30 días) y confirma. Tras
// verificar, el sello ⭐ y la fecha aparecen en la ficha. El re-contacto abre WhatsApp con el magic link
// prellenado. Las filas del panel se anclan por el NOMBRE único de cada registro (el barrio es del
// catálogo y ya no es único).

test("el operador verifica con la fecha del CTL y el sello ⭐ la muestra en la ficha", async ({
  page,
}) => {
  const { nombre } = await registrar(page, {
    nombre: "Carmen Verifica",
    localidad: "Usaquén",
    barrio: "Usaquén",
  });

  await entrarOperador(page);
  const fila = page.getByRole("row").filter({ hasText: nombre });
  await expect(fila).toBeVisible({ timeout: 10000 });

  // Abrir el diálogo de verificación: matrícula + fecha del CTL + confirmar que se vio el CTL.
  await fila.getByRole("button", { name: /Verificar/i }).click();
  await fila.getByLabel(/matrícula/i).fill("50N-9876543");
  await fila.getByLabel(/Fecha en que se expidió el CTL/i).fill(fechaBogota(3));
  await fila.getByRole("checkbox").check(); // "Vi el CTL original…"
  // `.click()` no espera al handler async; aguardamos la RESPUESTA del RPC para saber que la
  // verificación se persistió antes de recargar.
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/rpc/marcar_verificado_ctl") &&
        r.request().method() === "POST",
    ),
    fila.getByRole("button", { name: /Confirmar/i }).click(),
  ]);

  // Recargamos para un render fresco y acotamos el sello a LA fila del test.
  await page.reload();
  const filaVerificada = page.getByRole("row").filter({ hasText: nombre });
  await expect(filaVerificada.getByText(/Propietario verificado/i)).toBeVisible(
    { timeout: 10000 },
  );
  await expect(
    filaVerificada.getByText(/CTL del \d{1,2} \w+ \d{4}/),
  ).toBeVisible();

  // En la ficha: el sello, la fecha del CTL expedido, la vigencia y el barrio del catálogo.
  await filaVerificada.getByRole("link", { name: /Ver ficha/i }).click();
  await page.waitForURL(/\/i\//);
  await expect(
    page.getByText(/⭐ Propietario verificado/i).first(),
  ).toBeVisible();
  await expect(page.getByText(/expedido el \d{1,2} \w+ \d{4}/)).toBeVisible();
  await expect(page.getByText(/Vivo: el dueño lo confirmó hoy/)).toBeVisible();
  await expect(page.getByText(/Usaquén, Usaquén/)).toBeVisible();
});

test("un CTL de más de 30 días no se puede registrar: el aviso sale y Confirmar queda apagado", async ({
  page,
}) => {
  const { nombre } = await registrar(page, { nombre: "Dario CTL Viejo" });
  await entrarOperador(page);
  const fila = page.getByRole("row").filter({ hasText: nombre });
  await fila.getByRole("button", { name: /Verificar/i }).click();
  await fila.getByLabel(/matrícula/i).fill("50N-1111111");
  await fila
    .getByLabel(/Fecha en que se expidió el CTL/i)
    .fill(fechaBogota(31));
  await fila.getByRole("checkbox").check();
  await expect(fila.getByRole("alert")).toContainText(/más de 30 días/i);
  await expect(fila.getByRole("button", { name: /Confirmar/i })).toBeDisabled();
  // Con una fecha de hoy sí se habilita.
  await fila.getByLabel(/Fecha en que se expidió el CTL/i).fill(fechaBogota(0));
  await expect(fila.getByRole("button", { name: /Confirmar/i })).toBeEnabled();
});

test("un verificado de antes (sin fecha de CTL) queda en «re-verificación pendiente» hasta registrar uno nuevo", async ({
  page,
}) => {
  const { nombre } = await registrar(page, { nombre: "Elena Pendiente" });
  // La verificación de antes del S6: nivel y matrícula, sin fecha del CTL.
  const [id] = consultar(
    `select i.id from public.inmuebles i join public.vendedores v on v.id = i.vendedor_id where v.nombre = '${nombre}'`,
  );
  ejecutar(`select public.marcar_verificado('${id}', '50N-2222222')`);

  await entrarOperador(page);
  const fila = page.getByRole("row").filter({ hasText: nombre });
  await expect(fila.getByText(/Re-verificación pendiente/)).toBeVisible({
    timeout: 10000,
  });

  // La ficha dice por qué: el comprador no ve una fecha inventada.
  await fila.getByRole("link", { name: /Ver ficha/i }).click();
  await page.waitForURL(/\/i\//);
  await expect(page.getByText(/estamos renovando la prueba/)).toBeVisible();
  await page.goBack();

  // El operador registra el CTL nuevo y el sello vuelve a mostrarse completo.
  await page.reload();
  const filaPendiente = page.getByRole("row").filter({ hasText: nombre });
  await filaPendiente
    .getByRole("button", { name: /Registrar CTL nuevo/i })
    .click();
  await filaPendiente.getByLabel(/matrícula/i).fill("50N-2222222");
  await filaPendiente
    .getByLabel(/Fecha en que se expidió el CTL/i)
    .fill(fechaBogota(1));
  await filaPendiente.getByRole("checkbox").check();
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/rpc/marcar_verificado_ctl") &&
        r.request().method() === "POST",
    ),
    filaPendiente.getByRole("button", { name: /Confirmar/i }).click(),
  ]);
  await page.reload();
  const filaAlDia = page.getByRole("row").filter({ hasText: nombre });
  await expect(filaAlDia.getByText(/Propietario verificado/)).toBeVisible({
    timeout: 10000,
  });
  await expect(filaAlDia.getByText(/Re-verificación pendiente/)).toHaveCount(0);
});

test("el re-contacto abre WhatsApp con el magic link prellenado", async ({
  page,
  context,
}) => {
  // wa.me es externo: lo interceptamos para que el popup no cuelgue en CI.
  await context.route(/wa\.me\/.*/, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "ok" }),
  );

  const { nombre } = await registrar(page, { nombre: "Diego Recontacto" });
  await entrarOperador(page);
  const fila = page.getByRole("row").filter({ hasText: nombre });
  await expect(fila).toBeVisible({ timeout: 10000 });

  const popupPromise = page.waitForEvent("popup");
  await fila
    .getByRole("button", { name: /Re-contactar por WhatsApp/i })
    .click();
  const popup = await popupPromise;
  await popup.waitForLoadState().catch(() => {});
  // El enlace lleva al número (wa.me) y el texto trae el magic link del anuncio.
  expect(popup.url()).toContain("wa.me/573001234567");
  expect(decodeURIComponent(popup.url())).toContain("/mi-anuncio#t=");
});
