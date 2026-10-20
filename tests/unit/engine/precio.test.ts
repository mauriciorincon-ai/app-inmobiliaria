import { describe, it, expect } from "vitest";
import {
  MINIMO_COMPARABLES,
  percentil,
  precioPorM2,
  rangoDePrecio,
  recortarAtipicos,
  type AnuncioEvaluado,
  type Comparable,
} from "@/engine/precio/comparables";
import { datosDeZona } from "@/engine/precio/zona";
import { valorReferenciaDe } from "@/engine/zonas/valor-referencia";

// «¿Está caro?» y «Datos de la zona» (S10, ADR 018): un rango con su N, su fecha y su fuente; jamás un valor único.
const FUENTE = { nombre: "anuncios activos (prueba)", fecha: "2026-10-19" };
const BARRIO = "008108";
const OTRO = "008109";
const M = 1_000_000;

let n = 0;
// Un comparable de `area` m² a `m2` millones por m².
function c(m2: number, sector = BARRIO, area = 80): Comparable {
  n += 1;
  return {
    slug: `c-${n}`,
    sector_codigo: sector,
    area_m2: area,
    precio_esperado: Math.round(m2 * M * area),
  };
}
function anuncio(
  m2: number,
  area = 80,
  sector: string | null = BARRIO,
): AnuncioEvaluado {
  return {
    slug: "este",
    sector_codigo: sector,
    area_m2: area,
    precio_esperado: Math.round(m2 * M * area),
  };
}
// Seis en el barrio: 5,0 · 5,2 · 5,4 · 5,6 · 5,8 · 6,0 millones por m² ⇒ P25 5,25 · mediana 5,5 · P75 5,75 (tipo 7).
const SEIS = () => [5.0, 5.2, 5.4, 5.6, 5.8, 6.0].map((v) => c(v));

describe("percentil y recorte (las piezas)", () => {
  it("percentil tipo 7 con interpolación lineal", () => {
    const v = [5, 5.2, 5.4, 5.6, 5.8, 6];
    expect(percentil(v, 0.25)).toBeCloseTo(5.25, 10);
    expect(percentil(v, 0.5)).toBeCloseTo(5.5, 10);
    expect(percentil(v, 0.75)).toBeCloseTo(5.75, 10);
    expect(percentil([7], 0.25)).toBe(7);
    expect(percentil([], 0.5)).toBeNaN();
  });

  it("Tukey quita el atípico y deja el resto ordenado; con menos de 4 no recorta", () => {
    expect(recortarAtipicos([5.6, 5, 50, 5.4, 5.2])).toEqual([
      5, 5.2, 5.4, 5.6,
    ]);
    expect(recortarAtipicos([3, 1, 99])).toEqual([1, 3, 99]);
  });

  it("precio por m² entero", () => {
    expect(precioPorM2(440_000_000, 80)).toBe(5_500_000);
  });
});

describe("rangoDePrecio — nunca un rango con pocos comparables", () => {
  it(`con menos de ${MINIMO_COMPARABLES} no hay rango: 2 ⇒ sin datos`, () => {
    const r = rangoDePrecio(anuncio(5.5), [c(5), c(6)], FUENTE);
    expect(r.estado).toBe("sin_datos");
    expect(r).toMatchObject({ n: 2, minimo: 5, fuente: FUENTE });
    expect("p25" in r).toBe(false);
  });

  it("4 ⇒ sin datos; 5 ⇒ rango", () => {
    const cuatro = [5, 5.2, 5.4, 5.6].map((v) => c(v));
    expect(rangoDePrecio(anuncio(5.5), cuatro, FUENTE).estado).toBe(
      "sin_datos",
    );
    const cinco = [...cuatro, c(5.8)];
    expect(rangoDePrecio(anuncio(5.5), cinco, FUENTE).estado).toBe("en_rango");
  });

  it("el mínimo se exige DESPUÉS del recorte: 5 con un atípico ⇒ 4 ⇒ sin datos", () => {
    const r = rangoDePrecio(
      anuncio(5.5),
      [5, 5.2, 5.4, 5.6, 50].map((v) => c(v)),
      FUENTE,
    );
    expect(r).toMatchObject({ estado: "sin_datos", n: 4 });
  });
});

