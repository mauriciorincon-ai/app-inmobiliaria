// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  agregarTokenAlerta,
  CLAVE_ALERTAS,
  leerTokensAlertas,
  quitarTokenAlerta,
  serializarTokensAlertas,
} from "@/engine/alertas/tokens";
import { MAX_ALERTAS_TELEFONO } from "@/engine/alertas/topes";
import {
  enlaceCompartirWhatsapp,
  enlaceLista,
} from "@/engine/guardados/listas";

// S9 — lo que las pantallas guardan en el teléfono y el enlace de «Compartir por WhatsApp». Datos sintéticos.

// 43 caracteres del alfabeto base64url, con palabras legibles: valores de PRUEBA, no secretos.
const token = (n: number) =>
  `${n}_token_de_prueba_no_es_secreto_`.padEnd(43, "x");

describe("tokens de alertas del teléfono", () => {
  it("la clave está versionada", () => {
    expect(CLAVE_ALERTAS).toBe("inn:alertas:v1");
  });

  it("los tokens de prueba tienen el largo real", () => {
    expect(token(1)).toHaveLength(43);
  });

  it("leer nunca lanza: lo raro es una lista vacía", () => {
    for (const malo of [null, undefined, "", "no es json", "{}", "42", '"x"']) {
      expect(leerTokensAlertas(malo), String(malo)).toEqual([]);
    }
  });

  it("descarta lo que no es un token, quita repetidos y conserva el orden", () => {
    const crudo = JSON.stringify([
      token(1),
      "corto",
      7,
      null,
      token(2),
      token(1),
    ]);
    expect(leerTokensAlertas(crudo)).toEqual([token(1), token(2)]);
  });

  it("el tope son los de una consulta a «mis alertas»", () => {
    const muchos = Array.from({ length: 30 }, (_, i) => token(i));
    expect(leerTokensAlertas(JSON.stringify(muchos))).toHaveLength(
      MAX_ALERTAS_TELEFONO,
    );
    expect(JSON.parse(serializarTokensAlertas(muchos))).toHaveLength(
      MAX_ALERTAS_TELEFONO,
    );
  });

  it("agregar pone el nuevo primero, sube al repetido y no admite basura", () => {
    expect(agregarTokenAlerta([token(1), token(2)], token(3))).toEqual([
      token(3),
      token(1),
      token(2),
    ]);
    expect(agregarTokenAlerta([token(1), token(2)], token(2))).toEqual([
      token(2),
      token(1),
    ]);
    expect(agregarTokenAlerta([token(1)], "corto")).toEqual([token(1)]);
    const llena = Array.from({ length: MAX_ALERTAS_TELEFONO }, (_, i) =>
      token(i),
    );
    const tras = agregarTokenAlerta(llena, token(99));
    expect(tras).toHaveLength(MAX_ALERTAS_TELEFONO);
    expect(tras[0]).toBe(token(99));
  });

  it("quitar", () => {
    expect(quitarTokenAlerta([token(1), token(2)], token(1))).toEqual([
      token(2),
    ]);
  });

  it("serializar y leer son inversos", () => {
    const lista = [token(1), token(2)];
    expect(leerTokensAlertas(serializarTokensAlertas(lista))).toEqual(lista);
  });
});

describe("compartir una lista", () => {
  it("el token va en el fragmento, nunca en la consulta", () => {
    const url = enlaceLista("https://ejemplo.invalid/", token(1));
    expect(url).toBe(`https://ejemplo.invalid/lista#t=${token(1)}`);
    expect(url).not.toContain("?");
  });

  it("un token malo no arma enlace", () => {
    expect(enlaceLista("https://ejemplo.invalid", "corto")).toBeNull();
  });

  it("wa.me va SIN número: la persona elige a quién se lo manda", () => {
    const enlace = "https://ejemplo.invalid/lista#t=abc";
    const url = enlaceCompartirWhatsapp("Mira esta lista", enlace);
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(url).not.toMatch(/wa\.me\/\d/);
    expect(decodeURIComponent(url.split("?text=")[1])).toBe(
      `Mira esta lista ${enlace}`,
    );
  });
});
