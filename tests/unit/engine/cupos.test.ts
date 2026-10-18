import { describe, it, expect } from "vitest";
import {
  mostrarContador,
  cuposRestantes,
  agotado,
  estadoCupos,
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

  // El motor dice QUÉ pasa; la frase en cada idioma la compone la UI (tests/component/banda-cupos).
  describe("estadoCupos", () => {
    it("varios cuando quedan varios, con la cuenta", () => {
      expect(estadoCupos(10, 3)).toEqual({ tipo: "varios", restantes: 7 });
    });
    it("uno cuando queda 1", () => {
      expect(estadoCupos(10, 9)).toEqual({ tipo: "uno" });
    });
    it("completos cuando se agota", () => {
      expect(estadoCupos(10, 10)).toEqual({ tipo: "completos" });
      expect(estadoCupos(10, 12)).toEqual({ tipo: "completos" });
    });
    it("null si no hay cupo fijado (no se muestra nada)", () => {
      expect(estadoCupos(null, 3)).toBeNull();
      expect(estadoCupos(0, 3)).toBeNull();
    });
  });
});