describe("rangoDePrecio — el rango", () => {
  it("P25–P75 por m² y aplicado al área, con N, ámbito y fuente", () => {
    const r = rangoDePrecio(anuncio(5.5), SEIS(), FUENTE);
    expect(r).toMatchObject({
      estado: "en_rango",
      ambito: "barrio",
      n: 6,
      p25M2: 5_250_000,
      medianaM2: 5_500_000,
      p75M2: 5_750_000,
      minM2: 5_000_000,
      maxM2: 6_000_000,
      p25: 420_000_000,
      p75: 460_000_000,
      precioM2: 5_500_000,
      debajo: false,
      fuente: FUENTE,
    });
  });

  it("el mismo conjunto en otro orden da exactamente el mismo P25–P75", () => {
    const a = SEIS();
    const r1 = rangoDePrecio(anuncio(5.5), a, FUENTE);
    const r2 = rangoDePrecio(anuncio(5.5), [...a].reverse(), FUENTE);
    const r3 = rangoDePrecio(
      anuncio(5.5),
      [a[3], a[0], a[5], a[1], a[4], a[2]],
      FUENTE,
    );
    expect(r2).toEqual(r1);
    expect(r3).toEqual(r1);
  });

  it("un atípico plantado no mueve el rango", () => {
    const base = [5.0, 5.1, 5.2, 5.4, 5.6, 5.8, 5.9, 6.0].map((v) => c(v));
    const sin = rangoDePrecio(anuncio(5.5), base, FUENTE);
    const con = rangoDePrecio(anuncio(5.5), [...base, c(99)], FUENTE);
    const con2 = rangoDePrecio(anuncio(5.5), [...base, c(0.3)], FUENTE);
    for (const r of [con, con2]) {
      expect(r).toMatchObject({
        n: "n" in sin ? sin.n : -1,
        estado: sin.estado,
      });
      if (r.estado !== "sin_datos" && sin.estado !== "sin_datos") {
        expect([r.p25M2, r.p75M2, r.medianaM2]).toEqual([
          sin.p25M2,
          sin.p75M2,
          sin.medianaM2,
        ]);
      }
    }
  });

  it("el anuncio mismo no cuenta como su propio comparable", () => {
    const yo: Comparable = {
      slug: "este",
      sector_codigo: BARRIO,
      area_m2: 80,
      precio_esperado: 20 * M * 80,
    };
    const r = rangoDePrecio(anuncio(5.5), [...SEIS(), yo], FUENTE);
    expect(r).toMatchObject({ n: 6, maxM2: 6_000_000 });
  });

  it("al publicar (sin slug) cuenta todos", () => {
    const r = rangoDePrecio({ ...anuncio(5.5), slug: null }, SEIS(), FUENTE);
    expect(r).toMatchObject({ n: 6 });
  });

  it("solo áreas dentro de ±30 % (los bordes cuentan)", () => {
    const dentro = [56, 104, 80, 70, 90].map((a) => c(5.5, BARRIO, a));
    const fuera = [55, 105, 200].map((a) => c(5.5, BARRIO, a));
    const r = rangoDePrecio(anuncio(5.5), [...dentro, ...fuera], FUENTE);
    expect(r).toMatchObject({ n: 5 });
  });

  it("ignora comparables con área o precio inválidos", () => {
    const malos: Comparable[] = [
      { slug: "x1", sector_codigo: BARRIO, area_m2: 0, precio_esperado: 1 },
      { slug: "x2", sector_codigo: BARRIO, area_m2: 80, precio_esperado: 0 },
    ];
    expect(
      rangoDePrecio(anuncio(5.5), [...SEIS(), ...malos], FUENTE),
    ).toMatchObject({ n: 6 });
  });
});

describe("rangoDePrecio — barrio y, si no alcanza, localidad con su rótulo", () => {
  it("con 3 en el barrio y 4 en el resto de la localidad ⇒ localidad, N = 7", () => {
    const cs = [
      ...[5.2, 5.4, 5.6].map((v) => c(v, BARRIO)),
      ...[5.0, 5.5, 5.8, 6.0].map((v) => c(v, OTRO)),
    ];
    expect(rangoDePrecio(anuncio(5.5), cs, FUENTE)).toMatchObject({
      ambito: "localidad",
      n: 7,
    });
  });

  it("con 5 o más en el barrio, el barrio manda aunque la localidad tenga más", () => {
    const cs = [...SEIS(), ...[9, 9.5, 10, 10.5, 11].map((v) => c(v, OTRO))];
    expect(rangoDePrecio(anuncio(5.5), cs, FUENTE)).toMatchObject({
      ambito: "barrio",
      n: 6,
      p75M2: 5_750_000,
    });
  });

  it("sin barrio del catálogo ⇒ directamente la localidad", () => {
    const r = rangoDePrecio(anuncio(5.5, 80, null), SEIS(), FUENTE);
    expect(r).toMatchObject({ ambito: "localidad", n: 6 });
  });

  it("con menos de 5 también en la localidad ⇒ sin datos, con el N de la localidad", () => {
    const cs = [c(5.2, BARRIO), c(5.4, OTRO), c(5.6, OTRO)];
    expect(rangoDePrecio(anuncio(5.5), cs, FUENTE)).toMatchObject({
      estado: "sin_datos",
      n: 3,
    });
  });
});

