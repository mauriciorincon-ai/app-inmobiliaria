// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { TarifasPapeleo } from "../../src/engine/papeleo/gastos";
import { normalizarClave } from "../../src/engine/vivienda-nueva/clave";

// S14 — el archivo de tarifas del papeleo (`src/data/tarifas-papeleo.json`) es un dato con reglas: lo `vigente` trae su norma con
// artículo, su año, su fecha de consulta y de dónde se leyó; lo `no_verificado` se nombra y NO trae ninguna cifra. Gate propio nuevo:
// se demuestra fallando con copias malas y luego se aplica al archivo real.
const RAIZ = join(__dirname, "..", "..");
const leer = <T>(f: string): T =>
  JSON.parse(readFileSync(join(RAIZ, "src/data", f), "utf8")) as T;
const real = leer<Archivo>("tarifas-papeleo.json");
const esc = leer<{ vigencia: number; consultado: string }>(
  "tarifas-escrituracion.json",
);

type Bi = { es?: string; en?: string } | null | undefined;
type Concepto = {
  id: string;
  nombre?: Bi;
  norma?: Bi;
  anio?: number;
  consultado?: string;
  estado?: string;
  nota?: Bi;
  fuente_primaria?: boolean;
  verificada_en?: string[];
  [clave: string]: unknown;
};
type Archivo = {
  version: number;
  vigencia: number;
  consultado: string;
  descripcion: Bi;
  alias_ciudad: Record<string, string>;
  conceptos: Concepto[];
  referencias: Record<string, { norma?: Bi; [clave: string]: unknown }>;
};

const lleno = (b: Bi) =>
  !!b &&
  typeof b.es === "string" &&
  b.es.trim().length > 5 &&
  typeof b.en === "string" &&
  b.en.trim().length > 5;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const CIFRAS = [
  "valor",
  "tarifa",
  "tarifa_por_mil",
  "tramos",
  "electronico",
  "fisico",
];

