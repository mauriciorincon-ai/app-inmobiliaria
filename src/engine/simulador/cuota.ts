// Simulador de cuota y capacidad (S10, maqueta 10, ADR 018). Puro. «Un cálculo, no una aprobación»: no es una oferta de
// crédito. Cuota fija en pesos (sistema francés) desde la tasa efectiva anual; capacidad con el tope de la norma.
//
// Las normas, verificadas en la fuente primaria (2026-10-19):
//   · Decreto 1077 de 2015, art. 2.1.11.1, literal b, modificado por el Decreto 583 de 2025 (28-may-2025, D.O. 53.132):
//     «La primera cuota del crédito no podrá representar más del cuarenta por ciento (40 %) de los ingresos
//     familiares». Vale para VIS y no VIS. (El 30 % del Decreto 145 de 2000 está DEROGADO: Decreto 257 de 2021, art. 2.)
//   · El mismo artículo, literal a: «Podrá financiarse hasta el setenta por ciento (70 %) del valor del inmueble»; para
//     vivienda de interés social, hasta el 80 % (aquí solo como nota: el simulador no decide si un inmueble es VIS).
//   · Ley 546 de 1999, art. 17, num. 3 (mod. Ley 2079 de 2021): plazo mínimo de 5 años.

export const TOPE_CUOTA_INGRESO = 0.4;
export const FINANCIABLE_MAX = 0.7;
export const FINANCIABLE_VIS = 0.8;
export const PLAZO_MIN_ANOS = 5;
export const PLAZO_MAX_ANOS = 30;

/** Tasa mensual equivalente a una efectiva anual dada EN PORCENTAJE (15,48 → 0,01207). */
export function tasaMensual(efectivaAnualPct: number): number {
  return Math.pow(1 + efectivaAnualPct / 100, 1 / 12) - 1;
}

/** Cuota fija mensual de un crédito (sistema francés). Con tasa 0, capital entre meses. */
export function cuotaFija(
  credito: number,
  mensual: number,
  meses: number,
): number {
  if (mensual === 0) return credito / meses;
  const f = Math.pow(1 + mensual, meses);
  return (credito * mensual * f) / (f - 1);
}

/** El crédito que paga una cuota dada (la inversa de `cuotaFija`). */
export function creditoParaCuota(
  cuota: number,
  mensual: number,
  meses: number,
): number {
  if (mensual === 0) return cuota * meses;
  const f = Math.pow(1 + mensual, meses);
  return (cuota * (f - 1)) / (mensual * f);
}

export type EntradaSimulador = {
  precio: number;
  /** Cuota inicial como fracción del precio (0,3 = 30 %). */
  inicial: number;
  plazoAnos: number;
  /** Efectiva anual en porcentaje, o null si no hay tasa (ni de referencia ni escrita). */
  tasaEA: number | null;
  /** Ingresos del hogar al mes, o null si no los escribió. Jamás salen del teléfono. */
  ingresos: number | null;
};

export type EstadoSimulador =
  "cabe" | "no_cabe" | "sin_ingresos" | "sin_tasa" | "invalido";

export type ResultadoSimulador =
  | { estado: "sin_tasa" | "invalido" }
  | {
      estado: "cabe" | "no_cabe" | "sin_ingresos";
      cuota: number;
      cuotaInicial: number;
      credito: number;
      totalPagado: number;
      /** Ingresos con los que la cuota queda justo en el 40 %. */
      ingresoNecesario: number;
      /** La cuota sobre los ingresos, en % (null sin ingresos). */
      porcentajeIngreso: number | null;
      /** El crédito pasa del 70 % que permite la norma (la cuota inicial es menor al 30 %). */
      excedeFinanciable: boolean;
    };

function entradaValida(e: EntradaSimulador): boolean {
  return (
    Number.isFinite(e.precio) &&
    e.precio > 0 &&
    Number.isFinite(e.inicial) &&
    e.inicial >= 0 &&
    e.inicial < 1 &&
    Number.isInteger(e.plazoAnos) &&
    e.plazoAnos >= PLAZO_MIN_ANOS &&
    e.plazoAnos <= PLAZO_MAX_ANOS &&
    (e.ingresos === null || (Number.isFinite(e.ingresos) && e.ingresos > 0))
  );
}

function tasaValida(t: number | null): t is number {
  return t !== null && Number.isFinite(t) && t > 0 && t <= 60;
}

export function simular(e: EntradaSimulador): ResultadoSimulador {
  if (!entradaValida(e)) return { estado: "invalido" };
  if (!tasaValida(e.tasaEA)) return { estado: "sin_tasa" };
  const meses = e.plazoAnos * 12;
  const cuotaInicial = Math.round(e.precio * e.inicial);
  const credito = e.precio - cuotaInicial;
  const cuotaExacta = cuotaFija(credito, tasaMensual(e.tasaEA), meses);
  const cuota = Math.round(cuotaExacta);
  const ingresoNecesario = Math.round(cuotaExacta / TOPE_CUOTA_INGRESO);
  const base = {
    cuota,
    cuotaInicial,
    credito,
    totalPagado: Math.round(cuotaExacta * meses),
    ingresoNecesario,
    excedeFinanciable: credito > FINANCIABLE_MAX * e.precio + 0.5,
  };
  if (e.ingresos === null) {
    return { estado: "sin_ingresos", ...base, porcentajeIngreso: null };
  }
  const porcentajeIngreso = Math.round((cuotaExacta / e.ingresos) * 1000) / 10;
  return {
    estado: cuotaExacta <= e.ingresos * TOPE_CUOTA_INGRESO ? "cabe" : "no_cabe",
    ...base,
    porcentajeIngreso,
  };
}

/**
 * Lo más caro que se puede comprar con esos ingresos, esa cuota inicial, ese plazo y esa tasa: la cuota llega justo al
 * 40 % de los ingresos y el crédito no pasa del 70 % del precio. Es el único número que sale del teléfono (como `max=`
 * de `/buscar` o de una alerta): un precio, nunca los ingresos. Null si falta algo.
 */
export function precioMaximo(
  ingresos: number | null,
  inicial: number,
  plazoAnos: number,
  tasaEA: number | null,
): number | null {
  if (
    ingresos === null ||
    !Number.isFinite(ingresos) ||
    ingresos <= 0 ||
    !tasaValida(tasaEA) ||
    !Number.isFinite(inicial) ||
    inicial < 0 ||
    inicial >= 1 ||
    !Number.isInteger(plazoAnos) ||
    plazoAnos < PLAZO_MIN_ANOS ||
    plazoAnos > PLAZO_MAX_ANOS
  ) {
    return null;
  }
  const credito = creditoParaCuota(
    ingresos * TOPE_CUOTA_INGRESO,
    tasaMensual(tasaEA),
    plazoAnos * 12,
  );
  const financiado = Math.min(1 - inicial, FINANCIABLE_MAX);
  return Math.floor(credito / financiado);
}
