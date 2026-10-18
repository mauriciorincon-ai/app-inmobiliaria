// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  enMillones,
  pesosDeMillones,
  presupuestoDicho,
} from "@/engine/format/presupuesto";

// S8 — el presupuesto que declara el comprador, en millones de pesos.

describe("presupuestoDicho", () => {
  it("rango, desde, hasta y nada", () => {
    expect(presupuestoDicho(1_000_000_000, 1_200_000_000, "es")).toEqual({
      tipo: "rango",
      min: "1.000",
      max: "1.200",
    });
    expect(presupuestoDicho(1_000_000_000, 1_200_000_000, "en")).toEqual({
      tipo: "rango",
      min: "1,000",
      max: "1,200",
    });
    expect(presupuestoDicho(300_000_000, null, "es")).toEqual({
      tipo: "desde",
      min: "300",
    });
    expect(presupuestoDicho(null, 450_000_000, "es")).toEqual({
      tipo: "hasta",
      max: "450",
    });
    expect(presupuestoDicho(null, null, "es")).toEqual({ tipo: "ninguno" });
    expect(presupuestoDicho(0, 0, "es")).toEqual({ tipo: "ninguno" });
  });

  it("deja un decimal cuando hace falta", () => {
    expect(enMillones(350_500_000, "es")).toBe("350,5");
    expect(enMillones(350_500_000, "en")).toBe("350.5");
  });
});

describe("pesosDeMillones (lo que escribe la persona)", () => {
  it("convierte millones a pesos; vacío es «sin dato»", () => {
    expect(pesosDeMillones("300")).toBe(300_000_000);
    expect(pesosDeMillones(" 1.200 ")).toBe(1_200_000_000);
    expect(pesosDeMillones("350,5")).toBe(350_500_000);
    expect(pesosDeMillones("1,200")).toBe(1_200_000_000);
    expect(pesosDeMillones("350.5")).toBe(350_500_000);
    expect(pesosDeMillones("1.5")).toBe(1_500_000);
    expect(pesosDeMillones("1.200,5")).toBe(1_200_500_000);
    expect(pesosDeMillones("")).toBeNull();
    expect(pesosDeMillones("   ")).toBeNull();
  });

  it.each(["abc", "-5", "12,34", "1e6", "9999999"])("rechaza %s", (texto) => {
    expect(pesosDeMillones(texto)).toBe("invalido");
  });
});
