// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  fechaDeExpedicion,
  leerCtl,
  normalizar,
  partirAnotaciones,
  resumenDe,
  type Lectura,
} from "@/engine/ctl/lector";

// El lector de CTL (S15) contra certificados SINTÉTICOS con la estructura pública del certificado («PERSONA A», matrícula en
// ceros). Hoy no hay certificados reales: el lector queda apagado hasta validarlo con ellos (`scripts/ctl-validar.mjs`).
const fixture = (n: string) =>
  readFileSync(
    join(__dirname, "..", "..", "fixtures", "ctl", `${n}.txt`),
    "utf8",
  );
const HOY = "2026-10-25";

function leido(l: Lectura) {
  if (l.estado !== "leido") throw new Error(l.estado);
  return l;
}

describe("los certificados sintéticos", () => {
  it("limpio: compraventa y propiedad horizontal, sin marcas ni anotaciones desconocidas", () => {
    const l = leido(leerCtl(fixture("limpio"), HOY));
    expect(l.anotaciones).toBe(2);
    expect(l.marcas).toEqual([]);
    expect(l.noReconocidas).toEqual([]);
    expect(l.diasDesdeExpedicion).toBe(5);
  });

  it("hipoteca cancelada por número y otra vigente", () => {
    const l = leido(leerCtl(fixture("hipoteca-cancelada"), HOY));
    expect(l.anotaciones).toBe(4);
    expect(l.marcas).toEqual([
      {
        tipo: "hipoteca",
        anotacion: 2,
        fecha: "2010-01-11",
        codigo: "0204",
        codigoFueraDeCatalogo: false,
        vigente: false,
        canceladaPor: 3,
      },
      {
        tipo: "hipoteca",
        anotacion: 4,
        fecha: "2021-03-03",
        codigo: "0205",
        codigoFueraDeCatalogo: false,
        vigente: true,
        canceladaPor: null,
      },
    ]);
    expect(resumenDe(l.marcas)).toEqual({ vigentes: 1, canceladas: 1 });
    expect(l.cancelacionesSinNumero).toEqual([]);
    expect(l.diasDesdeExpedicion).toBe(54);
  });

  it("embargo, demanda y vivienda familiar; una cancelación SIN número no cancela nada", () => {
    const l = leido(leerCtl(fixture("embargo-y-familia"), HOY));
    expect(l.marcas.map((m) => [m.tipo, m.anotacion, m.vigente])).toEqual([
      ["vivienda_familiar", 2, true],
      ["embargo", 3, true],
      ["medida_cautelar", 4, true],
    ]);
    expect(l.cancelacionesSinNumero).toEqual([5]);
    expect(l.diasDesdeExpedicion).toBeNull();
  });

  it("falsa tradición, patrimonio de familia (uno cancelado), un código fuera del catálogo y una referencia rota; formato con tildes", () => {
    const l = leido(leerCtl(fixture("patrimonio-y-falsa-tradicion"), HOY));
    expect(l.anotaciones).toBe(6);
    expect(
      l.marcas.map((m) => [m.tipo, m.anotacion, m.vigente, m.canceladaPor]),
    ).toEqual([
      ["falsa_tradicion", 1, true, null],
      ["patrimonio_familia", 2, true, null],
      // S16: el 0999 no está en el catálogo de 2016; su grupo (09, «otros») lo lee como una limitación que se pregunta, y la
      // marca dice que el código no está en el catálogo.
      ["limitacion_dominio", 3, true, null],
      ["patrimonio_familia", 4, false, 5],
    ]);
    expect(l.marcas[2].codigoFueraDeCatalogo).toBe(true);
    expect(l.noReconocidas).toEqual([]);
    expect(l.referenciasRotas).toEqual([6]);
    expect(l.marcas[0].fecha).toBe("1999-04-04");
    expect(l.diasDesdeExpedicion).toBe(10);
  });
});

