// @vitest-environment node
import { describe, expect, it } from "vitest";
import registroReal from "@/data/normas-clausulas.json";
import {
  CLAUSULAS,
  DOCUMENTOS_CLAUSULAS,
  clausulasDe,
  type IdNorma,
} from "@/engine/papeleo/guia";
import { PAPELEO_CLAUSULAS } from "@/textos/papeleo-clausulas";
import { absolutosEn } from "./utils/absolutos";

// S14 — «Qué dice cada documento»: cada cláusula es texto fijo que cita artículos leídos en su texto oficial. La estructura
// (`guia.ts`) dice qué artículos cita, por número; el registro (`normas-clausulas.json`) dice cuáles se leyeron, dónde y cuándo; y el
// texto, en los dos idiomas, tiene que citar exactamente esos. Ninguna frase afirma de más.
type Texto = { es: string; en: string };
type Registro = {
  consultado: string;
  normas: Record<
    string,
    { nombre: string; leida_en: string; articulos: number[] }
  >;
};
type Revisable = {
  id: string;
  normas: Partial<Record<string, readonly number[]>>;
  norma: Texto;
};

// Cómo se nombra cada norma en el texto (el tipo obliga a nombrarlas todas).
const NOMBRE: Record<IdNorma, Texto> = {
  codigo_civil: { es: "Código Civil", en: "Civil Code" },
  codigo_comercio: { es: "Código de Comercio", en: "Commercial Code" },
  ley_153_1887: { es: "Ley 153 de 1887", en: "Law 153 of 1887" },
  ley_1579_2012: { es: "Ley 1579 de 2012", en: "Law 1579 of 2012" },
  ley_258_1996: { es: "Ley 258 de 1996", en: "Law 258 of 1996" },
  decreto_960_1970: {
    es: "Decreto-Ley 960 de 1970",
    en: "Decree-Law 960 of 1970",
  },
  ordenanza_039_2020: {
    es: "Ordenanza 039 de 2020",
    en: "Ordinance 039 of 2020",
  },
  estatuto_tributario: { es: "Estatuto Tributario", en: "Tax Code" },
};

const ordenar = (xs: readonly number[]) => [...xs].sort((a, b) => a - b);

/** Los números que el texto cita después de «art.» o «arts.» (no los de «Ley 1579 de 2012» ni «numeral 3»). */
function articulosCitados(texto: string): number[] {
  const nums: number[] = [];
  for (const m of texto.matchAll(
    /\barts?\.\s*((?:\d+(?:\s*(?:,|y|and)\s*)?)+)/g,
  )) {
    for (const n of m[1].match(/\d+/g) ?? []) nums.push(Number(n));
  }
  return ordenar(nums);
}

function problemasDe(clausulas: readonly Revisable[], r: Registro): string[] {
  const p: string[] = [];
  for (const c of clausulas) {
    const citados: number[] = [];
    for (const [ley, arts = []] of Object.entries(c.normas)) {
      citados.push(...arts);
      const leida = r.normas[ley];
      if (!leida) {
        p.push(`${c.id}: ${ley} no está en el registro de lo leído`);
        continue;
      }
      for (const a of arts)
        if (!leida.articulos.includes(a))
          p.push(`${c.id}: ${ley} art. ${a} no se leyó`);
      for (const idioma of ["es", "en"] as const) {
        const nombre = NOMBRE[ley as IdNorma]?.[idioma];
        if (!nombre || !c.norma[idioma].includes(nombre))
          p.push(`${c.id}.${idioma}: no nombra ${ley}`);
      }
    }
    if (citados.length === 0) p.push(`${c.id}: sin artículo`);
    for (const idioma of ["es", "en"] as const) {
      const enTexto = articulosCitados(c.norma[idioma]);
      if (enTexto.join() !== ordenar(citados).join())
        p.push(
          `${c.id}.${idioma}: el texto cita [${enTexto}] y la estructura [${ordenar(citados)}]`,
        );
    }
  }
  return p;
}

const real: Revisable[] = CLAUSULAS.map((c) => ({
  id: c.id,
  normas: c.normas,
  norma: PAPELEO_CLAUSULAS.clausulas[c.id].norma,
}));
const registro: Registro = registroReal;
const claves = (o: object) => Object.keys(o).sort();
const copia = <T>(x: T): T => structuredClone(x);

