import { describe, it, expect } from "vitest";
import {
  LIMITE_RESULTADOS,
  aArgsBuscar,
  aParams,
  hayFiltros,
  leerFiltros,
} from "@/engine/busqueda/filtros";

describe("filtros de búsqueda ↔ URL", () => {
  it("lee todos los filtros válidos", () => {
    const f = leerFiltros(
      new URLSearchParams(
        "op=venta&tipo=apartamento&loc=Chapinero&min=300000000&max=600000000&hab=2&zona=4.64,-74.07;4.64,-74.05;4.66,-74.05;4.66,-74.07",
      ),
    );
    expect(f).toMatchObject({
      operacion: "venta",
      tipo: "apartamento",
      localidad: "Chapinero",
      precioMin: 300000000,
      precioMax: 600000000,
      habitacionesMin: 2,
    });
    expect(f.zona).toHaveLength(4);
  });

  it("descarta lo inválido sin lanzar y conserva lo demás", () => {
    const f = leerFiltros({
      op: "permuta",
      tipo: "castillo",
      loc: "Atlántida",
      min: "-5",
      max: "1e9",
      hab: "99",
      zona: "no-es-zona",
    });
    expect(f).toEqual({});
    expect(leerFiltros({ op: "arriendo", hab: "x" })).toEqual({
      operacion: "arriendo",
    });
  });

  it("acepta los parámetros de Next (arreglos y undefined)", () => {
    expect(leerFiltros({ op: ["venta", "arriendo"], tipo: undefined })).toEqual(
      { operacion: "venta" },
    );
  });

  it("endereza un rango de precio al revés", () => {
    const f = leerFiltros({ min: "900", max: "100" });
    expect(f).toMatchObject({ precioMin: 100, precioMax: 900 });
  });

  it("aParams es canónico y hace ida y vuelta", () => {
    const entrada =
      "op=venta&tipo=casa&loc=Usaquén&min=1&max=2&hab=0&zona=4.64,-74.07;4.64,-74.05;4.66,-74.05";
    const f = leerFiltros(new URLSearchParams(entrada));
    expect(aParams(f).toString()).toBe(new URLSearchParams(entrada).toString());
    expect(leerFiltros(aParams(f))).toEqual(f);
  });

  it("hayFiltros distingue la primera vez de una búsqueda con filtros", () => {
    expect(hayFiltros({})).toBe(false);
    expect(hayFiltros({ habitacionesMin: 0 })).toBe(true);
  });

  it("aArgsBuscar manda null por lo que falta y el polígono en texto de Postgres", () => {
    expect(aArgsBuscar({})).toEqual({
      p_operacion: null,
      p_tipo: null,
      p_localidad: null,
      p_precio_min: null,
      p_precio_max: null,
      p_habitaciones_min: null,
      p_poligono: null,
      p_limite: LIMITE_RESULTADOS,
    });
    const args = aArgsBuscar(
      leerFiltros({
        op: "venta",
        hab: "0",
        zona: "4.64,-74.07;4.64,-74.05;4.66,-74.05;4.66,-74.07",
      }),
    );
    expect(args.p_operacion).toBe("venta");
    expect(args.p_habitaciones_min).toBe(0);
    expect(args.p_poligono).toBe(
      "((-74.07,4.64),(-74.05,4.64),(-74.05,4.66),(-74.07,4.66))",
    );
  });
});