describe("los bordes del texto", () => {
  it("vacío y sin anotaciones", () => {
    expect(leerCtl("   \n ", HOY)).toEqual({ estado: "vacio" });
    expect(leerCtl("Esto es otro documento, sin anotaciones.", HOY)).toEqual({
      estado: "sin_anotaciones",
    });
  });

  it("normaliza tildes, mayúsculas y espacios, conservando los saltos de línea", () => {
    expect(normalizar("Anotación  Nro.\tdos\nespecificación")).toBe(
      "ANOTACION NRO. DOS\nESPECIFICACION",
    );
  });

  it("«se cancela anotación No: 2» dentro de un bloque NO abre otra anotación", () => {
    const a = partirAnotaciones(
      "ANOTACION: Nro 1 Fecha: 01-01-2020\nESPECIFICACION: 0204 HIPOTECA\nANOTACION: Nro 2 Fecha: 02-02-2021\nSe cancela anotacion No: 1\nESPECIFICACION: 0843 CANCELACION HIPOTECA",
    );
    expect(a.map((x) => x.numero)).toEqual([1, 2]);
    expect(a[1].cancela).toEqual([1]);
  });

  it("la nota «cancelada por la anotación N» en la anotación cancelada también cuenta, si N es una cancelación", () => {
    const t = (tipoN: string) =>
      `ANOTACION: Nro 1 Fecha: 01-01-2020\nCancelada por la anotacion Nro 2\nESPECIFICACION: 0429 EMBARGO EJECUTIVO\nANOTACION: Nro 2 Fecha: 02-02-2021\nESPECIFICACION: ${tipoN}`;
    expect(
      leido(leerCtl(t("0842 CANCELACION EMBARGO"), HOY)).marcas[0],
    ).toMatchObject({
      vigente: false,
      canceladaPor: 2,
    });
    // Si la anotación 2 no es una cancelación, la nota no basta.
    expect(leido(leerCtl(t("0125 COMPRAVENTA"), HOY)).marcas[0].vigente).toBe(
      true,
    );
  });

  it("una cancelación de varias anotaciones y una que se nombra a sí misma", () => {
    const l = leido(
      leerCtl(
        "ANOTACION: Nro 1\nESPECIFICACION: 0204 HIPOTECA\nANOTACION: Nro 2\nESPECIFICACION: 0429 EMBARGO\nANOTACION: Nro 3\nSe cancelan las anotaciones No. 1 y 2\nESPECIFICACION: 0843 CANCELACION\nANOTACION: Nro 4\nSe cancela anotacion No: 4\nESPECIFICACION: 0843 CANCELACION",
        HOY,
      ),
    );
    expect(l.marcas.every((m) => !m.vigente && m.canceladaPor === 3)).toBe(
      true,
    );
    expect(l.referenciasRotas).toEqual([4]);
  });

  it("clasifica por el grupo del código cuando la palabra no está: 04 es medida cautelar, 06 falsa tradición, 07/08 cancelación", () => {
    const l = leido(
      leerCtl(
        "ANOTACION: Nro 1\nESPECIFICACION: 0499 OTRA COSA DEL GRUPO\nANOTACION: Nro 2\nESPECIFICACION: 0699 ALGO\nANOTACION: Nro 3\nESPECIFICACION: 0799 ALGO\nANOTACION: Nro 4\nESPECIFICACION: SIN CODIGO NI PALABRA",
        HOY,
      ),
    );
    expect(l.marcas.map((m) => m.tipo)).toEqual([
      "medida_cautelar",
      "falsa_tradicion",
    ]);
    expect(l.cancelacionesSinNumero).toEqual([3]);
    expect(l.noReconocidas.map((n) => [n.anotacion, n.codigo])).toEqual([
      [4, null],
    ]);
  });

  // Casos que la auditoría del S15 probó con un guion y que el lector leía con seguridad de más.
  it("una cancelación PARCIAL no cancela nada: la hipoteca sigue vigente y la anotación se lista como no reconocida", () => {
    const l = leido(
      leerCtl(
        "ANOTACION: Nro 1\nESPECIFICACION: 0204 HIPOTECA ABIERTA SIN LIMITE DE CUANTIA\n" +
          "ANOTACION: Nro 2\nSe cancela anotacion No: 1\nESPECIFICACION: 0844 CANCELACION PARCIAL DE HIPOTECA\n" +
          "NRO TOTAL DE ANOTACIONES: *2*",
        HOY,
      ),
    );
    expect(l.marcas.map((m) => [m.tipo, m.anotacion, m.vigente])).toEqual([
      ["hipoteca", 1, true],
    ]);
    expect(l.noReconocidas.map((n) => n.anotacion)).toEqual([2]);
    expect(l.cancelacionesSinNumero).toEqual([]);
    // La cancelación completa de la misma anotación sí la cancela (el caso de contraste).
    const total = leido(
      leerCtl(
        "ANOTACION: Nro 1\nESPECIFICACION: 0204 HIPOTECA ABIERTA SIN LIMITE DE CUANTIA\n" +
          "ANOTACION: Nro 2\nSe cancela anotacion No: 1\nESPECIFICACION: 0843 CANCELACION POR VOLUNTAD DE LAS PARTES HIPOTECA\n" +
          "NRO TOTAL DE ANOTACIONES: *2*",
        HOY,
      ),
    );
    expect(
      total.marcas.map((m) => [m.tipo, m.vigente, m.canceladaPor]),
    ).toEqual([["hipoteca", false, 2]]);
    expect(total.noReconocidas).toEqual([]);
  });

  it("un embargo «con acción real hipotecaria» (grupo 04) es un embargo, no una hipoteca; una hipoteca del grupo 02 sigue siéndolo", () => {
    const l = leido(
      leerCtl(
        "ANOTACION: Nro 1\nESPECIFICACION: 0429 EMBARGO EJECUTIVO CON ACCION REAL HIPOTECARIA\n" +
          "ANOTACION: Nro 2\nESPECIFICACION: 0412 DEMANDA EN PROCESO HIPOTECARIO\n" +
          "ANOTACION: Nro 3\nESPECIFICACION: 0204 HIPOTECA ABIERTA SIN LIMITE DE CUANTIA\n" +
          "NRO TOTAL DE ANOTACIONES: *3*",
        HOY,
      ),
    );
    expect(l.marcas.map((m) => [m.anotacion, m.tipo])).toEqual([
      [1, "embargo"],
      [2, "medida_cautelar"],
      [3, "hipoteca"],
    ]);
  });

  it("«inembargable» no es un embargo; una fecha imposible queda en null", () => {
    const l = leido(
      leerCtl(
        "ANOTACION: Nro 1 Fecha: 31-02-2020\nESPECIFICACION: 0315 PATRIMONIO DE FAMILIA INEMBARGABLE",
        HOY,
      ),
    );
    expect(l.marcas).toEqual([
      {
        tipo: "patrimonio_familia",
        anotacion: 1,
        fecha: null,
        codigo: "0315",
        codigoFueraDeCatalogo: false,
        vigente: true,
        canceladaPor: null,
      },
    ]);
  });

  it("el texto después del total de anotaciones o de las salvedades no se lee", () => {
    const l = leido(
      leerCtl(
        "ANOTACION: Nro 1\nESPECIFICACION: 0125 COMPRAVENTA\nNRO TOTAL DE ANOTACIONES: *1*\nANOTACION: Nro 9\nESPECIFICACION: 0204 HIPOTECA",
        HOY,
      ),
    );
    expect(l.anotaciones).toBe(1);
    expect(l.marcas).toEqual([]);
  });

  it("la fecha de expedición: «Impreso el …» o «Fecha de expedición: …»; un mes que no existe no cuenta", () => {
    expect(fechaDeExpedicion("Impreso el 3 de Enero de 2026 a las 9:00")).toBe(
      "2026-01-03",
    );
    expect(fechaDeExpedicion("FECHA DE EXPEDICION: 15-10-2026")).toBe(
      "2026-10-15",
    );
    expect(fechaDeExpedicion("Impreso el 3 de Brumario de 2026")).toBeNull();
    expect(fechaDeExpedicion("sin fecha")).toBeNull();
  });
});

