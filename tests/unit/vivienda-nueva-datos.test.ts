// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FilaProyecto } from "../../src/engine/vivienda-nueva/filas";

// S12 — lo que las páginas de vivienda nueva leen en el servidor. Una base falsa: la RPC pública responde lo que la
// prueba pide (una edición, nada, un error, una forma rota o una excepción) y la lectura jamás lanza. La perilla de la
// fecha solo existe con `NUEVOS_SIMULACRO=1`. Datos 100 % sintéticos.

const llamadas: Array<{ fn: string; args: unknown }> = [];
let respuesta: () => Promise<{ data: unknown; error: unknown }> = async () => ({
  data: null,
  error: null,
});

vi.mock("@/lib/supabase/server", () => ({
  crearClienteAnon: () => ({
    rpc: (fn: string, args: unknown) => {
      llamadas.push({ fn, args });
      return respuesta();
    },
  }),
}));

const { cargarNuevos, hoyNuevos, TARIFAS } =
  await import("../../src/lib/vivienda-nueva/datos");

const FILA: FilaProyecto = {
  slug: "proyecto-de-prueba",
  clave: "constructora de prueba|proyecto de prueba",
  nombre: "Proyecto de Prueba",
  constructora: "Constructora de Prueba",
  tipo: "apartamento",
  ciudad: "Bogotá",
  sector: "Suba",
  region: "bogota",
  segmento: "VIS",
  precio_desde: 250_000_000,
  area_construida_desde: null,
  area_construida_hasta: null,
  area_privada_desde: 50,
  area_privada_hasta: null,
  etapa: "no_lo_dice",
  entrega: "2028-12",
  entrega_precision: "mes",
  parqueadero: "incluido",
  parqueadero_precio: null,
  precio_fijo: "si",
  subsidio_anunciado: "no_lo_dice",
  rotulos: [],
  apariciones: [3],
  ilegibles: ["area_construida_desde"],
  en_conflicto: [],
};
const EDICION = {
  numero: 9001,
  nombre: "Edición Ficticia",
  desde: "2026-10-15",
  hasta: "2026-11-15",
  paginas: 10,
};

beforeEach(() => {
  llamadas.length = 0;
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("hoyNuevos: la fecha de Bogotá, con perilla SOLO en el simulacro", () => {
  const cabeceras = (v: string | null) => ({ get: () => v });
  // 2026-10-21 03:00 UTC = 2026-10-20 22:00 en Bogotá.
  const ahora = new Date("2026-10-21T03:00:00Z");

  it("sin simulacro, la cabecera no existe para el servidor", () => {
    vi.stubEnv("NUEVOS_SIMULACRO", "");
    expect(hoyNuevos(cabeceras("2027-01-01"), ahora)).toBe("2026-10-20");
  });

  it("con simulacro, una fecha válida manda; una inválida se ignora", () => {
    vi.stubEnv("NUEVOS_SIMULACRO", "1");
    expect(hoyNuevos(cabeceras("2027-01-01"), ahora)).toBe("2027-01-01");
    expect(hoyNuevos(cabeceras("mañana"), ahora)).toBe("2026-10-20");
    expect(hoyNuevos(cabeceras(null), ahora)).toBe("2026-10-20");
  });
});

describe("cargarNuevos: la edición que da la base para hoy, sin tumbar nunca la página", () => {
  it("pide la RPC pública con la fecha y nada más (ni ingreso ni arriendo)", async () => {
    respuesta = async () => ({ data: null, error: null });
    await cargarNuevos("2026-10-20");
    expect(llamadas).toEqual([
      { fn: "nuevos_publicados", args: { p_hoy: "2026-10-20" } },
    ]);
  });

  it("una edición publicada vuelve en la forma de los motores, con su slug", async () => {
    respuesta = async () => ({
      data: { edicion: EDICION, proyectos: [FILA] },
      error: null,
    });
    const r = await cargarNuevos("2026-10-20");
    if (r.estado !== "ok") throw new Error("debía leer");
    expect(r.leida.edicion).toEqual(EDICION);
    expect(r.leida.proyectos[0]).toMatchObject({
      slug: "proyecto-de-prueba",
      precio_desde: 250_000_000,
      area_construida_desde: "ilegible",
      etapa: "no_lo_dice",
    });
  });

  it("sin edición publicada: «sin publicar»", async () => {
    respuesta = async () => ({ data: null, error: null });
    expect(await cargarNuevos("2026-10-20")).toEqual({
      estado: "sin_publicar",
    });
  });

  it("un error de la base, una forma inesperada o una excepción: «error», nunca lanza", async () => {
    respuesta = async () => ({ data: null, error: { code: "42501" } });
    expect((await cargarNuevos("2026-10-20")).estado).toBe("error");
    respuesta = async () => ({
      data: { edicion: EDICION, proyectos: "no" },
      error: null,
    });
    expect((await cargarNuevos("2026-10-20")).estado).toBe("error");
    respuesta = async () => ({
      data: { edicion: EDICION, proyectos: [{ slug: 1 }] },
      error: null,
    });
    expect((await cargarNuevos("2026-10-20")).estado).toBe("error");
    respuesta = async () => ({
      data: { edicion: EDICION, proyectos: [null] },
      error: null,
    });
    expect((await cargarNuevos("2026-10-20")).estado).toBe("error");
    respuesta = () => Promise.reject(new Error("red caída"));
    expect((await cargarNuevos("2026-10-20")).estado).toBe("error");
  });

  it("las tarifas que usa el servidor son las de `src/data`, con los dos derechos vigentes", () => {
    expect(
      TARIFAS.conceptos
        .filter((c) => c.estado === "vigente")
        .map((c) => c.id)
        .sort(),
    ).toEqual(["derechos_notariales", "derechos_registro"]);
  });
});
