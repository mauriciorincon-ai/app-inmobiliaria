// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PRECIO_MAX } from "../../../src/engine/busqueda/filtros";
import {
  CIUDAD_BOGOTA,
  CIUDAD_OTRA,
  CIUDAD_OTRO_CUNDINAMARCA,
  ENTRADA_INICIAL,
  gastos,
  opcionesCiudad,
  resolverCiudad,
  type EntradaGastos,
  type Gastos,
  type LineaGasto,
  type TarifasPapeleo,
} from "../../../src/engine/papeleo/gastos";
import {
  PRECIO_MAX_PAPELEO,
  enlacePapeleo,
  leerDinero,
  leerEntrada,
  tipoDeSegmento,
} from "../../../src/engine/papeleo/formulario";
import type { TarifasEscrituracion } from "../../../src/engine/vivienda-nueva/escrituracion";
import { PAPELEO } from "../../../src/textos/papeleo";

// S14 — los gastos de escriturar, por actor. Los tres casos de ejemplo se recalculan A MANO de la norma (la aritmética está a la
// vista en cada expectativa: ninguna cifra sale de llamar al propio motor). Datos 100 % sintéticos: solo precios.
const RAIZ = join(__dirname, "..", "..", "..");
const leer = <T>(f: string): T =>
  JSON.parse(readFileSync(join(RAIZ, "src/data", f), "utf8")) as T;
const esc = leer<TarifasEscrituracion & { vigencia: number }>(
  "tarifas-escrituracion.json",
);
const pap = leer<TarifasPapeleo>("tarifas-papeleo.json");
const HOY = "2026-10-25";

const entrada = (c: Partial<EntradaGastos>): EntradaGastos => ({
  ...ENTRADA_INICIAL,
  ...c,
});
function calcular(c: Partial<EntradaGastos>, hoy = HOY) {
  const g = gastos(entrada(c), esc, pap, hoy);
  if (g.estado !== "calculado") throw new Error(`estado ${g.estado}`);
  return g;
}
const linea = (
  g: Extract<Gastos, { estado: "calculado" }>,
  actor: "comprador" | "vendedor",
  id: LineaGasto["id"],
) => g.lineas.find((l) => l.actor === actor && l.id === id);
const valores = (
  g: Extract<Gastos, { estado: "calculado" }>,
  actor: "comprador" | "vendedor",
) =>
  Object.fromEntries(
    g.lineas.filter((l) => l.actor === actor).map((l) => [l.id, l.valor]),
  );