describe("¿está completo el texto? (S16)", () => {
  const anotacion = (n: number) =>
    `ANOTACION: Nro ${n} Fecha: 01-02-2020\nESPECIFICACION: 0125 COMPRAVENTA`;
  const cierre = (total: number) => `NRO TOTAL DE ANOTACIONES: *${total}*`;

  it("cuadra con el total impreso y la numeración: completo", () => {
    const l = leido(leerCtl([1, 2, 3].map(anotacion).join("\n") + "\n" + cierre(3), HOY));
    expect(l.completitud).toEqual({ estado: "si", total: 3, faltan: [] });
  });

  it("le falta una anotación (la del medio o la última): incompleto, y dice cuáles", () => {
    const sinMedio = leido(leerCtl([1, 3].map(anotacion).join("\n") + "\n" + cierre(3), HOY));
    expect(sinMedio.completitud).toEqual({ estado: "no", total: 3, faltan: [2] });
    const sinUltima = leido(leerCtl([1, 2].map(anotacion).join("\n") + "\n" + cierre(3), HOY));
    expect(sinUltima.completitud).toEqual({ estado: "no", total: 3, faltan: [3] });
  });

  it("sin el total impreso: si la numeración salta es incompleto; si no, no se puede comprobar", () => {
    expect(leido(leerCtl([1, 3].map(anotacion).join("\n"), HOY)).completitud).toEqual({
      estado: "no",
      total: null,
      faltan: [2],
    });
    expect(leido(leerCtl([1, 2].map(anotacion).join("\n"), HOY)).completitud).toEqual({
      estado: "sin_total",
      total: null,
      faltan: [],
    });
  });
});

