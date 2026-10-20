import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { consultar } from "./utils/bd";
import type { TasaVivienda } from "../../src/lib/supabase/types";

// S10 «Decidir con números» — el paso «tasa» del cron diario contra la app construida. Con `TASA_SIMULACRO=1` (CI y
// pruebas) el cron no sale a la red: usa la respuesta fija del conjunto de la Superfinanciera, o una caída si la prueba
// manda `x-tasa-simulacro: fallo`. Las corridas se limitan a una alerta inexistente para no llevarse los resúmenes de
// otras pruebas (S9).

const CRON = process.env.CRON_SECRET ?? "";
const CORTE = "2026-10-09";

// Las dos pruebas tocan la misma fila de la tasa: en serie, y una sola vez (no por proyecto).
test.describe.configure({ mode: "serial" });
test.beforeEach(() => {
  test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
  test.skip(!CRON, "sin CRON_SECRET en el entorno de la prueba");
});

function correr(
  request: import("@playwright/test").APIRequestContext,
  extra: Record<string, string> = {},
) {
  return request.post("/api/cron/diario", {
    headers: {
      authorization: `Bearer ${CRON}`,
      "x-alertas-solo": "00000000-0000-0000-0000-000000000000",
      ...extra,
    },
  });
}

test("el cron guarda la tasa de vivienda con su fecha de corte y la expone a cualquiera", async ({
  request,
}) => {
  consultar(
    `delete from public.tasas_vivienda where fecha_corte = date '${CORTE}'`,
  );
  const r = await correr(request);
  expect(r.status()).toBe(200);
  expect(await r.json()).toMatchObject({ tasa: "guardada" });
  const fila = consultar(
    `select tasa_ea::text || '|' || creditos || '|' || entidades from public.tasas_vivienda where fecha_corte = date '${CORTE}'`,
  );
  expect(fila).toEqual(["15.480|686|13"]);

  // Cualquiera (la llave anónima) lee la última tasa con su fecha: la de la base, no una inventada.
  const { data, error } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ).rpc("tasa_vivienda");
  expect(error).toBeNull();
  const [maxima] = consultar(
    "select max(fecha_corte)::text from public.tasas_vivienda",
  );
  expect((data as TasaVivienda).fecha_corte).toBe(maxima);

  // Una segunda corrida el mismo día no duplica: la misma fila.
  expect((await correr(request)).status()).toBe(200);
  expect(
    consultar(
      `select count(*) from public.tasas_vivienda where fecha_corte = date '${CORTE}'`,
    ),
  ).toEqual(["1"]);
});

test("si el conjunto de la Superfinanciera se cae, la corrida sigue y la tasa guardada no se toca", async ({
  request,
}) => {
  const antes = consultar(
    `select tasa_ea::text || '|' || leida_at from public.tasas_vivienda where fecha_corte = date '${CORTE}'`,
  );
  const r = await correr(request, { "x-tasa-simulacro": "fallo" });
  expect(r.status()).toBe(200);
  const cuerpo = await r.json();
  expect(cuerpo).toMatchObject({ tasa: "fallo_red" });
  expect(cuerpo).toHaveProperty("recordatorios");
  expect(cuerpo).toHaveProperty("purga");
  const despues = consultar(
    `select tasa_ea::text || '|' || leida_at from public.tasas_vivienda where fecha_corte = date '${CORTE}'`,
  );
  expect(despues).toEqual(antes);
});
