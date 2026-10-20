import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { consultar, ejecutar } from "./utils/bd";
import { crearAnuncio, precioUnico, vencer } from "./utils/anuncios";
import { fechaBogota } from "./utils/fechas";
import type {
  ComparablePrecio,
  TasaVivienda,
} from "../../src/lib/supabase/types";

// S10 «Decidir con números» — la base de datos: la tasa de vivienda con su fecha y los comparables de precio.
// Habla con las RPC públicas con el anon key real y llama como `postgres` a la del servidor (el rol con el que la
// llamaría la llave de servicio). Datos 100 % sintéticos; cada prueba crea sus propios anuncios porque la base
// local se comparte entre specs (por eso se filtra por los slugs propios y nunca se cuenta nada global).

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const DIRECCION = "Calle 93 # 14-20 piso 3";

const api = () => createClient(url, anon);

// Un día de corte que ninguna otra prueba usa (hace 400 días) para no pisar la tasa que otras specs guarden.
const CORTE_PROPIO = fechaBogota(400);

// Las pruebas de la tasa comparten un día de corte: en serie, para que no se pisen entre sí.
test.describe.configure({ mode: "serial" });

test.beforeEach(() => {
  test.skip(test.info().project.name !== "desktop-chromium", "una sola vez");
});

test.afterAll(() => {
  consultar(
    `delete from public.tasas_vivienda where fecha_corte = date '${CORTE_PROPIO}'`,
  );
});

function guardarComoServidor(
  fecha: string,
  tasa: string,
  creditos: number,
  entidades: number,
) {
  return ejecutar(
    `select public.guardar_tasa_vivienda(date '${fecha}', ${tasa}, ${creditos}, ${entidades}, 'Superfinanciera (prueba)')`,
  );
}

// ── La tasa ──────────────────────────────────────────────────────────────────

test("el anónimo NO lee ni escribe la tabla de tasas", async () => {
  const supabase = api();
  const { data } = await supabase.from("tasas_vivienda").select("*");
  expect(data ?? []).toHaveLength(0);
  const { error } = await supabase
    .from("tasas_vivienda")
    .insert({ fecha_corte: CORTE_PROPIO, tasa_ea: 15 } as never);
  expect(error).not.toBeNull();
});

test("el anónimo NO puede guardar la tasa (solo el servidor, el cron)", async () => {
  const { error } = await api().rpc("guardar_tasa_vivienda", {
    p_fecha_corte: CORTE_PROPIO,
    p_tasa_ea: 15,
    p_creditos: 1,
    p_entidades: 1,
    p_fuente: "intruso",
  });
  expect(error?.code).toBe("42501");
  const filas = consultar(
    `select count(*) from public.tasas_vivienda where fecha_corte = date '${CORTE_PROPIO}'`,
  );
  expect(filas[0]).toBe("0");
});

test("tasa_vivienda() devuelve la de la fecha de corte más reciente, con su fecha y su fuente", async () => {
  guardarComoServidor(CORTE_PROPIO, "14.250", 500, 12);
  const { data, error } = await api().rpc("tasa_vivienda");
  expect(error).toBeNull();
  const tasa = data as TasaVivienda | null;
  expect(tasa).not.toBeNull();
  // La RPC y la tabla coinciden en cuál es la última (otras specs pueden haber guardado una más reciente).
  const [maxima] = consultar(
    "select max(fecha_corte)::text from public.tasas_vivienda",
  );
  expect(tasa!.fecha_corte).toBe(maxima);
  expect(Object.keys(tasa!).sort()).toEqual(
    ["creditos", "entidades", "fecha_corte", "fuente", "tasa_ea"].sort(),
  );
});

test("guardar dos veces la misma fecha de corte actualiza la fila: una sola por día", async () => {
  guardarComoServidor(CORTE_PROPIO, "14.250", 500, 12);
  guardarComoServidor(CORTE_PROPIO, "15.480", 686, 13);
  const filas = consultar(
    `select tasa_ea::text || '|' || creditos || '|' || entidades from public.tasas_vivienda where fecha_corte = date '${CORTE_PROPIO}'`,
  );
  expect(filas).toEqual(["15.480|686|13"]);
});

