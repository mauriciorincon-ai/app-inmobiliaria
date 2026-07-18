import { describe, expect, it } from "vitest";
import { formatearCOP, parsearCOP } from "@/engine/format/cop";

describe("formatearCOP", () => {
  it("formatea con separador de miles y sin decimales", () => {
    expect(formatearCOP(420000000)).toBe("$420.000.000");
    expect(formatearCOP(1000000)).toBe("$1.000.000");
  });

  it("redondea a entero", () => {
    expect(formatearCOP(1000000.7)).toBe("$1.000.001");
  });

  it("devuelve cadena vacía para valores no finitos", () => {
    expect(formatearCOP(NaN)).toBe("");
    expect(formatearCOP(Infinity)).toBe("");
  });
});

describe("parsearCOP", () => {
  it("extrae el entero de texto con puntos y símbolo", () => {
    expect(parsearCOP("420.000.000")).toBe(420000000);
    expect(parsearCOP("$ 420.000.000")).toBe(420000000);
    expect(parsearCOP("420000000")).toBe(420000000);
  });

  it("devuelve null si no hay dígitos", () => {
    expect(parsearCOP("")).toBeNull();
    expect(parsearCOP("abc")).toBeNull();
  });

  it("devuelve null para entradas no-string", () => {
    // @ts-expect-error robustez en runtime
    expect(parsearCOP(undefined)).toBeNull();
  });
});
