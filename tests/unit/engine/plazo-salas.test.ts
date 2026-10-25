// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  corteSinRespuesta,
  DIAS_HABILES_SALA,
  venceSala,
} from "../../../src/engine/agenda/plazo-salas";

// S13 — el plazo de respuesta de una sala: dos días hábiles (48 horas de lunes a viernes, hora de Bogotá, sin festivos).
// Fechas de 2026: el 23 de octubre es viernes, el 24 sábado, el 25 domingo, el 26 lunes.
const b = (iso: string) => new Date(`${iso}-05:00`);

describe("plazo de las salas de ventas: dos días hábiles en hora de Bogotá", () => {
  it("son dos días", () => {
    expect(DIAS_HABILES_SALA).toBe(2);
  });

  it.each([
    [
      "lunes 9 a. m. → miércoles 9 a. m.",
      "2026-10-26T09:00",
      "2026-10-28T09:00",
    ],
    [
      "jueves 10 a. m. → lunes 10 a. m. (el fin de semana no corre)",
      "2026-10-22T10:00",
      "2026-10-26T10:00",
    ],
    [
      "viernes 3 p. m. → martes 3 p. m.",
      "2026-10-23T15:00",
      "2026-10-27T15:00",
    ],
    [
      "sábado 10 a. m. → miércoles a la medianoche",
      "2026-10-24T10:00",
      "2026-10-28T00:00",
    ],
    [
      "domingo 11:59 p. m. → miércoles a la medianoche",
      "2026-10-25T23:59",
      "2026-10-28T00:00",
    ],
    [
      "lunes a la medianoche → miércoles a la medianoche",
      "2026-10-26T00:00",
      "2026-10-28T00:00",
    ],
  ])("vence: %s", (_, desde, vence) => {
    expect(venceSala(b(desde)).toISOString()).toBe(b(vence).toISOString());
  });

  it.each([
    [
      "lunes 10 a. m. → jueves 10 a. m.",
      "2026-10-26T10:00",
      "2026-10-22T10:00",
    ],
    [
      "domingo al mediodía → jueves a la medianoche",
      "2026-10-25T12:00",
      "2026-10-22T00:00",
    ],
    [
      "miércoles a la medianoche → lunes a la medianoche (entra todo el fin de semana)",
      "2026-10-28T00:00",
      "2026-10-26T00:00",
    ],
    [
      "martes 3 p. m. → viernes 3 p. m.",
      "2026-10-27T15:00",
      "2026-10-23T15:00",
    ],
  ])("corte para reclamar: %s", (_, ahora, corte) => {
    expect(corteSinRespuesta(b(ahora)).toISOString()).toBe(
      b(corte).toISOString(),
    );
  });

  it("el corte es la inversa exacta: lo que empezó en el corte ya venció y un minuto después todavía no (dos semanas, cada 37 min)", () => {
    const MIN = 60_000;
    const inicio = b("2026-10-19T00:00").getTime();
    for (let t = inicio; t < inicio + 14 * 86_400_000; t += 37 * MIN) {
      const ahora = new Date(t);
      const corte = corteSinRespuesta(ahora);
      expect(venceSala(corte).getTime()).toBeLessThanOrEqual(t);
      expect(
        venceSala(new Date(corte.getTime() + MIN)).getTime(),
      ).toBeGreaterThan(t);
    }
  });

  it("acepta otro número de días hábiles", () => {
    expect(venceSala(b("2026-10-23T15:00"), 1).toISOString()).toBe(
      b("2026-10-26T15:00").toISOString(),
    );
    expect(corteSinRespuesta(b("2026-10-26T15:00"), 1).toISOString()).toBe(
      b("2026-10-23T15:00").toISOString(),
    );
  });
});