describe("los tres casos de ejemplo, recalculados a mano de la norma", () => {
  it("Bogotá · VIS con subsidio · $200.000.000 (tope VIS de Bogotá: 150 × $1.750.905 = $262.635.750)", () => {
    const g = calcular({ precio: 200_000_000, tipo: "vis", subsidio: true });
    expect(g.topeVis).toBe(262_635_750);
    expect(g.claseNotarial).toBe("vis");
    expect(g.claseRegistro).toBe("vis");
    // Notaría: ($30.900 + 3 por mil de ($200.000.000 − $259.300) = $630.122,10) · ½ por VIS = $315.061,05 → $315.100 · a mitades $157.550.
    // Recaudos (art. 50, de $100.000.001 a $300.000.000): $43.700 · a mitades $21.850.
    // Impuesto de registro: 1 % de $200.000.000 = $2.000.000 · a mitades $1.000.000.
    // Derechos de registro: $200.000.000 / $12.110 = 16.515 UVB (tramo 11,31 por mil) = $2.262.000 · ½ por VIS · +2 % = $1.153.620 → $1.153.600.
    // CTL electrónico: $23.000. Retención: 1 % de $200.000.000 = $2.000.000.
    expect(valores(g, "comprador")).toEqual({
      derechos_notariales: 157_550,
      recaudos_notariales: 21_850,
      iva_notarial: null,
      impuesto_registro: 1_000_000,
      derechos_registro: 1_153_600,
      certificado_tradicion: 23_000,
    });
    expect(valores(g, "vendedor")).toEqual({
      derechos_notariales: 157_550,
      recaudos_notariales: 21_850,
      iva_notarial: null,
      impuesto_registro: 1_000_000,
      retencion_enajenacion: 2_000_000,
    });
    // Comprador: 157.550 + 21.850 + 1.000.000 + 1.153.600 + 23.000 = 2.356.000 (falta el IVA).
    expect(g.totales.comprador).toEqual({ suma: 2_356_000, faltan: 1 });
    // Vendedor: 157.550 + 21.850 + 1.000.000 + 2.000.000 = 3.179.400 (falta el IVA).
    expect(g.totales.vendedor).toEqual({ suma: 3_179_400, faltan: 1 });
  });

  it("Bogotá · vivienda normal · $1.150.000.000 (la cifra de la maqueta)", () => {
    const g = calcular({ precio: 1_150_000_000 });
    // Notaría: $30.900 + 3 por mil de ($1.150.000.000 − $259.300) = $3.480.122,10 → $3.480.100 · a mitades $1.740.050.
    // Recaudos (de $1.000.000.001 a $1.500.000.000): $84.800 · a mitades $42.400.
    // Impuesto de registro: 1 % = $11.500.000 · a mitades $5.750.000.
    // Derechos de registro: 94.963 UVB (tramo 13,33 por mil) = $15.329.500 · +2 % = $15.636.090 → $15.636.100.
    expect(valores(g, "comprador")).toEqual({
      derechos_notariales: 1_740_050,
      recaudos_notariales: 42_400,
      iva_notarial: null,
      impuesto_registro: 5_750_000,
      derechos_registro: 15_636_100,
      certificado_tradicion: 23_000,
    });
    expect(valores(g, "vendedor")).toEqual({
      derechos_notariales: 1_740_050,
      recaudos_notariales: 42_400,
      iva_notarial: null,
      impuesto_registro: 5_750_000,
      retencion_enajenacion: 11_500_000,
    });
    // Comprador: 1.740.050 + 42.400 + 5.750.000 + 15.636.100 + 23.000 = 23.191.550.
    expect(g.totales.comprador).toEqual({ suma: 23_191_550, faltan: 1 });
    // Vendedor: 1.740.050 + 42.400 + 5.750.000 + 11.500.000 = 19.032.450.
    expect(g.totales.vendedor).toEqual({ suma: 19_032_450, faltan: 1 });
  });

  it("Medellín (otra ciudad) · vivienda normal · $400.000.000: el impuesto de registro no se verifica y se nombra sin cifra", () => {
    const g = calcular({ precio: 400_000_000, ciudad: "medellin" });
    // Notaría: $30.900 + 3 por mil de ($400.000.000 − $259.300) = $1.230.122,10 → $1.230.100 · a mitades $615.050.
    // Recaudos (de $300.000.001 a $500.000.000): $52.700 · a mitades $26.350.
    // Derechos de registro: 33.030 UVB (tramo 12,60 por mil) = $5.040.000 · +2 % = $5.140.800. Retención: 1 % = $4.000.000.
    expect(valores(g, "comprador")).toEqual({
      derechos_notariales: 615_050,
      recaudos_notariales: 26_350,
      iva_notarial: null,
      impuesto_registro: null,
      derechos_registro: 5_140_800,
      certificado_tradicion: 23_000,
    });
    expect(valores(g, "vendedor")).toEqual({
      derechos_notariales: 615_050,
      recaudos_notariales: 26_350,
      iva_notarial: null,
      impuesto_registro: null,
      retencion_enajenacion: 4_000_000,
    });
    // Comprador: 615.050 + 26.350 + 5.140.800 + 23.000 = 5.805.200 (faltan el IVA y el impuesto).
    expect(g.totales.comprador).toEqual({ suma: 5_805_200, faltan: 2 });
    // Vendedor: 615.050 + 26.350 + 4.000.000 = 4.641.400.
    expect(g.totales.vendedor).toEqual({ suma: 4_641_400, faltan: 2 });
    expect(g.avisos).toContainEqual({ id: "impuesto_otro_departamento" });
    // La línea sin cifra no cita la ordenanza de otro departamento.
    expect(linea(g, "comprador", "impuesto_registro")).toMatchObject({
      estado: "no_verificado",
      valor: null,
      norma: null,
    });
  });
});

