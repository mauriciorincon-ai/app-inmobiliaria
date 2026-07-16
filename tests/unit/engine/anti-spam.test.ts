import { describe, expect, it } from "vitest";
import {
  CAMPO_HONEYPOT,
  TIEMPO_MINIMO_MS,
  demasiadoRapido,
  esBot,
} from "@/engine/registro/anti-spam";

describe("esBot (honeypot)", () => {
  it("detecta al bot cuando el honeypot trae contenido", () => {
    expect(esBot("http://spam.example")).toBe(true);
    expect(esBot("   x  ")).toBe(true);
  });

  it("deja pasar al humano (honeypot vacío o ausente)", () => {
    expect(esBot("")).toBe(false);
    expect(esBot("   ")).toBe(false);
    expect(esBot(undefined)).toBe(false);
    expect(esBot(null)).toBe(false);
  });

  it("expone el nombre del campo trampa", () => {
    expect(CAMPO_HONEYPOT).toBe("sitio_web");
  });
});

describe("demasiadoRapido (time-trap)", () => {
  it("marca como rápido lo que baja del mínimo", () => {
    const inicio = 1_000_000;
    expect(demasiadoRapido(inicio, inicio + TIEMPO_MINIMO_MS - 1)).toBe(true);
  });

  it("acepta lo que iguala o supera el mínimo", () => {
    const inicio = 1_000_000;
    expect(demasiadoRapido(inicio, inicio + TIEMPO_MINIMO_MS)).toBe(false);
    expect(demasiadoRapido(inicio, inicio + 60_000)).toBe(false);
  });

  it("es defensivo ante timestamps no finitos (los trata como sospechosos)", () => {
    expect(demasiadoRapido(NaN, 2_000_000)).toBe(true);
    expect(demasiadoRapido(1_000_000, Infinity)).toBe(true);
  });
});
