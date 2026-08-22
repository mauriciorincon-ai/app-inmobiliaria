import { test, expect } from "@playwright/test";
import { registrar, entrarOperador } from "./utils/registrar";

// C7 (cupos operables) + C8 (lotes de campaña) desde el panel, POR LA UI, contra Postgres real.

test("fijar un cupo hace aparecer el contador honesto en la landing", async ({
  page,
}) => {
  // Usme no la usa `registrar` (usa Chapinero) → sin cupo fijado no muestra contador.
  await entrarOperador(page);
  await page.goto("/operador/zonas");
  const fila = page.getByRole("row").filter({ hasText: "Usme" });
  await fila.getByLabel("Cupo total de la zona").fill("30");
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/rpc/fijar_cupo") && r.request().method() === "POST",
    ),
    fila.getByRole("button", { name: "Fijar" }).click(),
  ]);

  // Ahora la banda de cupos aparece en la landing (escasez REAL: solo con cupo fijado).
  await page.goto("/");
  await expect(page.getByText(/cupos? de fundador en Usme/i)).toBeVisible({
    timeout: 10000,
  });
});

test("el operador envía un lote (mock) y queda registrado en el log", async ({
  page,
}) => {
  // Un fundador con correo y sin fotos ⇒ destinatario del lote "sin-fotos".
  await registrar(page, {
    nombre: "Dora Correo",
    barrioBase: "Lote",
    email: `dora-${Date.now()}@example.test`,
  });

  await entrarOperador(page);
  await page.goto("/operador/campana");

  await page.getByRole("button", { name: /Ver destinatarios/i }).click();
  await expect(page.getByText(/destinatarios? con correo/i)).toBeVisible({
    timeout: 10000,
  });

  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/envios") && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: /Enviar lote/i }).click(),
  ]);

  // En CI/dev sin API key el adapter va en mock → "modo prueba".
  await expect(page.getByText(/modo prueba/i)).toBeVisible({ timeout: 10000 });
  // El lote queda en el log de envíos.
  await expect(
    page.getByRole("cell", { name: "completa-anuncio" }).first(),
  ).toBeVisible();
});
