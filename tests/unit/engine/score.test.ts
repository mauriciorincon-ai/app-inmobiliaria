import { describe, it, expect } from "vitest";
import {
  calcularScore,
  siguientePaso,
  PUNTOS_BASE,
  DESCRIPCION_MIN,
  type EstadoAnuncio,
} from "@/engine/score/score";

const vacio: EstadoAnuncio = {
  fotos: 0,
  tienePortada: false,
  descripcionLen: 0,
  contactoPublico: false,
};

describe("calcularScore (goal-gradient)", () => {
  it("un anuncio recién registrado arranca en la base (40)", () => {
    expect(calcularScore(vacio)).toBe(PUNTOS_BASE);
  });

  it("ANCLA: la primera foto lleva el score a 55%", () => {
    expect(calcularScore({ ...vacio, fotos: 1 })).toBe(55);
  });

  it("los puntos por foto decrecen (15,5,4,3,3) y topan en 30", () => {
    expect(calcularScore({ ...vacio, fotos: 2 })).toBe(60); // 40+15+5
    expect(calcularScore({ ...vacio, fotos: 5 })).toBe(70); // 40+30
    expect(calcularScore({ ...vacio, fotos: 12 })).toBe(70); // foto 6+ no suma
  });

  it("la descripción suma solo al llegar al mínimo de caracteres", () => {
    expect(
      calcularScore({ ...vacio, descripcionLen: DESCRIPCION_MIN - 1 }),
    ).toBe(PUNTOS_BASE);
    expect(calcularScore({ ...vacio, descripcionLen: DESCRIPCION_MIN })).toBe(
      55,
    );
  });

  it("portada suma 5 y contacto suma 10", () => {
    expect(calcularScore({ ...vacio, tienePortada: true })).toBe(45);
    expect(calcularScore({ ...vacio, contactoPublico: true })).toBe(50);
  });

  it("un anuncio completo llega a 100 SIN necesitar verificación", () => {
    expect(
      calcularScore({
        fotos: 5,
        tienePortada: true,
        descripcionLen: 120,
        contactoPublico: true,
      }),
    ).toBe(100);
  });

  it("el máximo sin opt-in de contacto es 90", () => {
    expect(
      calcularScore({
        fotos: 5,
        tienePortada: true,
        descripcionLen: 120,
        contactoPublico: false,
      }),
    ).toBe(90);
  });

  it("es robusto a fotos negativas o absurdas", () => {
    expect(calcularScore({ ...vacio, fotos: -3 })).toBe(PUNTOS_BASE);
  });
});

describe("siguientePaso", () => {
  it("sin fotos sugiere subir la primera (+15)", () => {
    expect(siguientePaso(vacio)).toEqual({
      accion: "Sube tu primera foto",
      puntos: 15,
    });
  });

  it("con foto pero sin descripción sugiere la descripción", () => {
    expect(siguientePaso({ ...vacio, fotos: 1 })?.puntos).toBe(15);
    expect(siguientePaso({ ...vacio, fotos: 1 })?.accion).toMatch(
      /descripción/i,
    );
  });

  it("encadena portada → contacto → más fotos", () => {
    const base = { fotos: 1, descripcionLen: 100 };
    expect(
      siguientePaso({ ...base, tienePortada: false, contactoPublico: false })
        ?.accion,
    ).toMatch(/portada/i);
    expect(
      siguientePaso({ ...base, tienePortada: true, contactoPublico: false })
        ?.accion,
    ).toMatch(/contacto/i);
    expect(
      siguientePaso({ ...base, tienePortada: true, contactoPublico: true })
        ?.accion,
    ).toMatch(/foto/i);
  });

  it("devuelve null cuando el anuncio está al 100%", () => {
    expect(
      siguientePaso({
        fotos: 5,
        tienePortada: true,
        descripcionLen: 120,
        contactoPublico: true,
      }),
    ).toBeNull();
  });
});