test("una fecha futura o una tasa fuera de 1–60 % se rechaza", async () => {
  const futuro = fechaBogota(-3);
  expect(() => guardarComoServidor(futuro, "15.000", 1, 1)).toThrow(
    /fecha_invalida/,
  );
  expect(() => guardarComoServidor(CORTE_PROPIO, "0.500", 1, 1)).toThrow(
    /check|tasa_ea/i,
  );
  expect(() => guardarComoServidor(CORTE_PROPIO, "61.000", 1, 1)).toThrow(
    /check|tasa_ea/i,
  );
});

// ── Los comparables de precio ────────────────────────────────────────────────

function comparables(
  operacion: "venta" | "arriendo",
  tipo: "apartamento" | "casa" | "apartaestudio" | "otro",
  localidad: string,
) {
  return api().rpc("comparables_precio", {
    p_operacion: operacion,
    p_tipo: tipo,
    p_localidad: localidad,
  });
}

test("comparables_precio devuelve los anuncios visibles con SOLO cuatro campos, sin dirección ni datos del vendedor", async () => {
  const a = await crearAnuncio({ direccion: DIRECCION, precio: precioUnico() });
  const { data, error } = await comparables(
    "venta",
    "apartamento",
    "Chapinero",
  );
  expect(error).toBeNull();
  const filas = data as unknown as ComparablePrecio[];
  const mia = filas.find((f) => f.slug === a.slug);
  expect(mia).toBeDefined();
  expect(Object.keys(mia!).sort()).toEqual(
    ["area_m2", "precio_esperado", "sector_codigo", "slug"].sort(),
  );
  expect(mia!.area_m2).toBe(78);
  expect(mia!.precio_esperado).toBe(a.precio);
  const texto = JSON.stringify(data);
  expect(texto).not.toContain(DIRECCION);
  expect(texto).not.toContain("Sintetico");
  expect(texto).not.toContain("+57300");
});

test("respeta la visibilidad de /buscar: un anuncio vencido no es comparable", async () => {
  const vivo = await crearAnuncio();
  const muerto = await crearAnuncio();
  vencer(muerto);
  const { data } = await comparables("venta", "apartamento", "Chapinero");
  const slugs = (data as unknown as ComparablePrecio[]).map((f) => f.slug);
  expect(slugs).toContain(vivo.slug);
  expect(slugs).not.toContain(muerto.slug);
});

test("filtra por operación, tipo y localidad (sin distinguir mayúsculas)", async () => {
  const apto = await crearAnuncio({ tipo: "apartamento" });
  const casa = await crearAnuncio({ tipo: "casa" });
  const arriendo = await crearAnuncio({ operacion: "arriendo" });
  const lista = async (
    op: "venta" | "arriendo",
    tipo: "apartamento" | "casa",
    loc: string,
  ) =>
    (
      (await comparables(op, tipo, loc)).data as unknown as ComparablePrecio[]
    ).map((f) => f.slug);

  const aptosVenta = await lista("venta", "apartamento", "chapinero");
  expect(aptosVenta).toContain(apto.slug);
  expect(aptosVenta).not.toContain(casa.slug);
  expect(aptosVenta).not.toContain(arriendo.slug);

  expect(await lista("venta", "casa", "CHAPINERO")).toContain(casa.slug);
  expect(await lista("arriendo", "apartamento", "Chapinero")).toContain(
    arriendo.slug,
  );
  expect(await lista("venta", "apartamento", "Suba")).not.toContain(apto.slug);
});

test("con operación, tipo o localidad en null devuelve [] (no sirve para volcar el catálogo)", async () => {
  await crearAnuncio();
  const supabase = api();
  for (const args of [
    { p_operacion: null, p_tipo: "apartamento", p_localidad: "Chapinero" },
    { p_operacion: "venta", p_tipo: null, p_localidad: "Chapinero" },
    { p_operacion: "venta", p_tipo: "apartamento", p_localidad: null },
  ]) {
    const { data, error } = await supabase.rpc(
      "comparables_precio",
      args as never,
    );
    expect(error).toBeNull();
    expect(data).toEqual([]);
  }
});

test("buscar_inmuebles sigue igual: la migración 14 no toca la búsqueda", async () => {
  const a = await crearAnuncio();
  const { data, error } = await api().rpc("buscar_inmuebles", {
    p_precio_min: a.precio,
    p_precio_max: a.precio,
  });
  expect(error).toBeNull();
  const filas = data as unknown as Array<{ slug: string }>;
  expect(filas.map((f) => f.slug)).toEqual([a.slug]);
});
