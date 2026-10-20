import { describe, it, expect } from "vitest";
import {
  claveGrupo,
  escalaBarra,
  evaluarAnuncios,
  grupoDe,
  gruposDe,
  montoCorto,
  type AnuncioPorEvaluar,
  type RangoConDatos,
} from "@/engine/precio/presentacion";
import { rangoDePrecio, type Comparable } from "@/engine/precio/comparables";

// Lo que la interfaz de «¿Está caro?» pinta (S10): la escala de la barra, las cifras en millones y el reparto de los
// anuncios de Comparar en grupos de comparables.
const FUENTE = { nombre: "anuncios (prueba)", fecha: "2026-10-19" };
const M = 1_000_000;

function rango(m2: number, comparables: number[], area = 80): RangoConDatos {
  const cs: Comparable[] = comparables.map((v, i) => ({
    slug: `c${i}`,
    sector_codigo: "008108",
    area_m2: area,
    precio_esperado: Math.round(v * M * area),
  }));
  const r = rangoDePrecio(
    {
      slug: "este",
      sector_codigo: "008108",
      area_m2: area,
      precio_esperado: Math.round(m2 * M * area),
    },
    cs,
    FUENTE,
  );
  if (r.estado === "sin_datos") throw new Error("la prueba necesita datos");
  return r;
}

describe("montoCorto", () => {
  it("escribe los millones con un decimal en cada idioma", () => {
    expect(montoCorto(9_700_000, "es")).toBe("$9,7 M");
    expect(montoCorto(9_700_000, "en")).toBe("COP 9.7M");
    expect(montoCorto(14_000_000, "es")).toBe("$14 M");
  });

  it("un arriendo por m² (menos de un millón) se escribe completo, no en «0,1 M»", () => {
    expect(montoCorto(52_000, "es")).toBe("$52.000");
    expect(montoCorto(52_000, "en")).toBe("COP 52,000");
  });
});

describe("escalaBarra", () => {
  const r = rango(5.5, [5.0, 5.2, 5.4, 5.6, 5.8, 6.0]);

  it("la banda es P25–P75 y queda dentro de la escala, con aire a los lados", () => {
    const e = rango(5.5, [5.0, 5.2, 5.4, 5.6, 5.8, 6.0]);
    const s = escalaBarra(e);
    expect(s.desde).toBeLessThan(5_000_000);
    expect(s.hasta).toBeGreaterThan(6_000_000);
    expect(s.izquierdaBanda).toBeGreaterThan(0);
    expect(s.izquierdaBanda + s.anchoBanda).toBeLessThan(100);
    expect(s.anchoBanda).toBeGreaterThan(0);
  });

  it("la marca cae dentro de la banda si el precio está en rango", () => {
    const s = escalaBarra(r);
    expect(r.estado).toBe("en_rango");
    expect(s.marca).toBeGreaterThanOrEqual(s.izquierdaBanda);
    expect(s.marca).toBeLessThanOrEqual(s.izquierdaBanda + s.anchoBanda);
  });

  it("un precio caro queda a la derecha de la banda y uno sospechoso a la izquierda", () => {
    const caro = escalaBarra(rango(8, [5.0, 5.2, 5.4, 5.6, 5.8, 6.0]));
    expect(caro.marca).toBeGreaterThan(caro.izquierdaBanda + caro.anchoBanda);
    const barato = escalaBarra(rango(2.5, [5.0, 5.2, 5.4, 5.6, 5.8, 6.0]));
    expect(barato.marca).toBeLessThan(barato.izquierdaBanda);
  });

  it("incluso un precio fuera de todo el conjunto cabe en la barra (0–100)", () => {
    for (const m2 of [0.3, 40]) {
      const s = escalaBarra(rango(m2, [5.0, 5.2, 5.4, 5.6, 5.8, 6.0]));
      expect(s.marca).toBeGreaterThanOrEqual(0);
      expect(s.marca).toBeLessThanOrEqual(100);
      expect(s.desde).toBeLessThanOrEqual(Math.min(m2 * M, 5 * M));
    }
  });

  it("con todos los comparables iguales no divide entre cero", () => {
    const s = escalaBarra(rango(5, [5, 5, 5, 5, 5]));
    expect(Number.isFinite(s.marca)).toBe(true);
    expect(Number.isFinite(s.anchoBanda)).toBe(true);
  });
});

describe("grupos de comparables para Comparar", () => {
  const a = (
    slug: string,
    p: Partial<AnuncioPorEvaluar> = {},
  ): AnuncioPorEvaluar => ({
    slug,
    operacion: "venta",
    tipo: "apartamento",
    localidad: "Chapinero",
    sector_codigo: "008108",
    area_m2: 80,
    precio_esperado: 400 * M,
    ...p,
  });

  it("la clave identifica operación, tipo y localidad; sin localidad no hay grupo", () => {
    expect(
      claveGrupo({ operacion: "venta", tipo: "casa", localidad: "Suba" }),
    ).toBe("venta|casa|Suba");
    expect(grupoDe(a("x", { localidad: null }))).toBeNull();
  });

  it("agrupa sin repetir y deja fuera a los que no tienen localidad", () => {
    const grupos = gruposDe([
      a("a"),
      a("b"),
      a("c", { tipo: "casa" }),
      a("d", { operacion: "arriendo" }),
      a("e", { localidad: null }),
    ]);
    expect(grupos.map(claveGrupo).sort()).toEqual([
      "arriendo|apartamento|Chapinero",
      "venta|apartamento|Chapinero",
      "venta|casa|Chapinero",
    ]);
  });

  it("cada anuncio se evalúa contra los comparables de SU grupo; sin grupo, «sin datos»", () => {
    const delGrupo: Comparable[] = [5.0, 5.2, 5.4, 5.6, 5.8, 6.0].map(
      (v, i) => ({
        slug: `g${i}`,
        sector_codigo: "008108",
        area_m2: 80,
        precio_esperado: Math.round(v * M * 80),
      }),
    );
    const barato = a("barato", { precio_esperado: Math.round(2.5 * M * 80) });
    const sinLocalidad = a("sin", { localidad: null });
    const deOtroGrupo = a("casa", { tipo: "casa" });
    const salida = evaluarAnuncios(
      [barato, sinLocalidad, deOtroGrupo],
      new Map([["venta|apartamento|Chapinero", delGrupo]]),
      FUENTE,
    );
    expect(salida.get("barato")?.estado).toBe("sospechoso");
    expect(salida.get("sin")?.estado).toBe("sin_datos");
    // La casa no usa los comparables del apartamento: ningún comparable ⇒ «sin datos».
    const casa = salida.get("casa");
    expect(casa?.estado).toBe("sin_datos");
    expect(casa && casa.estado === "sin_datos" ? casa.n : -1).toBe(0);
  });
});
