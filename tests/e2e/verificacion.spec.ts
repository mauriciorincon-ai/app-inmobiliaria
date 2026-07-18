import { test, expect } from "@playwright/test";
import { registrar, entrarOperador } from "./utils/registrar";

// Verificación nivel 2 + re-contacto desde el panel (POR LA UI). El CTL se VE fuera de la app;
// aquí el operador solo captura la matrícula y confirma. Tras verificar, el sello ⭐ aparece en
// la ficha. El re-contacto abre WhatsApp con el magic link prellenado.

test("el operador verifica un inmueble y el sello ⭐ aparece en la ficha", async ({
  page,
}) => {
  const { barrio } = await registrar(page, {
    nombre: "Carmen Verifica",
    barrioBase: "Usaquen",
  });

  await entrarOperador(page);
  const fila = page.getByRole("row").filter({ hasText: barrio });
  await expect(fila).toBeVisible({ timeout: 10000 });

  // Abrir el diálogo de verificación, capturar matrícula + confirmar que se vio el CTL.
  await fila.getByRole("button", { name: /Verificar/i }).click();
  await fila.getByLabel(/matrícula/i).fill("50N-9876543");
  await fila.getByRole("checkbox").check(); // "Vi el CTL original…"
  // `.click()` no espera al handler async; aguardamos la RESPUESTA del RPC para saber que la
  // verificación se persistió antes de recargar (si no, el reload correría contra un RPC en vuelo).
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/rpc/marcar_verificado") &&
        r.request().method() === "POST",
    ),
    fila.getByRole("button", { name: /Confirmar/i }).click(),
  ]);

  // Recargamos para un render fresco y determinista del panel (evita la carrera con el
  // router.refresh() del diálogo bajo workers paralelos) y acotamos el sello a LA fila del test:
  // /operador muestra TODOS los inmuebles y otros tests verifican varios.
  await page.reload();
  const filaVerificada = page.getByRole("row").filter({ hasText: barrio });
  await expect(filaVerificada.getByText(/Propietario verificado/i)).toBeVisible(
    { timeout: 10000 },
  );

  // Y el sello aparece en la ficha pública. Esperamos la navegación in-tab ANTES de aseverar, si
  // no la aserción caería sobre el DOM de /operador (con muchos sellos) → strict violation.
  await filaVerificada.getByRole("link", { name: /Ver ficha/i }).click();
  await page.waitForURL(/\/i\//);
  await expect(page.getByText(/⭐ Propietario verificado/i)).toBeVisible();
});

test("el re-contacto abre WhatsApp con el magic link prellenado", async ({
  page,
  context,
}) => {
  // wa.me es externo: lo interceptamos para que el popup no cuelgue en CI.
  await context.route(/wa\.me\/.*/, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "ok" }),
  );

  const { barrio } = await registrar(page, {
    nombre: "Diego Recontacto",
    barrioBase: "Cedritos",
  });
  await entrarOperador(page);
  const fila = page.getByRole("row").filter({ hasText: barrio });
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
