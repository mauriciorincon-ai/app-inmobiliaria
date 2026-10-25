import { describe, expect, it } from "vitest";
import { accionesPosibles, valoresDeBandera } from "@/engine/antifraude/cola";
import { respuestaDeErrorAntifraude } from "@/engine/antifraude/errores";
import {
  dhash,
  distanciaHuella,
  grisDeRgba,
  huellaInformativa,
  mismaFoto,
  promediarBloques,
  unos,
} from "@/engine/antifraude/huella";
import { enlaceAlDueno, mensajeAlDueno } from "@/engine/antifraude/mensajes";
import { banderasDePrecio, type AnuncioPrecio } from "@/engine/antifraude/precio";
import {
  MOTIVOS_REPORTE,
  RAZONES_DESCARTE,
  REGLAS,
  UMBRALES,
} from "@/engine/antifraude/reglas";
import { UMBRAL_SOSPECHOSO } from "@/engine/precio/comparables";

// Las reglas antifraude (S15): cada una con un caso que DISPARA y otro que NO, en el borde. Datos 100 % sintéticos.
const FUENTE = { nombre: "anuncios (prueba)", fecha: "2026-10-25" };
const M = 1_000_000;

let n = 0;
function anuncio(
  m2: number,
  extra: Partial<AnuncioPrecio> = {},
): AnuncioPrecio {
  n += 1;
  return {
    id: `id-${n}`,
    slug: `a-${n}`,
    operacion: "venta",
    tipo: "apartamento",
    localidad: "Chapinero",
    sector_codigo: "008108",
    area_m2: 80,
    precio_esperado: Math.round(m2 * M * 80),
    ...extra,
  };
}
// Cinco comparables: 5,0 · 5,2 · 5,4 · 5,6 · 5,8 M/m² ⇒ mediana 5,4.
const CINCO = () => [5.0, 5.2, 5.4, 5.6, 5.8].map((v) => anuncio(v));

describe("las reglas y sus umbrales", () => {
  it("el umbral de precio es el mismo de «¿Está caro?» y los conjuntos están cerrados", () => {
    expect(UMBRALES.precioPorcentaje).toBe(Math.round(UMBRAL_SOSPECHOSO * 100));
    expect(UMBRALES.precioPorcentaje).toBe(30);
    expect(REGLAS).toEqual(["precio", "foto", "matricula", "telefono"]);
    expect(MOTIVOS_REPORTE).toHaveLength(6);
    expect(RAZONES_DESCARTE).toHaveLength(4);
  });
});

describe("bandera de precio (el motor de «¿Está caro?» sobre todos los visibles)", () => {
  it("dispara EXACTAMENTE en el 30 % bajo la mediana y no en el 29,8 %", () => {
    const base = CINCO();
    const justo = anuncio(5.4 * 0.7); // 3,78 M/m²: 30 % bajo la mediana
    const casi = anuncio(3.79); // 29,8 %
    const h1 = banderasDePrecio([...base, justo], FUENTE);
    expect(h1[justo.id]).toEqual({ porcentaje: 30, n: 5, ambito: "barrio" });
    expect(Object.keys(h1)).toEqual([justo.id]);
    expect(banderasDePrecio([...base, casi], FUENTE)).toEqual({});
  });

  it("con 4 comparables no hay mediana y no hay bandera; con 5 sí", () => {
    const barato = anuncio(2.0);
    expect(banderasDePrecio([...CINCO().slice(0, 4), barato], FUENTE)).toEqual({});
    const otro = anuncio(2.0);
    expect(Object.keys(banderasDePrecio([...CINCO(), otro], FUENTE))).toEqual([
      otro.id,
    ]);
  });

  it("no mezcla localidades, operaciones ni tipos; sin localidad no evalúa; la localidad no distingue mayúsculas", () => {
    const base = CINCO();
    const enOtra = anuncio(2.0, { localidad: "Suba" });
    const arriendo = anuncio(2.0, { operacion: "arriendo" });
    const casa = anuncio(2.0, { tipo: "casa" });
    const sinLocalidad = anuncio(2.0, { localidad: null });
    expect(
      banderasDePrecio([...base, enOtra, arriendo, casa, sinLocalidad], FUENTE),
    ).toEqual({});
    const mayusculas = anuncio(2.0, { localidad: "CHAPINERO" });
    expect(Object.keys(banderasDePrecio([...base, mayusculas], FUENTE))).toEqual([
      mayusculas.id,
    ]);
  });

  it("un anuncio caro o en rango jamás da bandera", () => {
    expect(banderasDePrecio([...CINCO(), anuncio(9.0), anuncio(5.5)], FUENTE)).toEqual(
      {},
    );
  });
});

