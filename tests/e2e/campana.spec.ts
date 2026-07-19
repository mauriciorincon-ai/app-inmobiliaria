import { test, expect } from "@playwright/test";
import { registrar } from "./utils/registrar";

// C7 (referido) + B3 (renovación de vigencia) POR LA UI, contra Postgres real. Datos sintéticos.

test("un registro por link de referido queda atribuido al referente", async ({
  page,
}) => {
  // A publica y, en la confirmación, obtiene su enlace de invitación (con su código de referido).
  const { link: linkA } = await registrar(page, {
    nombre: "Ana Referente",
    barrioBase: "RefA",
  });
  const invitar = page.getByRole("link", { name: /Invitar por WhatsApp/i });
  await expect(invitar).toBeVisible({ timeout: 10000 });
  const href = await invitar.getAttribute("href");
  const texto = decodeURIComponent(
    new URL(href ?? "").searchParams.get("text") ?? "",
  );
  const ref = texto.match(/[?&]ref=([A-Za-z0-9_-]{8})/)?.[1];
  expect(
    ref,
    "el mensaje de invitación lleva /publicar?ref=CODIGO",
  ).toBeTruthy();

  // B publica ENTRANDO por el link de referido de A (?ref=CODIGO).
  await registrar(page, {
    nombre: "Beto Referido",
    barrioBase: "RefB",
    ref,
  });

  // De vuelta en el anuncio de A: el conteo de referidos sube a 1 (atribución real en BD).
  await page.goto(linkA);
  await expect(
    page.getByText(/se registró 1 dueño con tu enlace/i),
  ).toBeVisible({ timeout: 10000 });
});

test("el fundador renueva la vigencia de su anuncio (POST, nunca GET)", async ({
  page,
}) => {
  const { link } = await registrar(page, {
    nombre: "Carmen Vigencia",
    barrioBase: "Vig",
  });
  await page.goto(link);

  const renovar = page.getByRole("button", { name: /Renovar 60 días más/i });
  await expect(renovar).toBeVisible({ timeout: 10000 });
  // Recién publicado ⇒ vigente.
  await expect(page.getByText(/Tu anuncio está vivo/i)).toBeVisible();

  // La renovación es un POST a la RPC; esperamos su respuesta antes de aseverar.
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/rpc/renovar_vigencia") &&
        r.request().method() === "POST",
    ),
    renovar.click(),
  ]);
  await expect(page.getByText(/No pudimos renovar/i)).toHaveCount(0);
  await expect(page.getByText(/Tu anuncio está vivo/i)).toBeVisible();
});