describe("cada línea trae su norma, su año y su fecha de consulta", () => {
  it("lo que tiene cifra cita su norma y lo que no, también (salvo el IVA, que no tiene norma que lo diga)", () => {
    const g = calcular({ precio: 1_150_000_000, credito: true });
    for (const l of g.lineas) {
      expect(l.anio, `${l.actor} ${l.id}`).toBe(2026);
      expect(l.consultado).toBe("2026-10-25");
      if (l.id !== "iva_notarial") {
        expect(l.norma?.es.length ?? 0, l.id).toBeGreaterThan(5);
        expect(l.norma?.en.length ?? 0, l.id).toBeGreaterThan(5);
      } else {
        expect(l.estado).toBe("no_verificado");
        expect(l.valor).toBeNull();
      }
    }
    expect(linea(g, "comprador", "impuesto_registro")?.tarifa).toEqual({
      tipo: "por_mil",
      valor: 10,
    });
    expect(linea(g, "vendedor", "retencion_enajenacion")?.tarifa).toEqual({
      tipo: "porcentaje",
      valor: 1,
    });
    expect(linea(g, "comprador", "hipoteca")).toMatchObject({
      estado: "no_verificado",
      valor: null,
    });
  });

  it("las líneas salen ordenadas: primero el comprador y, en cada actor, el orden de la norma", () => {
    const g = calcular({ precio: 300_000_000, credito: true });
    expect(g.lineas.map((l) => `${l.actor}:${l.id}`)).toEqual([
      "comprador:derechos_notariales",
      "comprador:recaudos_notariales",
      "comprador:iva_notarial",
      "comprador:impuesto_registro",
      "comprador:derechos_registro",
      "comprador:certificado_tradicion",
      "comprador:hipoteca",
      "vendedor:derechos_notariales",
      "vendedor:recaudos_notariales",
      "vendedor:iva_notarial",
      "vendedor:impuesto_registro",
      "vendedor:retencion_enajenacion",
    ]);
  });
});

describe("el reparto y quién paga qué", () => {
  it("lo que pagan los dos suma el total, en los tres repartos (ni un peso se pierde)", () => {
    for (const reparto of ["iguales", "comprador", "vendedor"] as const) {
      const g = calcular({ precio: 333_333_333, reparto });
      for (const id of [
        "derechos_notariales",
        "recaudos_notariales",
        "impuesto_registro",
      ] as const) {
        const c = linea(g, "comprador", id);
        const v = linea(g, "vendedor", id);
        const total = (c ?? v)!.total!;
        expect((c?.valor ?? 0) + (v?.valor ?? 0), `${reparto} ${id}`).toBe(
          total,
        );
      }
    }
    // Un peso impar no se pierde: el impuesto de $3.333.333 se parte en $1.666.667 y $1.666.666.
    const g = calcular({ precio: 333_333_333 });
    expect(linea(g, "comprador", "impuesto_registro")?.valor).toBe(1_666_667);
    expect(linea(g, "vendedor", "impuesto_registro")?.valor).toBe(1_666_666);
  });

  it("si lo asume uno solo, el otro no tiene línea de ese concepto", () => {
    const c = calcular({ precio: 400_000_000, reparto: "comprador" });
    expect(linea(c, "vendedor", "derechos_notariales")).toBeUndefined();
    expect(linea(c, "vendedor", "impuesto_registro")).toBeUndefined();
    expect(linea(c, "comprador", "derechos_notariales")).toMatchObject({
      valor: 1_230_100,
      parte: 1,
    });
    // La retención es del vendedor y los derechos de registro del comprador, sea cual sea el reparto.
    expect(linea(c, "vendedor", "retencion_enajenacion")?.valor).toBe(
      4_000_000,
    );
    const v = calcular({ precio: 400_000_000, reparto: "vendedor" });
    expect(linea(v, "comprador", "derechos_notariales")).toBeUndefined();
    expect(linea(v, "vendedor", "derechos_notariales")?.valor).toBe(1_230_100);
    expect(linea(v, "comprador", "derechos_registro")?.valor).toBe(5_140_800);
  });
});

