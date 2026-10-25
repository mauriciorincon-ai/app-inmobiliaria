// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { AvisoGasto, IdLinea } from "@/engine/papeleo/gastos";
import {
  DOCUMENTOS,
  PLAZOS,
  pasosDe,
  type EstadoGuia,
} from "@/engine/papeleo/guia";
import { PAPELEO } from "@/textos/papeleo";
import { absolutosEn } from "./utils/absolutos";

// S14 — la guía del papeleo: la estructura (`guia.ts`) y su texto (`textos/papeleo.ts`) van de la mano, cada paso con su norma
// citada o dicho que es práctica, y ninguna frase afirma más de lo que dice la norma.
const claves = (o: object) => Object.keys(o).sort();

describe("la estructura y el texto de la guía van de la mano", () => {
  it("cada documento y cada plazo tiene su texto, y cada texto su paso", () => {
    expect(claves(PAPELEO.documentos)).toEqual(
      DOCUMENTOS.map((d) => d.id).sort(),
    );
    expect(claves(PAPELEO.plazos)).toEqual(PLAZOS.map((p) => p.id).sort());
  });

  it("cada línea de gastos y cada aviso tienen su texto", () => {
    const lineas = [
      "derechos_notariales",
      "recaudos_notariales",
      "iva_notarial",
      "impuesto_registro",
      "derechos_registro",
      "certificado_tradicion",
      "retencion_enajenacion",
      "hipoteca",
    ] as const satisfies readonly IdLinea[];
    const avisos = [
      "supera_tope_vis",
      "vis_sin_subsidio",
      "vip_sin_subsidio",
      "avaluo_mayor",
      "vis_tarifa_unica",
      "vip_notarial_no_verificado",
      "impuesto_otro_departamento",
      "vende_empresa",
      "hojas_adicionales",
    ] as const satisfies readonly AvisoGasto["id"][];
    expect(claves(PAPELEO.lineas)).toEqual([...lineas].sort());
    expect(claves(PAPELEO.avisos)).toEqual([...avisos].sort());
  });

  it("los estados de la guía tienen su rótulo", () => {
    const estados: readonly EstadoGuia[] = ["vigente", "practica"];
    for (const e of estados)
      expect(PAPELEO.estados[e].es.length).toBeGreaterThan(3);
    expect(PAPELEO.estados.no_verificado.es).toBe("No verificado");
  });

  it("con crédito entran los pasos del banco y de la hipoteca; sin crédito, no", () => {
    expect(pasosDe(DOCUMENTOS, false).map((d) => d.id)).not.toContain(
      "credito",
    );
    expect(pasosDe(DOCUMENTOS, true).map((d) => d.id)).toContain("credito");
    expect(pasosDe(PLAZOS, false).map((p) => p.id)).not.toContain("hipoteca");
    expect(pasosDe(PLAZOS, true).map((p) => p.id)).toContain("hipoteca");
    expect(pasosDe(PLAZOS, false).length).toBe(PLAZOS.length - 1);
  });
});

describe("cada paso dice de dónde sale", () => {
  const pasos = [
    ...DOCUMENTOS.map((d) => ({ ...d, texto: PAPELEO.documentos[d.id].norma })),
    ...PLAZOS.map((p) => ({ ...p, texto: PAPELEO.plazos[p.id].norma })),
  ];

  it("un paso con norma leída cita su artículo, en los dos idiomas", () => {
    for (const p of pasos.filter((x) => x.estado === "vigente")) {
      expect(p.texto.es, p.id).toMatch(/\bart(s)?\./);
      expect(p.texto.en, p.id).toMatch(/\bart(s)?\./);
    }
  });

  it("un paso de práctica NO se disfraza de norma: no cita ningún artículo", () => {
    for (const p of pasos.filter((x) => x.estado === "practica")) {
      expect(p.texto.es, p.id).not.toMatch(/\bart(s)?\./);
      expect(p.texto.en, p.id).not.toMatch(/\bart(s)?\./);
    }
    expect(pasos.some((p) => p.estado === "practica")).toBe(true);
  });
});

describe("ninguna frase absoluta (se busca por la promesa, no por la palabra)", () => {
  it("el texto del papeleo no afirma «siempre», «nunca» ni «obligatorio»", () => {
    expect(absolutosEn(PAPELEO)).toEqual([]);
  });

  it("DEMO EN ROJO: el barrido sí encuentra un absoluto en español y en inglés, en cualquier hoja", () => {
    const mala = {
      a: {
        b: { es: "Siempre se paga por mitades", en: "It is split in half" },
      },
      c: [
        { es: "El registro es obligatorio", en: "Registration is mandatory" },
      ],
      d: { es: "Nunca cambia", en: "It never changes" },
    };
    expect(absolutosEn(mala).map((x) => [x.ruta, x.idioma, x.palabra])).toEqual(
      [
        ["a.b", "es", "Siempre"],
        ["c[0]", "es", "obligatorio"],
        ["c[0]", "en", "mandatory"],
        ["d", "es", "Nunca"],
        ["d", "en", "never"],
      ],
    );
  });
});
