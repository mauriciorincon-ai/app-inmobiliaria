// @vitest-environment node
import { describe, expect, it } from "vitest";
import escrituracion from "@/data/tarifas-escrituracion.json";
import papeleo from "@/data/tarifas-papeleo.json";
import {
  ENTRADA_INICIAL,
  gastos,
  type TarifasPapeleo,
} from "@/engine/papeleo/gastos";
import type { TarifasEscrituracion } from "@/engine/vivienda-nueva/escrituracion";
import { rellenar } from "@/i18n/textos";
import { PAPELEO } from "@/textos/papeleo";

// S14 — matriz de envejecimiento (regla 23). Las tarifas del papeleo son de UN año: UVB, salario mínimo y resoluciones cambian cada enero.
// La fecha en que algo cambia sale de los DATOS (el año de vigencia de los dos archivos), no de un número escrito aquí; la pantalla se
// "construye" en cada fecha de la matriz con la fecha como PARÁMETRO (jamás el reloj) y se afirma qué ve la persona:
//   consulta → cifras · último día de la vigencia → cifras · primer día del año siguiente → ninguna cifra, con el motivo.
const esc = escrituracion as unknown as TarifasEscrituracion & {
  vigencia: number;
};
const pap = papeleo as unknown as TarifasPapeleo;
const entrada = { ...ENTRADA_INICIAL, precio: 450_000_000 };

const VIGENCIA = Math.min(esc.vigencia, pap.vigencia);
const CONSULTA = pap.consultado;
const ULTIMO_DIA = `${VIGENCIA}-12-31`;
const PRIMER_DIA_VENCIDO = `${VIGENCIA + 1}-01-01`;

describe("la matriz de fechas sale de los datos", () => {
  it("los dos archivos de tarifas comparten el año y la fecha de consulta cae dentro de él", () => {
    expect(esc.vigencia).toBe(pap.vigencia);
    expect(CONSULTA.startsWith(`${VIGENCIA}-`)).toBe(true);
    expect(CONSULTA <= ULTIMO_DIA).toBe(true);
  });

  it("en la fecha de consulta y en el último día de la vigencia, la pantalla muestra cifras del año de la tarifa", () => {
    for (const hoy of [CONSULTA, ULTIMO_DIA]) {
      const r = gastos(entrada, esc, pap, hoy);
      expect(r.estado, hoy).toBe("calculado");
      if (r.estado !== "calculado") continue;
      expect(r.lineas.length).toBeGreaterThan(0);
      for (const l of r.lineas) {
        expect(l.anio, `${hoy} ${l.id}`).toBe(VIGENCIA);
        expect(l.consultado, `${hoy} ${l.id}`).toBe(CONSULTA);
      }
    }
  });

  it("el primer día del año siguiente no hay ninguna cifra, y la pantalla dice de qué año son las tarifas y en cuál se está", () => {
    const r = gastos(entrada, esc, pap, PRIMER_DIA_VENCIDO);
    expect(r).toEqual({
      estado: "vencidas",
      anioTarifas: VIGENCIA,
      anioHoy: VIGENCIA + 1,
    });
    // Nada de líneas ni totales que se pudieran pintar.
    expect(Object.keys(r).sort()).toEqual(["anioHoy", "anioTarifas", "estado"]);
    for (const idioma of ["es", "en"] as const) {
      const texto = rellenar(PAPELEO.salidas.vencidas[idioma], {
        anioTarifas: VIGENCIA,
        anioHoy: VIGENCIA + 1,
      });
      expect(texto).toContain(String(VIGENCIA));
      expect(texto).toContain(String(VIGENCIA + 1));
      expect(texto).not.toMatch(/[{}]/);
    }
  });

  it("después de la vigencia sigue vencido, años más tarde también", () => {
    for (const hoy of [`${VIGENCIA + 1}-06-15`, `${VIGENCIA + 5}-01-01`]) {
      expect(gastos(entrada, esc, pap, hoy).estado, hoy).toBe("vencidas");
    }
  });

  it("sin precio, la fecha no cambia lo que se ve: se pide el precio (también vencido el año siguiente, pues no hay cifra que mostrar)", () => {
    const sinPrecio = { ...ENTRADA_INICIAL, precio: null };
    expect(gastos(sinPrecio, esc, pap, CONSULTA).estado).toBe("sin_precio");
  });
});

describe("DEMO EN ROJO: una tabla que nadie renovó se ve", () => {
  it("con las tarifas de un año anterior, la fecha de consulta de hoy ya muestra «vencidas»", () => {
    const vieja = { ...pap, vigencia: VIGENCIA - 1 };
    const r = gastos(entrada, esc, vieja, CONSULTA);
    expect(r.estado).toBe("vencidas");
    const viejaEsc = { ...esc, vigencia: VIGENCIA - 1 };
    expect(gastos(entrada, viejaEsc, pap, CONSULTA).estado).toBe("vencidas");
  });
});