// Imágenes sintéticas de 90 × 80 en gris: un patrón con estructura y sus variantes (más brillo, menos contraste, ruido).
const ANCHO = 90;
const ALTO = 80;
function imagen(f: (x: number, y: number) => number): number[] {
  const g: number[] = [];
  for (let y = 0; y < ALTO; y++) {
    for (let x = 0; x < ANCHO; x++) g.push(Math.max(0, Math.min(255, f(x, y))));
  }
  return g;
}
const patron = (x: number, y: number) =>
  128 + 60 * Math.sin(x / 7) + 50 * Math.cos(y / 5) + 20 * Math.sin((x + y) / 11);
const huellaDe = (g: number[]) => dhash(promediarBloques(g, ANCHO, ALTO));
// Ruido determinista en [-6, 6].
const ruido = (x: number, y: number) => ((x * 7919 + y * 104729) % 13) - 6;

describe("huella perceptual (dHash de 64 bits)", () => {
  it("gris de RGBA (BT.601) y promedio por bloques", () => {
    expect(grisDeRgba([255, 255, 255, 0, 0, 0, 0, 255])).toEqual([255, 0]);
    expect(grisDeRgba([255, 0, 0, 255])[0]).toBeCloseTo(76.245, 3);
    const uniforme = new Array(ANCHO * ALTO).fill(100);
    expect(promediarBloques(uniforme, ANCHO, ALTO)).toEqual(new Array(72).fill(100));
    expect(() => promediarBloques([1, 2, 3], 2, 2)).toThrow(RangeError);
    expect(() => promediarBloques(new Array(16).fill(0), 4, 4)).toThrow(RangeError);
  });

  it("cada bit dice si un píxel es más claro que el de su derecha", () => {
    const sube = Array.from({ length: 72 }, (_, i) => i % 9);
    const baja = Array.from({ length: 72 }, (_, i) => 9 - (i % 9));
    expect(dhash(sube)).toBe("0000000000000000");
    expect(dhash(baja)).toBe("ffffffffffffffff");
    expect(() => dhash([1, 2])).toThrow(RangeError);
  });

  it("distancia de Hamming, bits en 1 y huellas inválidas", () => {
    expect(distanciaHuella("0000000000000000", "ffffffffffffffff")).toBe(64);
    expect(distanciaHuella("00ff00ff00ff00ff", "00ff00ff00ff00fe")).toBe(1);
    expect(unos("00ff00ff00ff00ff")).toBe(32);
    expect(() => unos("xyz")).toThrow(RangeError);
    expect(() => distanciaHuella("00", "11")).toThrow(RangeError);
  });

  it("una huella casi lisa no informa: 7 bits en 1 no, 8 sí; 56 sí, 57 no", () => {
    expect(huellaInformativa("000000000000007f")).toBe(false); // 7
    expect(huellaInformativa("00000000000000ff")).toBe(true); // 8
    expect(huellaInformativa("00ffffffffffffff")).toBe(true); // 56
    expect(huellaInformativa("01ffffffffffffff")).toBe(false); // 57
  });

  it("la regla: distancia 6 es la misma foto, 7 no; y nunca con una huella lisa", () => {
    const a = "00ff00ff00ff00ff";
    expect(mismaFoto(a, "00ff00ff00ff00c0")).toBe(true); // 6 bits distintos
    expect(mismaFoto(a, "00ff00ff00ff0080")).toBe(false); // 7
    expect(mismaFoto("0000000000000000", "0000000000000000")).toBe(false);
  });

  it("con imágenes sintéticas: la misma foto con más brillo, menos contraste o ruido queda a 6 o menos; otra foto, lejos", () => {
    const original = huellaDe(imagen(patron));
    expect(huellaInformativa(original)).toBe(true);
    const variantes = [
      imagen((x, y) => patron(x, y) + 15),
      imagen((x, y) => 128 + (patron(x, y) - 128) * 0.85),
      imagen((x, y) => patron(x, y) + ruido(x, y)),
    ].map(huellaDe);
    for (const v of variantes) {
      expect(distanciaHuella(original, v)).toBeLessThanOrEqual(
        UMBRALES.huellaDistancia,
      );
      expect(mismaFoto(original, v)).toBe(true);
    }
    const otra = huellaDe(
      imagen((x, y) => 128 + 70 * Math.cos(x / 4 + y / 9) - 40 * Math.sin(y / 3)),
    );
    expect(distanciaHuella(original, otra)).toBeGreaterThan(UMBRALES.huellaDistancia);
    expect(mismaFoto(original, otra)).toBe(false);
  });
});