describe("el avalúo catastral y la clase de vivienda", () => {
  it("si el avalúo es mayor que el precio, notaría, recaudos, registro e impuesto lo usan; la retención no", () => {
    const g = calcular({ precio: 300_000_000, avaluo: 500_000_000 });
    expect(g.base).toBe(500_000_000);
    // Notaría: $30.900 + 3 por mil de ($500.000.000 − $259.300) = $1.530.122,10 → $1.530.100 · mitades $765.050.
    expect(linea(g, "comprador", "derechos_notariales")?.valor).toBe(765_050);
    // Recaudos (hasta $500.000.000): $52.700. Impuesto: 1 % de $500.000.000 = $5.000.000.
    expect(linea(g, "comprador", "recaudos_notariales")?.valor).toBe(26_350);
    expect(linea(g, "comprador", "impuesto_registro")?.valor).toBe(2_500_000);
    // Registro: 41.288 UVB (tramo 13,33 por mil) = $6.665.000 · +2 % = $6.798.300.
    expect(linea(g, "comprador", "derechos_registro")?.valor).toBe(6_798_300);
    // La retención se liquida sobre el valor de la enajenación: el precio.
    expect(linea(g, "vendedor", "retencion_enajenacion")?.valor).toBe(
      3_000_000,
    );
    expect(g.avisos).toContainEqual({
      id: "avaluo_mayor",
      avaluo: 500_000_000,
    });
  });

  it("un avalúo menor, vacío o absurdo no cambia nada", () => {
    for (const avaluo of [100_000_000, null, 0, -5, Number.NaN]) {
      const g = calcular({ precio: 300_000_000, avaluo });
      expect(g.base, String(avaluo)).toBe(300_000_000);
      expect(g.avisos.some((a) => a.id === "avaluo_mayor")).toBe(false);
    }
  });

  it("VIS sin subsidio: la notaría paga la mitad (art. 31) pero el registro es el ordinario (art. 17, parágrafo 2)", () => {
    const g = calcular({ precio: 200_000_000, tipo: "vis", subsidio: false });
    expect(g.claseNotarial).toBe("vis");
    expect(g.claseRegistro).toBe("general");
    expect(linea(g, "comprador", "derechos_notariales")?.valor).toBe(157_550);
    // $2.262.000 · +2 % = $2.307.240 → $2.307.200.
    expect(linea(g, "comprador", "derechos_registro")?.valor).toBe(2_307_200);
    expect(g.avisos).toContainEqual({ id: "vis_sin_subsidio" });
    expect(g.avisos).toContainEqual({ id: "vis_tarifa_unica" });
  });

  it("VIP con subsidio: el registro está exento y los derechos notariales se nombran sin cifra (su exención no se leyó en la norma notarial)", () => {
    const g = calcular({ precio: 90_000_000, tipo: "vip", subsidio: true });
    expect(g.claseRegistro).toBe("vip");
    expect(linea(g, "comprador", "derechos_registro")?.valor).toBe(0);
    for (const actor of ["comprador", "vendedor"] as const) {
      expect(linea(g, actor, "derechos_notariales")).toMatchObject({
        estado: "no_verificado",
        valor: null,
      });
    }
    // Los recaudos se causan también en las escrituras exentas (art. 50): $28.900 hasta $100.000.000.
    expect(linea(g, "comprador", "recaudos_notariales")?.valor).toBe(14_450);
    expect(g.avisos).toContainEqual({ id: "vip_notarial_no_verificado" });
    expect(g.avisos.some((a) => a.id === "hojas_adicionales")).toBe(false);
  });

  it("VIP sin subsidio se liquida como vivienda normal y lo dice", () => {
    const g = calcular({ precio: 90_000_000, tipo: "vip", subsidio: false });
    expect(g.claseNotarial).toBe("general");
    expect(g.claseRegistro).toBe("general");
    expect(g.avisos).toContainEqual({ id: "vip_sin_subsidio" });
  });

  it("por encima del tope VIS del lugar se liquida como normal y se dice el tope (135 salarios fuera de la aglomeración)", () => {
    // Otro municipio de Cundinamarca: 135 × $1.750.905 = $236.372.175.
    const g = calcular({
      precio: 250_000_000,
      tipo: "vis",
      subsidio: true,
      ciudad: CIUDAD_OTRO_CUNDINAMARCA,
    });
    expect(g.topeVis).toBe(236_372_175);
    expect(g.claseNotarial).toBe("general");
    expect(g.claseRegistro).toBe("general");
    expect(g.avisos).toContainEqual({
      id: "supera_tope_vis",
      tope: 236_372_175,
    });
    // En Chía, de la aglomeración de Bogotá, el tope es 150 salarios: el mismo precio sí cabe.
    const chia = calcular({
      precio: 250_000_000,
      tipo: "vis",
      subsidio: true,
      ciudad: "chia",
    });
    expect(chia.topeVis).toBe(262_635_750);
    expect(chia.claseNotarial).toBe("vis");
  });
});

