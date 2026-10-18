import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { entrarOperador } from "./utils/registrar";

// Un anuncio de ANTES del catálogo (barrio escrito a mano, que no existe en el catálogo catastral) queda
// «sin barrio del catálogo»: aparece en la búsqueda por filtro pero no en la zona dibujada. El operador
// le asigna uno desde el panel y desde ese momento entra en la zona de su barrio. Datos sintéticos.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const ZONA_ROSALES =
  "((-74.06,4.65),(-74.04,4.65),(-74.04,4.67),(-74.06,4.67))";

test("el operador asigna un barrio del catálogo y el anuncio entra en la zona dibujada", async ({
  page,
}) => {
  const barrioLibre = `Barrio Libre ${Date.now()}`;
  const supabase = createClient(url, anon);
  const { data, error } = await supabase.rpc("registrar_fundador", {
    p_nombre: "Gloria Sintetica",
    p_whatsapp: "+573001234567",
    p_email: null,
    p_ciudad: "Bogotá",
    p_zona: "Chapinero",
    p_operacion: "venta",
    p_tipo: "apartamento",
    p_barrio: barrioLibre,
    p_direccion: null,
    p_area: 70,
    p_habitaciones: 2,
    p_precio: 380000000,
    p_consentimiento: true,
    p_ip_hash: `barrio-${Date.now()}`,
  });
  expect(error).toBeNull();
  const slug = (data as unknown as { slug: string }).slug;

  const enZona = async () => {
    const r = await supabase.rpc("buscar_inmuebles", {
      p_poligono: ZONA_ROSALES,
    });
    return ((r.data ?? []) as unknown as { slug: string }[]).map((f) => f.slug);
  };
  expect(await enZona()).not.toContain(slug);

  await entrarOperador(page);
  const fila = page.getByRole("row").filter({ hasText: barrioLibre });
  await expect(fila.getByText("Sin barrio del catálogo")).toBeVisible({
    timeout: 10000,
  });

  await fila.getByRole("button", { name: /Asignar barrio/i }).click();
  // La localidad ya viene de lo que el vendedor eligió al publicar.
  await expect(fila.getByLabel("Localidad")).toHaveValue("Chapinero");
  await fila.getByLabel("Barrio").selectOption({ label: "Los Rosales" });
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/rest/v1/inmuebles") &&
        r.request().method() === "PATCH",
    ),
    fila.getByRole("button", { name: "Asignar", exact: true }).click(),
  ]);

  // Ya no es «libre»: la fila se ubica por el nombre del catálogo.
  await page.reload();
  await expect(page.getByText(barrioLibre)).toHaveCount(0);
  expect(await enZona()).toContain(slug);
});
