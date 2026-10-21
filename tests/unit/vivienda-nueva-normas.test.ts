// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SubsidiosSchema,
  TarifasSchema,
} from "../../src/engine/vivienda-nueva/normas";

// Las normas y las tarifas del S11: cada fila con su norma, su año, la fecha en que se consultó y su estado, y cada cifra en
// pesos atada a su cifra en salarios. Lo «no verificado» jamás trae una cifra. Sin enlaces ni datos personales.

const RAIZ = join(__dirname, "..", "..");
const leer = (f: string) => readFileSync(join(RAIZ, "src/data", f), "utf8");
const subsidiosCrudo = leer("subsidios-vivienda.json");
const tarifasCrudo = leer("tarifas-escrituracion.json");
const subsidios = SubsidiosSchema.parse(JSON.parse(subsidiosCrudo));
const tarifas = TarifasSchema.parse(JSON.parse(tarifasCrudo));

describe("subsidios-vivienda.json", () => {
  it("cumple el esquema estricto y trae programas con norma, año, consulta y estado", () => {
    for (const p of subsidios.programas) {
      expect(p.normas.length, p.id).toBeGreaterThan(0);
      expect(p.anio, p.id).toBe(2026);
      expect(p.consultado, p.id).toBe("2026-10-20");
    }
  });

  it("las cifras en pesos son las de salarios por el salario mínimo de 2026", () => {
    const smmlv = subsidios.salario_minimo_2026;
    for (const p of subsidios.programas) {
      const { maximo_smmlv, minimo_smmlv, pesos_2026 } = p.monto;
      expect(pesos_2026.maximo, p.id).toBe(Math.round(maximo_smmlv * smmlv));
      if (minimo_smmlv !== null) {
        expect(pesos_2026.minimo, p.id).toBe(Math.round(minimo_smmlv * smmlv));
      }
      if (p.ingreso_maximo_smmlv !== null) {
        expect(p.ingreso_maximo_pesos_2026, p.id).toBe(
          Math.round(p.ingreso_maximo_smmlv * smmlv),
        );
      }
    }
  });

  it("el salario mínimo coincide con el de las tarifas", () => {
    expect(subsidios.salario_minimo_2026).toBe(tarifas.unidades.smmlv.valor);
  });

  it("ningún programa sin cupos o suspendido se presenta como vigente, y los no verificados no traen cifras", () => {
    expect(
      subsidios.programas.find((p) => p.id === "reduce_tu_cuota")?.estado,
    ).toBe("sin_cupos");
    expect(
      subsidios.programas.find(
        (p) => p.id === "subsidio_vivienda_nueva_nacional",
      )?.estado,
    ).toBe("sin_cupos");
    for (const n of subsidios.no_verificados) {
      expect(Object.keys(n).sort(), n.id).toEqual([
        "consultado",
        "estado",
        "id",
        "motivo",
        "nombre",
      ]);
    }
    const idsVerificados = subsidios.programas.map((p) => p.id);
    for (const n of subsidios.no_verificados)
      expect(idsVerificados).not.toContain(n.id);
  });

  it("el programa de arriendo no es de compra", () => {
    expect(
      subsidios.programas.find((p) => p.id === "ahorro_para_mi_casa")?.destino,
    ).toBe("arriendo");
  });
});

describe("tarifas-escrituracion.json", () => {
  it("cada concepto trae norma (o dice por qué no), año, consulta y estado", () => {
    for (const c of tarifas.conceptos) {
      expect(c.anio, c.id).toBe(2026);
      expect(c.consultado, c.id).toBe("2026-10-20");
      if (c.estado === "no_verificado") expect(c.norma, c.id).toBeNull();
      else expect(c.norma, c.id).toEqual(expect.stringContaining("de 2026"));
    }
    expect(
      tarifas.conceptos.find((c) => c.id === "impuesto_registro_y_beneficencia")
        ?.estado,
    ).toBe("no_verificado");
  });

  it("los tramos de registro están en UVB y en pesos de manera consistente y crecen", () => {
    const reg = tarifas.conceptos.find(
      (c) => c.id === "derechos_registro",
    ) as unknown as {
      actos_con_cuantia: {
        tramos_uvb: {
          hasta_uvb?: number;
          por_mil?: number;
          tarifa_fija?: number;
        }[];
      };
    };
    const tramos = reg.actos_con_cuantia.tramos_uvb;
    const topes = tramos
      .map((t) => t.hasta_uvb)
      .filter((x): x is number => x !== undefined);
    expect([...topes].sort((a, b) => a - b)).toEqual(topes);
    const porMil = tramos
      .map((t) => t.por_mil)
      .filter((x): x is number => x !== undefined);
    expect([...porMil].sort((a, b) => a - b)).toEqual(porMil);
    // Los tramos impresos en pesos en la resolución, contra UVB × valor de la UVB.
    const uvb = tarifas.unidades.uvb.valor;
    expect(Math.round(topes[0] * uvb)).toBe(12_852_101);
    expect(Math.round(topes[1] * uvb)).toBe(192_778_606);
    expect(Math.round(topes[2] * uvb)).toBe(334_149_656);
    expect(Math.round(topes[3] * uvb)).toBe(494_798_857);
  });

  it("el tope de VIS en pesos de 2026 es el de salarios por el salario mínimo", () => {
    expect(
      Math.round(tarifas.topes_vis.smmlv * tarifas.unidades.smmlv.valor),
    ).toBe(236_372_175);
    expect(
      Math.round(
        tarifas.topes_vis.smmlv_aglomeraciones * tarifas.unidades.smmlv.valor,
      ),
    ).toBe(262_635_750);
    expect(tarifas.topes_vis.municipios_aglomeracion_bogota).toContain(
      "Bogotá",
    );
  });

  it("los textos bilingües no repiten el español en el inglés", () => {
    for (const c of tarifas.conceptos) {
      expect(c.nombre.es, c.id).not.toBe(c.nombre.en);
    }
    expect(tarifas.descripcion.es).not.toBe(tarifas.descripcion.en);
    for (const p of subsidios.programas) {
      expect(p.nota.es, p.id).not.toBe(p.nota.en);
      expect(p.monto.regla.es, p.id).not.toBe(p.monto.regla.en);
    }
  });
});

describe("los dos archivos no llevan enlaces ni datos personales", () => {
  it.each([
    ["subsidios", subsidiosCrudo],
    ["tarifas", tarifasCrudo],
  ])("%s", (_n, texto) => {
    expect(texto).not.toMatch(/https?:|www\.|\.gov\.co|\.com\b|@/i);
    expect(texto).not.toMatch(/\b3\d{9}\b/);
  });
});