describe("quién vende, el crédito y lo que no hay", () => {
  it("si vende una empresa, la retención se nombra sin cifra y se avisa", () => {
    const g = calcular({ precio: 400_000_000, vende: "empresa" });
    expect(linea(g, "vendedor", "retencion_enajenacion")).toMatchObject({
      estado: "no_verificado",
      valor: null,
    });
    expect(g.avisos).toContainEqual({ id: "vende_empresa" });
  });

  it("sin precio no hay nada que calcular, ni con ceros, negativos o NaN", () => {
    for (const precio of [null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(gastos(entrada({ precio }), esc, pap, HOY)).toEqual({
        estado: "sin_precio",
      });
    }
  });

  it("una ciudad desconocida cae en «otra ciudad»", () => {
    const g = calcular({ precio: 400_000_000, ciudad: "atlantida" });
    expect(linea(g, "comprador", "impuesto_registro")?.valor).toBeNull();
  });
});

describe("las tarifas son de un año (regla 23): la fecha es un parámetro, nunca el reloj", () => {
  it("el último día de 2026 todavía calcula; el primero de 2027 no muestra ninguna cifra", () => {
    expect(
      gastos(entrada({ precio: 300_000_000 }), esc, pap, "2026-12-31").estado,
    ).toBe("calculado");
    expect(
      gastos(entrada({ precio: 300_000_000 }), esc, pap, "2027-01-01"),
    ).toEqual({ estado: "vencidas", anioTarifas: 2026, anioHoy: 2027 });
    expect(
      gastos(entrada({ precio: 300_000_000 }), esc, pap, "2026-02-02").estado,
    ).toBe("calculado");
  });

  it("vale la fecha más antigua de los dos archivos de tarifas, y sin vigencia en el viejo vale la del nuevo", () => {
    const sinVigencia = { ...esc } as Partial<typeof esc>;
    delete sinVigencia.vigencia;
    expect(
      gastos(
        entrada({ precio: 1 }),
        sinVigencia as typeof esc,
        { ...pap, vigencia: 2025 },
        "2026-01-01",
      ),
    ).toMatchObject({ estado: "vencidas", anioTarifas: 2025 });
    expect(
      gastos(entrada({ precio: 1 }), sinVigencia as typeof esc, pap, HOY)
        .estado,
    ).toBe("calculado");
  });
});

describe("un concepto que no está vigente se nombra y no se suma", () => {
  const sin = (id: string): TarifasPapeleo => ({
    ...pap,
    conceptos: pap.conceptos.map((c) =>
      c.id === id ? { ...c, estado: "no_verificado" } : c,
    ),
  });

  it("impuesto de registro, recaudos, CTL y retención", () => {
    const sinImpuesto = gastos(
      entrada({ precio: 400_000_000 }),
      esc,
      sin("impuesto_registro"),
      HOY,
    ) as Extract<Gastos, { estado: "calculado" }>;
    expect(linea(sinImpuesto, "comprador", "impuesto_registro")).toMatchObject({
      estado: "no_verificado",
      valor: null,
    });
    // En Cundinamarca no es «otro departamento»: es una tarifa que no se pudo verificar.
    expect(
      sinImpuesto.avisos.some((a) => a.id === "impuesto_otro_departamento"),
    ).toBe(false);

    const sinRecaudos = gastos(
      entrada({ precio: 400_000_000 }),
      esc,
      sin("recaudos_notariales"),
      HOY,
    ) as Extract<Gastos, { estado: "calculado" }>;
    expect(linea(sinRecaudos, "vendedor", "recaudos_notariales")).toMatchObject(
      { estado: "no_verificado", tarifa: null, norma: null },
    );
    const sinCtl = gastos(
      entrada({ precio: 400_000_000 }),
      esc,
      sin("certificado_tradicion"),
      HOY,
    ) as Extract<Gastos, { estado: "calculado" }>;
    expect(linea(sinCtl, "comprador", "certificado_tradicion")).toMatchObject({
      estado: "no_verificado",
      tarifa: null,
    });
    const sinRetencion = gastos(
      entrada({ precio: 400_000_000 }),
      esc,
      sin("retencion_enajenacion"),
      HOY,
    ) as Extract<Gastos, { estado: "calculado" }>;
    expect(
      linea(sinRetencion, "vendedor", "retencion_enajenacion"),
    ).toMatchObject({ estado: "no_verificado", norma: null });
  });

  it("derechos de registro y notariales del archivo del S12", () => {
    const sinRegistro: TarifasEscrituracion = {
      ...esc,
      conceptos: esc.conceptos.map((c) =>
        c.id === "derechos_registro" ? { ...c, estado: "no_verificado" } : c,
      ),
    };
    const g = gastos(
      entrada({ precio: 400_000_000 }),
      sinRegistro,
      pap,
      HOY,
    ) as Extract<Gastos, { estado: "calculado" }>;
    expect(linea(g, "comprador", "derechos_registro")).toMatchObject({
      estado: "no_verificado",
      valor: null,
    });
    const sinTramoAbierto: TarifasPapeleo = {
      ...pap,
      conceptos: pap.conceptos.map((c) =>
        c.id === "recaudos_notariales"
          ? { ...c, tramos: [{ hasta: 100, valor: 1 }] }
          : c,
      ),
    };
    const h = gastos(
      entrada({ precio: 400_000_000 }),
      esc,
      sinTramoAbierto,
      HOY,
    ) as Extract<Gastos, { estado: "calculado" }>;
    expect(linea(h, "comprador", "recaudos_notariales")).toMatchObject({
      estado: "no_verificado",
      valor: null,
    });
  });

  it("un IVA sin «quién lo cobra» sigue siendo una línea sin cifra", () => {
    const sinCobra: TarifasPapeleo = {
      ...pap,
      conceptos: pap.conceptos.map((c) => {
        if (c.id !== "iva_notarial") return c;
        const copia: Record<string, unknown> = { ...c };
        delete copia.cobra;
        return copia as typeof c;
      }),
    };
    const g = gastos(
      entrada({ precio: 400_000_000 }),
      esc,
      sinCobra,
      HOY,
    ) as Extract<Gastos, { estado: "calculado" }>;
    expect(linea(g, "comprador", "iva_notarial")).toMatchObject({
      estado: "no_verificado",
      cobra: null,
    });
  });

  it("si el IVA ni siquiera está en el archivo, no hay línea (no se inventa)", () => {
    const sinIva: TarifasPapeleo = {
      ...pap,
      conceptos: pap.conceptos.filter((c) => c.id !== "iva_notarial"),
    };
    const g = gastos(
      entrada({ precio: 400_000_000 }),
      esc,
      sinIva,
      HOY,
    ) as Extract<Gastos, { estado: "calculado" }>;
    expect(g.lineas.some((l) => l.id === "iva_notarial")).toBe(false);
  });
});

describe("las ciudades", () => {
  const ops = opcionesCiudad(esc, pap);

  it("salen de las listas del tope VIS, sin repetir y sin nombres alternos", () => {
    const ids = ops.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe(CIUDAD_BOGOTA);
    expect(ids).toContain("chia");
    expect(ids).toContain("la-calera");
    expect(ids).toContain("medellin");
    expect(ids).toContain(CIUDAD_OTRO_CUNDINAMARCA);
    expect(ids.at(-1)).toBe(CIUDAD_OTRA);
    expect(ids).not.toContain("santiago-de-cali");
    expect(ids).not.toContain("cartagena-de-indias");
    // Solo Bogotá y Cundinamarca tienen impuesto de registro verificado.
    expect(ops.filter((o) => o.cundinamarca).length).toBe(
      esc.topes_vis.municipios_aglomeracion_bogota.length + 1,
    );
    expect(ops.find((o) => o.id === "medellin")?.cundinamarca).toBe(false);
    expect(ops.find((o) => o.id === CIUDAD_OTRA)?.cundinamarca).toBe(false);
  });

  it("las dos opciones genéricas no llevan nombre aquí: su rótulo está en el diccionario {es, en}", () => {
    const genericas = ops.filter((o) => o.nombre === null).map((o) => o.id);
    expect(genericas).toEqual([CIUDAD_OTRO_CUNDINAMARCA, CIUDAD_OTRA]);
    for (const id of genericas) {
      const rotulo = PAPELEO.ciudades[id as keyof typeof PAPELEO.ciudades];
      expect(rotulo.es.length).toBeGreaterThan(3);
      expect(rotulo.en.length).toBeGreaterThan(3);
    }
    expect(Object.keys(PAPELEO.ciudades).sort()).toEqual([...genericas].sort());
  });

  it("un texto libre (el de un proyecto o un anuncio) llega a su opción", () => {
    expect(resolverCiudad("Bogotá", false, esc, pap)).toBe("bogota");
    expect(resolverCiudad("  CHÍA ", true, esc, pap)).toBe("chia");
    expect(resolverCiudad("Santiago de Cali", false, esc, pap)).toBe("cali");
    expect(resolverCiudad("Cartagena de Indias", false, esc, pap)).toBe(
      "cartagena",
    );
    expect(resolverCiudad("Girardot", true, esc, pap)).toBe(
      CIUDAD_OTRO_CUNDINAMARCA,
    );
    expect(resolverCiudad("Pereira", false, esc, pap)).toBe(CIUDAD_OTRA);
    expect(resolverCiudad(null, false, esc, pap)).toBe(CIUDAD_OTRA);
  });
});

describe("el formulario: lo que llega de la URL no es confiable", () => {
  const ops = opcionesCiudad(esc, pap);

  it("lee una URL buena", () => {
    expect(
      leerEntrada(
        {
          precio: "420.000.000",
          ciudad: "chia",
          tipo: "vis",
          subsidio: "1",
          vende: "empresa",
          reparto: "comprador",
          avaluo: "450000000",
          credito: "1",
        },
        ops,
      ),
    ).toEqual({
      precio: 420_000_000,
      ciudad: "chia",
      tipo: "vis",
      subsidio: true,
      vende: "empresa",
      reparto: "comprador",
      avaluo: 450_000_000,
      credito: true,
    });
  });

  it("lo que no se entiende cae en el valor por omisión, sin lanzar", () => {
    expect(
      leerEntrada(
        {
          precio: "85.5",
          ciudad: "atlantida",
          tipo: "mansion",
          vende: "dios",
          reparto: "nadie",
          avaluo: "-1",
        },
        ops,
      ),
    ).toEqual(ENTRADA_INICIAL);
    expect(leerEntrada({}, ops)).toEqual(ENTRADA_INICIAL);
    expect(leerEntrada({ precio: ["300000000", "1"] }, ops).precio).toBe(
      300_000_000,
    );
    expect(leerDinero(String(PRECIO_MAX_PAPELEO + 1))).toBeNull();
    expect(leerDinero("0")).toBeNull();
    expect(leerDinero(undefined)).toBeNull();
  });

  it("el enlace solo lleva lo que no vale por omisión", () => {
    expect(enlacePapeleo({ precio: 420_000_000.4 })).toBe(
      "/papeleo?precio=420000000",
    );
    expect(
      enlacePapeleo({
        precio: 200_000_000,
        ciudad: "chia",
        tipo: "vis",
        vende: "empresa",
      }),
    ).toBe("/papeleo?precio=200000000&ciudad=chia&tipo=vis&vende=empresa");
    expect(
      enlacePapeleo({
        precio: 1,
        ciudad: CIUDAD_BOGOTA,
        tipo: "normal",
        vende: "persona",
      }),
    ).toBe("/papeleo?precio=1");
  });

  it("una ficha sin precio manda a la pantalla sin él: lleva la ciudad y el tipo, o nada", () => {
    expect(enlacePapeleo({ precio: null, ciudad: "chia", tipo: "vis" })).toBe(
      "/papeleo?ciudad=chia&tipo=vis",
    );
    expect(enlacePapeleo({ precio: 0 })).toBe("/papeleo");
    expect(enlacePapeleo({})).toBe("/papeleo");
  });

  it("el segmento de un proyecto nuevo da el tipo de vivienda", () => {
    expect(tipoDeSegmento("VIS")).toBe("vis");
    expect(tipoDeSegmento("VIP")).toBe("vip");
    expect(tipoDeSegmento("No VIS")).toBe("normal");
    expect(tipoDeSegmento("no_lo_dice")).toBe("normal");
    expect(tipoDeSegmento(null)).toBe("normal");
  });

  it("el tope de precio es el mismo de la búsqueda (el del formulario no importa zod, así que se copia y se ata aquí)", () => {
    expect(PRECIO_MAX_PAPELEO).toBe(PRECIO_MAX);
  });
});

describe("el asistente corre en el teléfono: ni el motor ni su formulario cargan zod", () => {
  // Se recorren los `import` que quedan en el bundle (los `import type` se borran al compilar).
  function grafo(archivo: string, vistos = new Set<string>()): Set<string> {
    if (vistos.has(archivo)) return vistos;
    vistos.add(archivo);
    const texto = readFileSync(archivo, "utf8");
    for (const m of texto.matchAll(
      /^import\s+(?!type\b)[^;]*?from\s+"([^"]+)";/gm,
    )) {
      const destino = m[1];
      if (destino.startsWith("."))
        grafo(resolve(dirname(archivo), destino), vistos);
      else vistos.add(destino);
    }
    return vistos;
  }
  const rel = (g: Set<string>) =>
    [...g].map((x) => x.replace(RAIZ + "/", "")).sort();

  it("`gastos.ts` y `formulario.ts` solo traen sus vecinos puros", () => {
    const g = new Set<string>();
    grafo(join(RAIZ, "src/engine/papeleo/gastos.ts"), g);
    grafo(join(RAIZ, "src/engine/papeleo/formulario.ts"), g);
    expect([...g].some((x) => x === "zod" || x.startsWith("zod/"))).toBe(false);
    expect(rel(g)).toEqual([
      "@/i18n/idiomas",
      "src/engine/format/cop.ts",
      "src/engine/papeleo/formulario.ts",
      "src/engine/papeleo/gastos.ts",
      "src/engine/vivienda-nueva/clave.ts",
      "src/engine/vivienda-nueva/escrituracion.ts",
    ]);
  });

  it("DEMO EN ROJO: el mismo recorrido sí encuentra zod en `lectura.ts`", () => {
    expect(
      grafo(join(RAIZ, "src/engine/vivienda-nueva/lectura.ts")).has("zod"),
    ).toBe(true);
  });
});