describe("la cola del operador", () => {
  it("pausar o reactivar según el estado; descartar solo si hay algo abierto", () => {
    expect(
      accionesPosibles({ pausado_at: null, banderas: [1], reportes: [] }),
    ).toEqual({ pausar: true, reactivar: false, pedirCtl: true, descartar: true });
    expect(
      accionesPosibles({ pausado_at: "2026-10-25T10:00:00Z", banderas: [], reportes: [] }),
    ).toEqual({ pausar: false, reactivar: true, pedirCtl: true, descartar: false });
  });

  it("la frase del precio lleva el umbral de la regla; las demás, solo su evidencia", () => {
    expect(
      valoresDeBandera({ regla: "precio", evidencia: { porcentaje: 37, n: 8 } }),
    ).toEqual({ porcentaje: 37, n: 8, umbral: 30 });
    expect(
      valoresDeBandera({ regla: "telefono", evidencia: { otros: 2, nombres: 3 } }),
    ).toEqual({ otros: 2, nombres: 3 });
  });
});

describe("lo que el operador le escribe al dueño", () => {
  const dueno = { nombre: "Ana María Prueba", whatsapp: "+573001112233" };
  it("en el idioma del dueño, con su primer nombre y el inmueble en minúscula", () => {
    const es = mensajeAlDueno("pedirCtl", { ...dueno, idioma: "es" }, {
      tipo: "apartamento",
      barrio: "El Retiro",
    });
    expect(es).toMatch(/^Hola Ana, /);
    expect(es).toContain("tu apartamento en El Retiro");
    expect(es).toContain("30 días o menos");
    const en = mensajeAlDueno("pausa", { ...dueno, idioma: "en" }, {
      tipo: "casa",
      barrio: "Suba",
    });
    expect(en).toMatch(/^Hi Ana, /);
    expect(en).toContain("your house in Suba");
  });

  it("un tipo «otro» se nombra «inmueble», aun sin nombre del dueño", () => {
    const m = mensajeAlDueno(
      "pausa",
      { nombre: "  ", idioma: "es" },
      { tipo: "otro", barrio: "Usaquén" },
    );
    expect(m).toContain("tu inmueble en Usaquén");
  });

  it("el enlace abre WhatsApp al número del dueño con el texto ya escrito", () => {
    const url = enlaceAlDueno("pedirCtl", { ...dueno, idioma: "es" }, {
      tipo: "apartamento",
      barrio: "El Retiro",
    });
    expect(url.startsWith("https://wa.me/573001112233?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toContain("El Retiro");
  });
});

describe("los errores de la base a HTTP", () => {
  it.each([
    [{ code: "42501", message: "no_verificado" }, 403, "no_verificado"],
    [{ code: "42501" }, 403, "no_verificado"],
    [{ message: "token_invalido" }, 403, "token_invalido"],
    [{ code: "P0002", message: "no_disponible" }, 404, "no_disponible"],
    [{ message: "motivo_invalido" }, 400, "motivo_invalido"],
    [{ message: "ya_reportado" }, 409, "ya_reportado"],
    [{ message: "estado_invalido" }, 409, "estado_invalido"],
    [{ message: "demasiados_reportes" }, 429, "demasiados_reportes"],
    [{ message: "demasiadas_sesiones" }, 429, "demasiadas_sesiones"],
    [{ message: "algo raro" }, 500, "servidor"],
  ])("%j → %i %s", (error, status, codigo) => {
    expect(respuestaDeErrorAntifraude(error)).toEqual({ status, codigo });
  });
});
