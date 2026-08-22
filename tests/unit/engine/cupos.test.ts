import { describe, it, expect } from "vitest";
import {
  mostrarContador,
  cuposRestantes,
  agotado,
  textoCupos,
} from "@/engine/cupos/cupos";

describe("cupos", () => {
  describe("mostrarContador", () => {
    it("true con cupo positivo", () => {
      expect(mostrarContador(10)).toBe(true);
    });
    it("false sin cupo fijado (null/undefined) — escasez real o no existe", () => {
      expect(mostrarContador(null)).toBe(false);
      expect(mostrarContador(undefined)).toBe(false);
    });
    it("false con 0 o negativo", () => {
      expect(mostrarContador(0)).toBe(false);
      expect(mostrarContador(-1)).toBe(false);
    });
  });

  describe("cuposRestantes", () => {
    it("resta publicados", () => {
      expect(cuposRestantes(10, 3)).toBe(7);
    });
    it("nunca negativo (agotado ⇒ 0)", () => {
      expect(cuposRestantes(10, 15)).toBe(0);
    });
    it("null si no hay cupo fijado", () => {
      expect(cuposRestantes(null, 3)).toBeNull();
      expect(cuposRestantes(0, 0)).toBeNull();
    });
    it("trata publicados negativos como 0", () => {
      expect(cuposRestantes(10, -5)).toBe(10);
    });
  });

  describe("agotado", () => {
    it("true si 0 restantes con cupo fijado", () => {
      expect(agotado(5, 5)).toBe(true);
    });
    it("false si quedan cupos", () => {
      expect(agotado(5, 2)).toBe(false);
    });
    it("false si no hay cupo fijado (no aplica)", () => {
      expect(agotado(null, 100)).toBe(false);
    });
  });

  describe("textoCupos", () => {
    it("plural cuando quedan varios", () => {
      expect(textoCupos(10, 3, "Chapinero")).toBe(
        "Quedan 7 cupos de fundador en Chapinero",
      );
    });
    it("singular cuando queda 1", () => {
      expect(textoCupos(10, 9, "Suba")).toBe(
        "Queda 1 cupo de fundador en Suba",
      );
    });
    it("mensaje de completos cuando se agota", () => {
      expect(textoCupos(10, 10, "Kennedy")).toBe(
        "Cupos de fundador completos en Kennedy",
      );
    });
    it("null si no hay cupo fijado (no se muestra nada)", () => {
      expect(textoCupos(null, 3, "Bosa")).toBeNull();
    });
  });
});
