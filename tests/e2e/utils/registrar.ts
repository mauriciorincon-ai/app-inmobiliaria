import { expect, type Page } from "@playwright/test";

// Registra un inmueble POR LA UI (landing → 3 pasos) con un barrio único por corrida. Devuelve el
// barrio (para anclar aserciones) y el magic link (de la confirmación). Datos 100% sintéticos.
export async function registrar(
  page: Page,
  opts: { nombre?: string; barrioBase?: string } = {},
): Promise<{ barrio: string; link: string }> {
  const barrio = `${opts.barrioBase ?? "Cedritos"} ${Date.now()}`;
  await page.goto("/publicar");
  await page.getByLabel("Cómo te llamas").fill(opts.nombre ?? "Ana Fundadora");
  await page.getByLabel("Tu WhatsApp").fill("300 123 4567");
  await page.getByLabel("ciudad está tu inmueble").fill("Bogotá");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("radio", { name: "Venta" }).check({ force: true });
  await page.getByLabel("Tipo de inmueble").selectOption("apartamento");
  await page.getByLabel("Barrio o zona").fill(barrio);
  await page.getByLabel("Área (m²)").fill("78");
  await page.getByLabel("Habitaciones").fill("3");
  await page.getByLabel("Precio esperado (COP)").fill("420000000");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Publicar mi inmueble" }).click();
  await expect(page).toHaveURL(/\/confirmacion$/);

  const link = (await page.getByRole("textbox").inputValue()) as string;
  return { barrio, link };
}

export async function entrarOperador(page: Page): Promise<void> {
  const email = process.env.OPERADOR_EMAIL ?? "operador@innmobiliaria.test";
  const password = process.env.OPERADOR_PASSWORD ?? "operador-seguro-123";
  await page.goto("/operador/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/operador$/);
}
