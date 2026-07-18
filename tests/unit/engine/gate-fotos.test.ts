import { describe, it, expect } from "vitest";
import {
  evaluarFoto,
  puedeAgregar,
  MAX_FOTOS,
  MIN_LADO_MAYOR,
  MIN_LADO_MENOR,
  MAX_BYTES_ENTRADA,
} from "@/engine/fotos/gate";

const fotoOk = {
  tipo: "image/jpeg",
  bytes: 2_000_000,
  ancho: 3000,
  alto: 2000,
};

describe("evaluarFoto (gate determinista)", () => {
  it("acepta una foto de cámara de teléfono", () => {
    expect(evaluarFoto(fotoOk)).toEqual({ ok: true });
  });

  it("acepta JPG, PNG y WebP", () => {
    for (const tipo of ["image/jpeg", "image/png", "image/webp"]) {
      expect(evaluarFoto({ ...fotoOk, tipo }).ok).toBe(true);
    }
  });

  it("rechaza formatos no soportados (HEIC, gif, pdf) con razón 'formato'", () => {
    for (const tipo of ["image/heic", "image/gif", "application/pdf", ""]) {
      const r = evaluarFoto({ ...fotoOk, tipo });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.razon).toBe("formato");
    }
  });

  it("rechaza archivos por encima del máximo de entrada con razón 'peso'", () => {
    const r = evaluarFoto({ ...fotoOk, bytes: MAX_BYTES_ENTRADA + 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.razon).toBe("peso");
  });

  it("acepta exactamente en el límite de peso", () => {
    expect(evaluarFoto({ ...fotoOk, bytes: MAX_BYTES_ENTRADA }).ok).toBe(true);
  });

  it("rechaza baja resolución (captura de pantalla) con razón 'resolucion'", () => {
    const r = evaluarFoto({ ...fotoOk, ancho: 320, alto: 240 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.razon).toBe("resolucion");
  });

  it("acepta en el límite exacto de resolución (orientación indistinta)", () => {
    expect(
      evaluarFoto({ ...fotoOk, ancho: MIN_LADO_MAYOR, alto: MIN_LADO_MENOR })
        .ok,
    ).toBe(true);
    // vertical: el lado mayor es el alto
    expect(
      evaluarFoto({ ...fotoOk, ancho: MIN_LADO_MENOR, alto: MIN_LADO_MAYOR })
        .ok,
    ).toBe(true);
  });

  it("rechaza si el lado menor no llega al mínimo aunque el mayor sobre", () => {
    const r = evaluarFoto({ ...fotoOk, ancho: 4000, alto: 500 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.razon).toBe("resolucion");
  });

  it("da un mensaje accionable en es-CO por cada rechazo", () => {
    const r = evaluarFoto({ ...fotoOk, ancho: 100, alto: 100 });
    if (!r.ok) expect(r.mensaje.length).toBeGreaterThan(10);
  });

  it("prioriza formato sobre peso sobre resolución", () => {
    // todo mal a la vez → primero reporta 'formato'
    const r = evaluarFoto({ tipo: "image/gif", bytes: 9e9, ancho: 1, alto: 1 });
    if (!r.ok) expect(r.razon).toBe("formato");
  });
});

describe("puedeAgregar (límite superior visible)", () => {
  it("permite agregar por debajo del máximo", () => {
    expect(puedeAgregar(0)).toBe(true);
    expect(puedeAgregar(MAX_FOTOS - 1)).toBe(true);
  });

  it("bloquea al llegar al máximo", () => {
    expect(puedeAgregar(MAX_FOTOS)).toBe(false);
    expect(puedeAgregar(MAX_FOTOS + 1)).toBe(false);
  });
});
