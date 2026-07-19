import { describe, it, expect } from "vitest";
import {
  esCodigoValido,
  normalizarCodigo,
  extraerRefDeBusqueda,
  construirLinkReferido,
  mensajeInvitacion,
} from "@/engine/referidos/referidos";

const CODIGO = "aB3_xY-9"; // 8 chars base64url

describe("referidos", () => {
  describe("esCodigoValido", () => {
    it("acepta 8 chars del alfabeto base64url", () => {
      expect(esCodigoValido(CODIGO)).toBe(true);
    });
    it("rechaza longitud distinta de 8", () => {
      expect(esCodigoValido("aB3_xY-")).toBe(false); // 7
      expect(esCodigoValido("aB3_xY-99")).toBe(false); // 9
    });
    it("rechaza caracteres fuera del alfabeto", () => {
      expect(esCodigoValido("aB3_xY+9")).toBe(false); // '+' no es url-safe
      expect(esCodigoValido("aB3 xY99")).toBe(false); // espacio
    });
    it("rechaza no-string", () => {
      // @ts-expect-error prueba defensiva
      expect(esCodigoValido(null)).toBe(false);
    });
  });

  describe("normalizarCodigo", () => {
    it("recorta espacios y valida", () => {
      expect(normalizarCodigo(`  ${CODIGO}  `)).toBe(CODIGO);
    });
    it("null si inválido o ausente", () => {
      expect(normalizarCodigo("corto")).toBeNull();
      expect(normalizarCodigo(null)).toBeNull();
      expect(normalizarCodigo(undefined)).toBeNull();
    });
  });

  describe("extraerRefDeBusqueda", () => {
    it("extrae ?ref= válido", () => {
      expect(extraerRefDeBusqueda(`?ref=${CODIGO}`)).toBe(CODIGO);
    });
    it("acepta el query sin ? inicial y con más params", () => {
      expect(extraerRefDeBusqueda(`ref=${CODIGO}&x=1`)).toBe(CODIGO);
    });
    it("null si no hay ref", () => {
      expect(extraerRefDeBusqueda("?otra=cosa")).toBeNull();
    });
    it("null si ref inválido — no rompe el registro", () => {
      expect(extraerRefDeBusqueda("?ref=hola")).toBeNull();
    });
    it("null si no-string", () => {
      // @ts-expect-error defensivo
      expect(extraerRefDeBusqueda(123)).toBeNull();
    });
  });

  describe("construirLinkReferido", () => {
    it("arma /publicar?ref=", () => {
      expect(construirLinkReferido("https://innmob.co", CODIGO)).toBe(
        `https://innmob.co/publicar?ref=${CODIGO}`,
      );
    });
    it("recorta slashes finales del origin", () => {
      expect(construirLinkReferido("https://innmob.co/", CODIGO)).toBe(
        `https://innmob.co/publicar?ref=${CODIGO}`,
      );
    });
  });

  describe("mensajeInvitacion", () => {
    it("incluye el link y no fabrica cifras", () => {
      const link = `https://innmob.co/publicar?ref=${CODIGO}`;
      const m = mensajeInvitacion(link);
      expect(m).toContain(link);
      expect(m).toContain("sin comisión");
      // ninguna cifra de evidencia débil ni porcentajes inventados
      expect(m).not.toMatch(/\d+\s*%|3×|118|40%/);
    });
  });
});
