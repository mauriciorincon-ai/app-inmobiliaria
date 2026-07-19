import { describe, it, expect } from "vitest";
import {
  VIGENCIA_DIAS,
  POR_VENCER_DIAS,
  estaVigente,
  diasRestantes,
  estaPorVencer,
  nuevaVigencia,
} from "@/engine/vigencia/vigencia";

const AHORA = new Date("2026-07-19T12:00:00Z");
const MS_DIA = 86_400_000;
const enDias = (n: number) => new Date(AHORA.getTime() + n * MS_DIA);

describe("vigencia", () => {
  describe("estaVigente", () => {
    it("vigente si la fecha de corte está en el futuro", () => {
      expect(estaVigente(enDias(1), AHORA)).toBe(true);
    });
    it("no vigente si ya venció", () => {
      expect(estaVigente(enDias(-1), AHORA)).toBe(false);
    });
    it("corte estricto: el instante exacto NO es vigente", () => {
      expect(estaVigente(AHORA, AHORA)).toBe(false);
    });
    it("fecha inválida ⇒ no vigente (fail-safe)", () => {
      expect(estaVigente("no-es-fecha", AHORA)).toBe(false);
    });
    it("acepta string ISO", () => {
      expect(estaVigente(enDias(5).toISOString(), AHORA)).toBe(true);
    });
  });

  describe("diasRestantes", () => {
    it("cuenta días completos", () => {
      expect(diasRestantes(enDias(3), AHORA)).toBe(3);
    });
    it("redondea fracciones hacia arriba", () => {
      expect(
        diasRestantes(new Date(AHORA.getTime() + 1.5 * MS_DIA), AHORA),
      ).toBe(2);
    });
    it("0 si ya venció", () => {
      expect(diasRestantes(enDias(-2), AHORA)).toBe(0);
    });
    it("0 si fecha inválida", () => {
      expect(diasRestantes("x", AHORA)).toBe(0);
    });
  });

  describe("estaPorVencer", () => {
    it("true dentro del umbral", () => {
      expect(estaPorVencer(enDias(POR_VENCER_DIAS - 1), AHORA)).toBe(true);
    });
    it("true justo en el umbral", () => {
      expect(estaPorVencer(enDias(POR_VENCER_DIAS), AHORA)).toBe(true);
    });
    it("false si falta más que el umbral", () => {
      expect(estaPorVencer(enDias(POR_VENCER_DIAS + 5), AHORA)).toBe(false);
    });
    it("false si ya venció (venció, no 'por vencer')", () => {
      expect(estaPorVencer(enDias(-1), AHORA)).toBe(false);
    });
  });

  describe("nuevaVigencia", () => {
    it("suma VIGENCIA_DIAS a la base", () => {
      expect(nuevaVigencia(AHORA).getTime()).toBe(
        AHORA.getTime() + VIGENCIA_DIAS * MS_DIA,
      );
    });
    it("VIGENCIA_DIAS es 60", () => {
      expect(VIGENCIA_DIAS).toBe(60);
    });
  });
});
