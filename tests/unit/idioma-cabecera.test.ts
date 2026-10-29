import { describe, it, expect } from "vitest";
import { PREFIERE_INGLES } from "../../next.config";

// La regla de la cabecera `Accept-Language` (ADR 013), con el mismo anclaje que le pone Next (`^…$`). El e2e de idioma la prueba
// contra el build; aquí se fijan los bordes sin levantar un servidor.
const pideIngles = (cabecera: string) =>
  new RegExp(`^${PREFIERE_INGLES}$`).test(cabecera);

describe("Accept-Language → inglés solo si lo prefiere sobre el español", () => {
  it.each([
    ["en-US,en;q=0.9", true],
    ["fr-FR,fr;q=0.9,en;q=0.8", true],
    ["fr,en;q=0.8,es;q=0.5", true],
    ["de-DE,de;q=0.9,en-US;q=0.8", true],
    ["es-CO,es;q=0.9,en;q=0.8", false],
    ["fr,es;q=0.8,en;q=0.5", false],
    ["pt-BR,pt;q=0.9", false],
    ["es", false],
    ["*", false],
  ])("%s → inglés: %s", (cabecera, esperado) => {
    expect(pideIngles(cabecera)).toBe(esperado);
  });
});