describe("la estructura, el texto y el registro de lo leído van de la mano", () => {
  it("cada cláusula tiene su texto y cada texto su cláusula", () => {
    expect(claves(PAPELEO_CLAUSULAS.clausulas)).toEqual(
      CLAUSULAS.map((c) => c.id).sort(),
    );
  });

  it("los tres documentos tienen su título y al menos dos cláusulas", () => {
    expect(claves(PAPELEO_CLAUSULAS.documentos)).toEqual(
      [...DOCUMENTOS_CLAUSULAS].sort(),
    );
    for (const d of DOCUMENTOS_CLAUSULAS)
      expect(clausulasDe(d, false).length, d).toBeGreaterThanOrEqual(2);
  });

  it("el registro tiene fecha de consulta y, por norma, dónde se leyó; nombra justo las normas que citan las cláusulas", () => {
    expect(registro.consultado).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(claves(registro.normas)).toEqual(claves(NOMBRE));
    for (const [ley, n] of Object.entries(registro.normas)) {
      expect(n.leida_en.length, ley).toBeGreaterThan(20);
      expect(n.articulos.length, ley).toBeGreaterThan(0);
    }
  });

  it("el registro no guarda artículos que ninguna cláusula cita (es lo que citan, no una lista suelta)", () => {
    for (const [ley, n] of Object.entries(registro.normas)) {
      const citados = new Set(
        CLAUSULAS.flatMap(
          (c) =>
            (c.normas as Partial<Record<string, readonly number[]>>)[ley] ?? [],
        ),
      );
      expect(ordenar([...citados]), ley).toEqual(ordenar(n.articulos));
    }
  });
});

describe("cada cláusula cita artículos leídos, y su texto cita exactamente esos", () => {
  it("ninguna cláusula del diccionario real tiene problemas", () => {
    expect(problemasDe(real, registro)).toEqual([]);
  });

  it("todas son de norma leída", () => {
    for (const c of CLAUSULAS) expect(c.estado, c.id).toBe("vigente");
  });

  it("DEMO EN ROJO: un artículo que no se leyó, un texto que cita otro número, una norma sin nombrar y una cláusula sin artículo caen", () => {
    const malas = copia(real);
    const de = (id: string) => malas.find((c) => c.id === id) as Revisable;
    de("requisitos").normas = { ley_153_1887: [90] };
    de("requisitos").norma = {
      es: "Ley 153 de 1887, art. 90.",
      en: "Law 153 of 1887, art. 90.",
    };
    de("incumplimiento").norma = {
      es: "Código Civil, arts. 1546 y 1602.",
      en: "Civil Code, art. 1546.",
    };
    de("perfecciona").norma = {
      es: "Código de Comercio, art. 1857.",
      en: "Civil Code, art. 1857.",
    };
    de("prioridad").normas = {};
    de("prioridad").norma = {
      es: "Ley 1579 de 2012.",
      en: "Law 1579 of 2012.",
    };
    const p = problemasDe(malas, registro).join(" | ");
    expect(p).toContain("requisitos: ley_153_1887 art. 90 no se leyó");
    expect(p).toContain(
      "incumplimiento.es: el texto cita [1546,1602] y la estructura [1546]",
    );
    expect(p).not.toContain("incumplimiento.en");
    expect(p).toContain("perfecciona.es: no nombra codigo_civil");
    expect(p).toContain("prioridad: sin artículo");
  });

  it("lee los números de «art.» y «arts.» y no los del nombre de la ley ni los numerales", () => {
    expect(articulosCitados("Ley 153 de 1887, art. 89, numeral 3.")).toEqual([
      89,
    ]);
    expect(
      articulosCitados(
        "Código Civil, art. 1862; Decreto-Ley 960 de 1970, art. 223; Ordenanza 039 de 2020 de Cundinamarca, art. 212.",
      ),
    ).toEqual([212, 223, 1862]);
    expect(
      articulosCitados("Civil Code, arts. 1592, 1599, 1600 and 1601."),
    ).toEqual([1592, 1599, 1600, 1601]);
  });
});

describe("lo que la pantalla necesita de cada cláusula", () => {
  it("la de la hipoteca entra solo con crédito", () => {
    const ids = (credito: boolean) =>
      DOCUMENTOS_CLAUSULAS.flatMap((d) =>
        clausulasDe(d, credito).map((c) => c.id),
      );
    expect(ids(false)).not.toContain("hipoteca");
    expect(ids(true)).toContain("hipoteca");
    expect(ids(true)).toHaveLength(CLAUSULAS.length);
    expect(ids(false)).toHaveLength(CLAUSULAS.length - 1);
  });

  it("dice que explica la norma y que no es asesoría legal, en los dos idiomas", () => {
    expect(PAPELEO_CLAUSULAS.aviso.es).toMatch(/no es asesoría legal/);
    expect(PAPELEO_CLAUSULAS.aviso.en).toMatch(/not legal advice/);
    expect(PAPELEO_CLAUSULAS.leidas.es).toContain("{fecha}");
  });
});

describe("ninguna frase absoluta en las cláusulas", () => {
  it("el texto de las cláusulas no afirma «siempre», «nunca» ni «obligatorio»", () => {
    expect(absolutosEn(PAPELEO_CLAUSULAS)).toEqual([]);
  });

  it("DEMO EN ROJO: una cláusula con «siempre» cae, con su ruta exacta", () => {
    const mala = copia(PAPELEO_CLAUSULAS) as unknown as {
      clausulas: { arras: { queDice: Texto } };
    };
    mala.clausulas.arras.queDice.es =
      "Son algo que una parte entrega, casi siempre dinero.";
    expect(absolutosEn(mala)).toEqual([
      { ruta: "clausulas.arras.queDice", idioma: "es", palabra: "siempre" },
    ]);
  });
});
