import { describe, it, expect } from "vitest";
import {
  slugificar,
  construirBaseSlug,
  esSlugValido,
  SLUG_MAX,
} from "@/engine/slug/slug";

describe("slugificar", () => {
  it("pasa a minúsculas y une con guiones", () => {
    expect(slugificar("Chapinero Alto")).toBe("chapinero-alto");
  });

  it("quita acentos y la eñe (espejo del SQL)", () => {
    expect(slugificar("Bogotá")).toBe("bogota");
    expect(slugificar("Muñoz")).toBe("munoz");
    expect(slugificar("Chicó Reservado")).toBe("chico-reservado");
  });

  it("colapsa separadores y recorta guiones de los extremos", () => {
    expect(slugificar("  Ciudad   Jardín  ")).toBe("ciudad-jardin");
    expect(slugificar("Santa Fe #3")).toBe("santa-fe-3");
  });

  it("devuelve cadena vacía si no queda nada slugificable", () => {
    expect(slugificar("¿?—")).toBe("");
  });
});

describe("construirBaseSlug", () => {
  it("compone tipo-barrio", () => {
    expect(construirBaseSlug("apartamento", "Cedritos")).toBe(
      "apartamento-cedritos",
    );
  });

  it("omite segmentos vacíos", () => {
    expect(construirBaseSlug("casa", "¿?")).toBe("casa");
  });
});

describe("esSlugValido", () => {
  it("acepta el formato canónico con sufijo hex", () => {
    expect(esSlugValido("apartamento-cedritos-a3f9c1")).toBe(true);
  });

  it("rechaza mayúsculas, espacios y guiones dobles o al borde", () => {
    expect(esSlugValido("Apartamento-Cedritos")).toBe(false);
    expect(esSlugValido("con espacio")).toBe(false);
    expect(esSlugValido("-arranca-mal")).toBe(false);
    expect(esSlugValido("doble--guion")).toBe(false);
    expect(esSlugValido("")).toBe(false);
  });

  it("rechaza slugs por encima del largo máximo", () => {
    expect(esSlugValido("a".repeat(SLUG_MAX + 1))).toBe(false);
  });
});