/** Las reglas del archivo. Devuelve cada problema con su sitio; vacío = el archivo está bien. */
export function problemasDe(a: Archivo): string[] {
  const p: string[] = [];
  if (!Number.isInteger(a.vigencia)) p.push("vigencia");
  if (!ISO.test(a.consultado)) p.push("consultado del archivo");
  if (!lleno(a.descripcion)) p.push("descripcion es/en");
  for (const [alias, clave] of Object.entries(a.alias_ciudad)) {
    // Una clave de alias está normalizada (minúsculas, sin tildes) y apunta a otra, no a sí misma.
    if (alias !== normalizarClave(alias) || alias === clave || !clave)
      p.push(`alias_ciudad: ${alias}`);
  }
  const ids = a.conceptos.map((c) => c.id);
  if (new Set(ids).size !== ids.length) p.push("ids repetidos");
  for (const c of a.conceptos) {
    const d = c.id;
    if (!lleno(c.nombre)) p.push(`${d}: nombre es/en`);
    if (c.anio !== a.vigencia) p.push(`${d}: anio distinto de la vigencia`);
    if (!ISO.test(c.consultado ?? "")) p.push(`${d}: consultado`);
    if (c.estado === "vigente") {
      if (!lleno(c.norma)) p.push(`${d}: vigente sin norma es/en`);
      else if (
        !/\bart/i.test(c.norma?.es ?? "") ||
        !/\bart/i.test(c.norma?.en ?? "")
      )
        p.push(`${d}: la norma no cita artículo`);
      const fuentes = c.verificada_en ?? [];
      if (!(c.fuente_primaria === true || fuentes.length >= 2))
        p.push(`${d}: vigente con una sola fuente que no es primaria`);
      if (fuentes.length < 1 || fuentes.some((f) => f.trim().length < 20))
        p.push(`${d}: verificada_en vacío o sin describir`);
    } else if (c.estado === "no_verificado") {
      if (!lleno(c.nota)) p.push(`${d}: no_verificado sin nota es/en`);
      const cifra = CIFRAS.find((k) => k in c);
      if (cifra) p.push(`${d}: no_verificado con cifra (${cifra})`);
    } else {
      p.push(`${d}: estado ${String(c.estado)}`);
    }
  }
  for (const [k, r] of Object.entries(a.referencias)) {
    if (k !== "hipoteca" || r.norma) {
      if (!lleno(r.norma)) p.push(`referencias.${k}: norma es/en`);
    }
  }
  if (/https?:\/\//i.test(JSON.stringify(a))) p.push("trae un enlace");
  return p;
}

const copia = (): Archivo => structuredClone(real);
const concepto = (a: Archivo, id: string) =>
  a.conceptos.find((c) => c.id === id)!;

describe("el archivo real cumple las reglas", () => {
  it("sin problemas", () => {
    expect(problemasDe(real)).toEqual([]);
  });

  it("tiene los conceptos que el motor busca por id", () => {
    expect(real.conceptos.map((c) => c.id).sort()).toEqual([
      "certificado_tradicion",
      "impuesto_registro",
      "iva_notarial",
      "recaudos_notariales",
      "retencion_enajenacion",
    ]);
    expect(Object.keys(real.referencias).sort()).toEqual([
      "derechos_notariales",
      "derechos_registro",
      "hipoteca",
    ]);
  });

  it("es del mismo año que las tarifas del S12 y se consultó después de ellas", () => {
    expect(real.vigencia).toBe(esc.vigencia);
    expect(real.consultado >= esc.consultado).toBe(true);
  });

  it("las cifras son las de la norma (si cambian, se vuelve a leer la norma)", () => {
    expect(concepto(real, "impuesto_registro").tarifa_por_mil).toBe(10);
    expect(concepto(real, "retencion_enajenacion").tarifa).toBe(0.01);
    const ctl = concepto(real, "certificado_tradicion");
    expect([ctl.electronico, ctl.fisico, ctl.mas_de_150_anotaciones]).toEqual([
      23_000, 24_300, 53_100,
    ]);
    // Los recaudos del art. 50 crecen con la cuantía y el último tramo no tiene tope.
    const tramos = concepto(real, "recaudos_notariales").tramos as {
      hasta?: number;
      valor: number;
    }[];
    expect(tramos.map((t) => t.valor)).toEqual([
      28_900, 43_700, 52_700, 71_900, 84_800, 96_400,
    ]);
    expect(
      tramos
        .slice(0, -1)
        .every((t, i) => t.hasta! < (tramos[i + 1].hasta ?? Infinity)),
    ).toBe(true);
    expect(tramos.at(-1)?.hasta).toBeUndefined();
  });

  it("el IVA de los derechos notariales sigue sin verificar y sin cifra", () => {
    const iva = concepto(real, "iva_notarial");
    expect(iva.estado).toBe("no_verificado");
    expect(iva.norma).toBeNull();
    expect(CIFRAS.some((k) => k in iva)).toBe(false);
  });
});

describe("DEMO EN ROJO: el gate cae con un archivo malo", () => {
  it.each([
    [
      "vigente sin norma",
      (a: Archivo) => (concepto(a, "retencion_enajenacion").norma = null),
      "vigente sin norma",
    ],
    [
      "norma sin artículo",
      (a: Archivo) =>
        (concepto(a, "retencion_enajenacion").norma = {
          es: "El Estatuto Tributario",
          en: "The Tax Code",
        }),
      "no cita artículo",
    ],
    [
      "una sola fuente que no es primaria",
      (a: Archivo) => {
        const c = concepto(a, "certificado_tradicion");
        c.verificada_en = [c.verificada_en![0]];
      },
      "una sola fuente",
    ],
    [
      "no verificado con cifra",
      (a: Archivo) => (concepto(a, "iva_notarial").tarifa = 0.19),
      "no_verificado con cifra",
    ],
    [
      "no verificado sin nota",
      (a: Archivo) => (concepto(a, "iva_notarial").nota = null),
      "no_verificado sin nota",
    ],
    [
      "año distinto",
      (a: Archivo) => (concepto(a, "impuesto_registro").anio = 2025),
      "distinto de la vigencia",
    ],
    [
      "fecha de consulta mal escrita",
      (a: Archivo) => (concepto(a, "impuesto_registro").consultado = "ayer"),
      "consultado",
    ],
    [
      "id repetido",
      (a: Archivo) => a.conceptos.push(structuredClone(a.conceptos[0])),
      "ids repetidos",
    ],
    [
      "estado inventado",
      (a: Archivo) => (concepto(a, "impuesto_registro").estado = "casi"),
      "estado casi",
    ],
    [
      "un enlace",
      (a: Archivo) =>
        (concepto(a, "impuesto_registro").verificada_en = [
          "Leído en https://ejemplo.invalid/norma, artículo 217 de la ordenanza",
        ]),
      "enlace",
    ],
    [
      "alias de ciudad sin normalizar",
      (a: Archivo) => (a.alias_ciudad["Santiago de Cali"] = "cali"),
      "alias_ciudad: Santiago de Cali",
    ],
    [
      "referencia sin norma",
      (a: Archivo) => (a.referencias.derechos_registro.norma = null),
      "referencias.derechos_registro",
    ],
  ])("%s", (_n, estropear, esperado) => {
    const a = copia();
    estropear(a);
    expect(problemasDe(a).join(" | ")).toContain(esperado);
  });
});

describe("el tipo del motor describe el archivo real", () => {
  it("el archivo se puede entregar al motor tal cual", () => {
    const comoMotor = real as unknown as TarifasPapeleo;
    expect(comoMotor.vigencia).toBe(2026);
    expect(comoMotor.referencias.hipoteca.norma.es.length).toBeGreaterThan(10);
  });
});
