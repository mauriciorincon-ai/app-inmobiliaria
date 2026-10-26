// @vitest-environment node
import { describe, expect, it } from "vitest";
import registroReal from "@/data/normas-ctl.json";
import {
  NORMAS_CANCELACION,
  NORMAS_MARCA,
  TIPOS_MARCA,
  type IdNormaCtl,
} from "@/engine/ctl/marcas";
import { CTL } from "@/textos/ctl";
import { absolutosEn } from "./utils/absolutos";

// S15 — el lector de CTL cita normas leídas en su texto oficial. La estructura (`marcas.ts`) dice qué artículos cita cada marca;
// el registro (`normas-ctl.json`) dice cuáles se leyeron, dónde y cuándo; y el texto, en los dos idiomas, cita exactamente esos.
type Texto = { es: string; en: string };
type Registro = {
  consultado: string;
  normas: Record<string, { nombre: string; leida_en: string; articulos: number[] }>;
};
type Revisable = {
  id: string;
  normas: Partial<Record<string, readonly number[]>>;
  norma: Texto;
};

const NOMBRE: Record<IdNormaCtl, Texto> = {
  ley_1579_2012: { es: "Ley 1579 de 2012", en: "Law 1579 of 2012" },
  codigo_civil: { es: "Código Civil", en: "Civil Code" },
  codigo_general_proceso: {
    es: "Código General del Proceso",
    en: "General Code of Procedure",
  },
  ley_258_1996: { es: "Ley 258 de 1996", en: "Law 258 of 1996" },
  ley_70_1931: { es: "Ley 70 de 1931", en: "Law 70 of 1931" },
  ley_1537_2012: { es: "Ley 1537 de 2012", en: "Law 1537 of 2012" },
  ley_2079_2021: { es: "Ley 2079 de 2021", en: "Law 2079 of 2021" },
};

const ordenar = (xs: readonly number[]) => [...xs].sort((a, b) => a - b);

function articulosCitados(texto: string): number[] {
  const nums: number[] = [];
  for (const m of texto.matchAll(/\barts?\.\s*((?:\d+(?:\s*(?:,|y|and)\s*)?)+)/g)) {
    for (const n of m[1].match(/\d+/g) ?? []) nums.push(Number(n));
  }
  return ordenar(nums);
}

function problemasDe(items: readonly Revisable[], r: Registro): string[] {
  const p: string[] = [];
  for (const c of items) {
    const citados: number[] = [];
    for (const [ley, arts = []] of Object.entries(c.normas)) {
      citados.push(...arts);
      const leida = r.normas[ley];
      if (!leida) {
        p.push(`${c.id}: ${ley} no está en el registro de lo leído`);
        continue;
      }
      for (const a of arts)
        if (!leida.articulos.includes(a)) p.push(`${c.id}: ${ley} art. ${a} no se leyó`);
      for (const idioma of ["es", "en"] as const) {
        const nombre = NOMBRE[ley as IdNormaCtl]?.[idioma];
        if (!nombre || !c.norma[idioma].includes(nombre)) p.push(`${c.id}.${idioma}: no nombra ${ley}`);
      }
    }
    if (citados.length === 0) p.push(`${c.id}: sin artículo`);
    for (const idioma of ["es", "en"] as const) {
      const enTexto = articulosCitados(c.norma[idioma]);
      if (enTexto.join() !== ordenar(citados).join())
        p.push(`${c.id}.${idioma}: el texto cita [${enTexto}] y la estructura [${ordenar(citados)}]`);
    }
  }
  return p;
}

const real: Revisable[] = [
  ...TIPOS_MARCA.map((t) => ({ id: t, normas: NORMAS_MARCA[t], norma: CTL.marcas[t].norma })),
  { id: "cancelacion", normas: NORMAS_CANCELACION, norma: CTL.cancelacion.norma },
];
const registro: Registro = registroReal;
const claves = (o: object) => Object.keys(o).sort();

describe("la estructura, el texto y el registro de lo leído van de la mano", () => {
  it("cada tipo de marca tiene su texto y cada texto su tipo", () => {
    expect(claves(CTL.marcas)).toEqual([...TIPOS_MARCA].sort());
  });

  it("el registro tiene fecha de consulta, dónde se leyó cada norma, y justo las normas y artículos que se citan", () => {
    expect(registro.consultado).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(claves(registro.normas)).toEqual(claves(NOMBRE));
    for (const [ley, n] of Object.entries(registro.normas)) {
      expect(n.leida_en.length, ley).toBeGreaterThan(20);
      const citados = new Set(real.flatMap((c) => c.normas[ley] ?? []));
      expect(ordenar([...citados]), ley).toEqual(ordenar(n.articulos));
    }
  });

  it("ningún texto del lector tiene problemas de cita", () => {
    expect(problemasDe(real, registro)).toEqual([]);
  });

  it("ningún texto del lector afirma con absolutos", () => {
    expect(absolutosEn(CTL)).toEqual([]);
  });
});

describe("demo en rojo: el chequeo cae cuando debe", () => {
  const hipoteca = real[0];
  it("un artículo que no se leyó", () => {
    const c = { ...hipoteca, normas: { ...hipoteca.normas, codigo_civil: [2432, 2452, 2453] } };
    expect(problemasDe([c], registro)).toContain("hipoteca: codigo_civil art. 2453 no se leyó");
  });
  it("un texto que cita otro número que la estructura", () => {
    const c = { ...hipoteca, norma: { ...hipoteca.norma, es: "Ley 1579 de 2012, art. 8; Código Civil, art. 2432." } };
    expect(problemasDe([c], registro)).toEqual([
      "hipoteca.es: el texto cita [8,2432] y la estructura [8,2432,2452]",
    ]);
  });
  it("una norma sin nombrar en un idioma, o fuera del registro", () => {
    const sinNombre = { ...hipoteca, norma: { ...hipoteca.norma, en: "Law 1579 of 2012, art. 8; arts. 2432 and 2452." } };
    expect(problemasDe([sinNombre], registro)).toContain("hipoteca.en: no nombra codigo_civil");
    const fuera = { id: "x", normas: { ley_inventada: [1] }, norma: { es: "art. 1", en: "art. 1" } };
    expect(problemasDe([fuera], registro)).toContain("x: ley_inventada no está en el registro de lo leído");
  });
});