describe("sin código decide la palabra, y como palabra (S16)", () => {
  const marcaDe = (especificacion: string) => {
    const l = leido(leerCtl(`ANOTACION: Nro 1 Fecha: 01-02-2020\nESPECIFICACION: ${especificacion}`, HOY));
    return [l.marcas.map((m) => [m.tipo, m.codigo]), l.noReconocidas.length];
  };
  it("«hipotecada», «hipotecarse» o «hipotecaria» no son una hipoteca; «hipoteca» sí", () => {
    expect(marcaDe("ADJUDICACION DE LA COSA HIPOTECADA")).toEqual([[], 0]);
    expect(marcaDe("HIPOTECA ABIERTA SIN LIMITE DE CUANTIA")).toEqual([[["hipoteca", null]], 0]);
    expect(marcaDe("EMBARGO EJECUTIVO CON ACCION REAL HIPOTECARIA")).toEqual([[["embargo", null]], 0]);
  });
  it("con código manda el grupo: un 04 con «hipotecaria» es un embargo y un 02 sin «hipoteca» es otro gravamen", () => {
    expect(marcaDe("MEDIDA CAUTELAR: 0429 EMBARGO EJECUTIVO CON ACCION REAL HIPOTECARIA")).toEqual([
      [["embargo", "0429"]],
      0,
    ]);
    expect(marcaDe("GRAVAMEN: 0212 VALORIZACION")).toEqual([[["gravamen", "0212"]], 0]);
  });
  it("sin código: «prohibición de transferencia» es su marca y una cancelación parcial no se entiende; un 05 es limitación, fuera del catálogo", () => {
    expect(marcaDe("PROHIBICION DE TRANSFERENCIA")).toEqual([[["prohibicion_transferencia", null]], 0]);
    expect(marcaDe("CANCELACION PARCIAL HIPOTECA")).toEqual([[], 1]);
    expect(marcaDe("LIMITACION AL DOMINIO: 0501 ACTO DEL GRUPO CINCO")).toEqual([[["limitacion_dominio", "0501"]], 0]);
    const l = leido(leerCtl("ANOTACION: Nro 1 Fecha: 01-02-2020\nESPECIFICACION: 0501 ACTO DEL GRUPO CINCO", HOY));
    expect(l.marcas[0].codigoFueraDeCatalogo).toBe(true);
  });
  it("sin código, cada palabra con su marca; una cancelación completa no marca nada y una anotación sin especificación no se entiende", () => {
    expect(marcaDe("CANCELACION HIPOTECA")).toEqual([[], 0]);
    expect(marcaDe("COMPRAVENTA DERECHOS Y ACCIONES")).toEqual([[["falsa_tradicion", null]], 0]);
    expect(marcaDe("AFECTACION A VIVIENDA FAMILIAR")).toEqual([[["vivienda_familiar", null]], 0]);
    expect(marcaDe("CONSTITUCION PATRIMONIO DE FAMILIA")).toEqual([[["patrimonio_familia", null]], 0]);
    expect(marcaDe("DEMANDA EN PROCESO DE PERTENENCIA")).toEqual([[["medida_cautelar", null]], 0]);
    const sinEspecificacion = leido(leerCtl("ANOTACION: Nro 1 Fecha: 01-02-2020\nDE: PERSONA A", HOY));
    expect(sinEspecificacion.noReconocidas).toEqual([{ anotacion: 1, codigo: null, especificacion: "" }]);
  });
});
