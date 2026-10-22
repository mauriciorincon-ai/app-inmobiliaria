import { describe, expect, it } from "vitest";
import {
  esEnteroEscrito,
  formatearCOP,
  formatearM2,
  formatearMillones,
  parsearCOP,
} from "@/engine/format/cop";

describe("formatearCOP", () => {
  it("formatea con separador de miles y sin decimales", () => {
    expect(formatearCOP(420000000)).toBe("$420.000.000");
    expect(formatearCOP(1000000)).toBe("$1.000.000");
  });

  it("redondea a entero", () => {
    expect(formatearCOP(1000000.7)).toBe("$1.000.001");
  });

  it("en inglés escribe el código de la moneda y comas, con un espacio normal", () => {
    expect(formatearCOP(420000000, "en")).toBe("COP 420,000,000");
    expect(formatearCOP(1000000, "en")).toBe("COP 1,000,000");
    expect(formatearCOP(420000000, "en")).not.toMatch(/\u00a0/);
  });

  it("el idioma por defecto es el español", () => {
    expect(formatearCOP(420000000)).toBe(formatearCOP(420000000, "es"));
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

describe("esEnteroEscrito (un decimal no se lee como miles)", () => {
  it.each([
    "78",
    "420000000",
    "420.000.000",
    "420,000,000",
    "420 000 000",
    "$ 420.000.000",
    "COP 420,000,000",
    "1.200",
  ])("acepta «%s»", (texto) => {
    expect(esEnteroEscrito(texto)).toBe(true);
  });

  it.each([
    "85.5",
    "85,5",
    "420,000,000.00",
    "420.000.000,50",
    "1.5",
    "",
    "abc",
    "1.20",
  ])("rechaza «%s»", (texto) => {
    expect(esEnteroEscrito(texto)).toBe(false);
  });
});

describe("formatearMillones y formatearM2", () => {
  it("en millones, con coma en español y punto en inglés", () => {
    expect(formatearMillones(250_000_000, "es")).toBe("$250,0 M");
    expect(formatearMillones(250_000_000, "en")).toBe("COP 250.0M");
    expect(formatearMillones(262_635_750, "es", 2)).toBe("$262,64 M");
    expect(formatearMillones(Number.NaN)).toBe("");
  });

  it("el m² en millones", () => {
    expect(formatearM2(9_970_674, "es")).toBe("$9,97 M/m²");
    expect(formatearM2(9_970_674, "en")).toBe("COP 9.97M/m²");
    expect(formatearM2(Number.POSITIVE_INFINITY)).toBe("");
  });
});
