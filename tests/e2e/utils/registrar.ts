import { expect, type Page } from "@playwright/test";

// Registra un inmueble POR LA UI (landing → 3 pasos). Desde el S6 el barrio es un select del catálogo
// catastral (ADR 014), así que ya no es único por corrida: cada registro lleva un NOMBRE único
// (`Ana Fundadora 1760…`) y las aserciones anclan por él (la fila del panel muestra el nombre) o por
// el slug. Devuelve el barrio elegido, el nombre y el magic link (de la confirmación). Datos 100 %
// sintéticos.
let secuencia = 0;

export async function registrar(
  page: Page,
  opts: {
    nombre?: string; // prefijo legible; siempre se le agrega un sufijo único
    ref?: string; // llega por link de referido (?ref=)
    email?: string; // correo opcional (habilita lotes de campaña)
    localidad?: string; // localidad de Bogotá (cupos); default Chapinero
    barrio?: string; // barrio del catálogo dentro de esa localidad; default Los Rosales
  } = {},
): Promise<{ barrio: string; nombre: string; link: string }> {
  const localidad = opts.localidad ?? "Chapinero";
  const barrio = opts.barrio ?? "Los Rosales";
  const nombre = `${opts.nombre ?? "Ana Fundadora"} ${Date.now()}${++secuencia}`;
  await page.goto(opts.ref ? `/publicar?ref=${opts.ref}` : "/publicar");
  await page.getByLabel("Cómo te llamas").fill(nombre);
  await page.getByLabel("Tu WhatsApp").fill("300 123 4567");
  await page.getByLabel("ciudad está tu inmueble").fill("Bogotá");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("radio", { name: "Venta" }).check({ force: true });
  await page.getByLabel("Tipo de inmueble").selectOption("apartamento");
  await page.getByLabel("Localidad").selectOption(localidad);
  await page.getByLabel("Barrio").selectOption(barrio);
  await page.getByLabel("Área (m²)").fill("78");
  await page.getByLabel("Habitaciones").fill("3");
  await page.getByLabel("Precio esperado (COP)").fill("420000000");
  await page.getByRole("button", { name: "Continuar" }).click();

  if (opts.email) {
    await page.getByLabel("Tu correo (opcional)").fill(opts.email);
  }
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Publicar mi inmueble" }).click();
  await expect(page).toHaveURL(/\/confirmacion$/);

  const link = (await page.getByRole("textbox").inputValue()) as string;
  return { barrio, nombre, link };
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
