import { describe, it, expect } from "vitest";
import {
  esTokenValido,
  construirLinkAnuncio,
  extraerTokenDeHash,
  CLAVE_LINK,
} from "@/engine/token/token";

// 43 chars = el largo de un token base64url real (32 bytes), pero con palabras legibles y baja
// entropía a propósito: es un valor de PRUEBA, no un secreto (así el escáner no lo confunde).
const TOKEN = "token_de_prueba_no_es_un_secreto_real_00000";

describe("esTokenValido", () => {
  it("acepta un token base64url de 43 chars", () => {
    expect(TOKEN).toHaveLength(43);
    expect(esTokenValido(TOKEN)).toBe(true);
  });

  it("rechaza largos incorrectos y alfabeto inválido", () => {
    expect(esTokenValido("corto")).toBe(false);
    expect(esTokenValido("a".repeat(42))).toBe(false);
    expect(esTokenValido("a".repeat(44))).toBe(false);
    expect(esTokenValido("tiene+signos/no=url" + "x".repeat(24))).toBe(false);
  });

  it("es defensivo ante no-strings", () => {
    // @ts-expect-error probamos entrada inválida a propósito
    expect(esTokenValido(null)).toBe(false);
  });
});

describe("construirLinkAnuncio", () => {
  it("arma el link con el token en el FRAGMENT (no query)", () => {
    expect(construirLinkAnuncio("https://innmobiliaria.co", TOKEN)).toBe(
      `https://innmobiliaria.co/mi-anuncio#t=${TOKEN}`,
    );
  });

  it("no duplica la barra si el origin la trae", () => {
    expect(construirLinkAnuncio("http://localhost:3000/", TOKEN)).toBe(
      `http://localhost:3000/mi-anuncio#t=${TOKEN}`,
    );
  });
});

describe("extraerTokenDeHash", () => {
  it("extrae el token de un hash con #", () => {
    expect(extraerTokenDeHash(`#t=${TOKEN}`)).toBe(TOKEN);
  });

  it("extrae el token aunque venga sin # o con otros params", () => {
    expect(extraerTokenDeHash(`t=${TOKEN}`)).toBe(TOKEN);
    expect(extraerTokenDeHash(`#foo=1&t=${TOKEN}`)).toBe(TOKEN);
  });

  it("devuelve null si no hay token o está mal formado", () => {
    expect(extraerTokenDeHash("")).toBeNull();
    expect(extraerTokenDeHash("#t=corto")).toBeNull();
    expect(extraerTokenDeHash("#otra=cosa")).toBeNull();
  });
});

describe("CLAVE_LINK", () => {
  it("está versionada", () => {
    expect(CLAVE_LINK).toBe("publicar.link.v1");
  });
});