describe("rangoDePrecio — los cuatro estados", () => {
  it("por encima de P75 ⇒ caro, con cuánto pasa del tope", () => {
    // 6,5 / 5,75 − 1 = 13,04 % ⇒ 13
    expect(rangoDePrecio(anuncio(6.5), SEIS(), FUENTE)).toMatchObject({
      estado: "caro",
      porcentaje: 13,
    });
  });

  it("justo en P75 no es caro", () => {
    expect(rangoDePrecio(anuncio(5.75), SEIS(), FUENTE).estado).toBe(
      "en_rango",
    );
  });

  it("30 % o más bajo la mediana ⇒ sospechosamente barato", () => {
    // 3,85 = 5,5 × 0,7 justo en el umbral
    expect(rangoDePrecio(anuncio(3.85), SEIS(), FUENTE)).toMatchObject({
      estado: "sospechoso",
      porcentaje: 30,
    });
    // 3,4 / 5,5 ⇒ 38 % bajo la mediana
    expect(rangoDePrecio(anuncio(3.4), SEIS(), FUENTE)).toMatchObject({
      estado: "sospechoso",
      porcentaje: 38,
    });
  });

  it("debajo de P25 sin llegar a sospechoso ⇒ en rango, marcado «debajo»", () => {
    expect(rangoDePrecio(anuncio(4.5), SEIS(), FUENTE)).toMatchObject({
      estado: "en_rango",
      debajo: true,
      porcentaje: 0,
    });
  });

  it("dentro de P25–P75 ⇒ en rango, no «debajo»", () => {
    expect(rangoDePrecio(anuncio(5.3), SEIS(), FUENTE)).toMatchObject({
      estado: "en_rango",
      debajo: false,
    });
  });
});

describe("datosDeZona", () => {
  const terreno = {
    mediana: 4_950_000,
    manzanas: 12,
    vigencia: 2026,
    fuente: "Catastro Bogotá",
    licencia: "CC BY 4.0",
  };

  it("mediana de oferta del barrio (sin filtro de área), oferta activa y terreno, sin mezclarlos", () => {
    const cs = [...SEIS(), c(5.5, BARRIO, 300), c(7, OTRO)];
    const z = datosDeZona(BARRIO, cs, FUENTE, terreno);
    expect(z.medianaOferta).toMatchObject({
      ambito: "barrio",
      n: 7,
      medianaM2: 5_500_000,
    });
    expect(z.ofertaActiva).toEqual({ barrio: 7, localidad: 8 });
    expect(z.terreno).toEqual(terreno);
  });

  it("con menos de 5 en el barrio usa la localidad; con menos de 5 en total, no hay mediana", () => {
    const pocos = [
      c(5, BARRIO),
      c(5.2, OTRO),
      c(5.4, OTRO),
      c(5.6, OTRO),
      c(5.8, OTRO),
    ];
    expect(
      datosDeZona(BARRIO, pocos, FUENTE, null).medianaOferta,
    ).toMatchObject({
      ambito: "localidad",
      n: 5,
    });
    const z = datosDeZona(BARRIO, pocos.slice(0, 3), FUENTE, null);
    expect(z.medianaOferta).toBeNull();
    expect(z.ofertaActiva).toEqual({ barrio: 1, localidad: 3 });
    expect(z.terreno).toBeNull();
  });

  it("sin barrio del catálogo: la oferta del barrio es null y la mediana sale de la localidad", () => {
    const z = datosDeZona(null, SEIS(), FUENTE, null);
    expect(z.ofertaActiva.barrio).toBeNull();
    expect(z.medianaOferta).toMatchObject({ ambito: "localidad" });
  });
});

describe("valorReferenciaDe (el archivo de Catastro, solo servidor)", () => {
  it("devuelve la mediana del barrio con sus manzanas, vigencia, fuente y licencia", () => {
    const v = valorReferenciaDe("001101");
    expect(v).toMatchObject({
      mediana: 1_530_000,
      manzanas: 10,
      vigencia: 2026,
      licencia: "CC BY 4.0",
    });
  });

  it("null para un barrio sin valor, uno inexistente o ninguno", () => {
    expect(valorReferenciaDe("999999")).toBeNull();
    expect(valorReferenciaDe(null)).toBeNull();
    expect(valorReferenciaDe(undefined)).toBeNull();
  });
});
