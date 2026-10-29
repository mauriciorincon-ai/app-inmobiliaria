import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { consultar } from "./utils/bd";
import { fechaBogota } from "./utils/fechas";
import { entrarOperador } from "./utils/registrar";

// S16 (auditoría) — «Verificar ⭐» en el panel: lo que dice cada error de la base, en palabras del operador (antes, siempre «no se
// pudo»: deuda del S6). Las dos ramas que no tenían prueba: el anuncio que ya no existe y la sesión que se cerró. Datos sintéticos.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

test.beforeEach(() => {
  test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
});

async function prepararVerificacion(page: Page) {
  const barrio = `Barrio Verificar ${Date.now()}`;
  const { data, error } = await createClient(url, anon).rpc(
    "registrar_fundador",
    {
      p_nombre: "Gloria Sintetica",
      p_whatsapp: "+573001234567",
      p_email: null,
      p_ciudad: "Bogotá",
      p_zona: "Chapinero",
      p_operacion: "venta",
      p_tipo: "apartamento",
      p_barrio: barrio,
      p_direccion: null,
      p_area: 70,
      p_habitaciones: 2,
      p_precio: 380000000,
      p_consentimiento: true,
      p_ip_hash: `verificar-${Date.now()}`,
    },
  );
  expect(error).toBeNull();
  const slug = (data as unknown as { slug: string }).slug;
  const [id] = consultar(
    `select id from public.inmuebles where slug = '${slug}'`,
  );

  await entrarOperador(page);
  const fila = page.getByRole("row").filter({ hasText: barrio });
  await fila.getByRole("button", { name: "Verificar ⭐" }).click();
  await fila
    .getByLabel("Número de matrícula (del CTL)")
    .fill(`50N-${Date.now() % 1e8}`);
  await fila.getByLabel("Fecha en que se expidió el CTL").fill(fechaBogota(1));
  await fila.getByLabel("Vi el CTL original").check();
  return { id, fila };
}

test("verificar un anuncio que ya no existe dice «Ese anuncio ya no existe.»", async ({
  page,
}) => {
  const { id, fila } = await prepararVerificacion(page);
  consultar(`delete from public.inmuebles where id = '${id}'`);
  await fila.getByRole("button", { name: "Confirmar" }).click();
  await expect(fila.getByRole("alert")).toHaveText("Ese anuncio ya no existe.");
});

test("verificar con la sesión del operador cerrada dice que vuelva a entrar", async ({
  page,
  context,
}) => {
  const { fila } = await prepararVerificacion(page);
  // La sesión del navegador se pierde a mitad (se vence o se cierra en otra pestaña): la base ve a un anónimo.
  await context.clearCookies();
  await page.evaluate(() => window.localStorage.clear());
  await fila.getByRole("button", { name: "Confirmar" }).click();
  await expect(fila.getByRole("alert")).toHaveText(
    "Tu sesión de operador se cerró. Vuelve a entrar y repite la verificación.",
  );
});
