// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  ARRIENDO_MAX,
  ARRIENDO_MIN,
  CLAVE_ARRIENDO,
  arriendoEscrito,
  leerArriendo,
  serializarArriendo,
  totalEspera,
} from "../../../src/engine/vivienda-nueva/arriendo-local";

// «Tu arriendo» vive solo en el teléfono (S12): lo que se guarda se vuelve a leer igual y lo que no es válido no entra.

describe("arriendo local", () => {
  it("la clave está versionada", () => {
    expect(CLAVE_ARRIENDO).toBe("inn:arriendo:v1");
  });

  it("lo que se serializa se lee igual", () => {
    expect(leerArriendo(serializarArriendo(1_800_000))).toBe(1_800_000);
    expect(leerArriendo(serializarArriendo(ARRIENDO_MIN))).toBe(ARRIENDO_MIN);
    expect(leerArriendo(serializarArriendo(ARRIENDO_MAX))).toBe(ARRIENDO_MAX);
  });

  it("jamás se serializa algo que no se podría volver a leer", () => {
    for (const malo of [0, -5, 99_999, ARRIENDO_MAX + 1, 1.5, Number.NaN]) {
      expect(() => serializarArriendo(malo), String(malo)).toThrow(
        "arriendo_invalido",
      );
    }
  });

  it("lo guardado que no sirve se lee como nada (sin lanzar)", () => {
    for (const malo of [
      null,
      "",
      "no es json",
      "[]",
      "null",
      "5",
      "{}",
      '{"arriendo":"1800000"}',
      '{"arriendo":50}',
      '{"arriendo":1800000,"ingresos":8000000}',
      '{"otro":1800000}',
    ]) {
      expect(leerArriendo(malo), String(malo)).toBeNull();
    }
  });

  it("lo que escribe la persona: un entero en pesos dentro del rango", () => {
    expect(arriendoEscrito("1.800.000")).toBe(1_800_000);
    expect(arriendoEscrito("$1,800,000")).toBe(1_800_000);
    expect(arriendoEscrito("1800000")).toBe(1_800_000);
    expect(arriendoEscrito("1800000.50")).toBeNull();
    expect(arriendoEscrito("")).toBeNull();
    expect(arriendoEscrito("mucho")).toBeNull();
    expect(arriendoEscrito("50")).toBeNull();
    expect(arriendoEscrito("999.999.999")).toBeNull();
  });

  it("la espera en pesos es meses × arriendo, nunca negativa", () => {
    expect(totalEspera(12, 1_800_000)).toBe(21_600_000);
    expect(totalEspera(0, 1_800_000)).toBe(0);
    expect(totalEspera(-3, 1_800_000)).toBe(0);
    expect(totalEspera(12, -1)).toBe(0);
  });
});
