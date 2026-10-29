// Escrituración estimada de una vivienda nueva (S11, F2). Puro: recibe las tarifas de
// `src/data/tarifas-escrituracion.json` como dato y SOLO usa los conceptos `vigente`; lo no verificado no se calcula.
//   · Derechos de registro (Resolución 2026-001726-6 de la SNR): la tarifa del tramo de la cuantía en UVB se aplica a
//     TODA la cuantía; VIS a la mitad (art. 17) hasta su tope; VIP exenta con subsidio (art. 23); +2 % de
//     sistematización (parágrafo 8). Se paga a cargo del solicitante: el comprador que registra.
//   · Derechos notariales de la compraventa (Resolución 2026-000964-6): tarifa fija hasta $259.300 y 3 por mil sobre lo que
//     exceda (art. 2 lit. b); VIS a la mitad (art. 31). Quién paga qué parte se pacta en la promesa.
// Todo se aproxima a la centena, como lo liquidan la notaría y la oficina de registro.
import { normalizarClave } from "./clave.ts";

export type TramoRegistro = {
  hasta_uvb?: number;
  por_mil?: number;
  tarifa_fija?: number;
};

type Concepto = { id: string; estado: string };

export type ConceptoRegistro = Concepto & {
  actos_con_cuantia: { tramos_uvb: TramoRegistro[] };
  recargo_sistematizacion: number;
  vis: { factor: number };
  vip: { exento: boolean };
};

export type ConceptoNotarial = Concepto & {
  actos_con_cuantia: {
    hasta_pesos: number;
    tarifa_fija: number;
    sobre_exceso_por_mil: number;
  };
  vis: { factor: number };
  /** `verificado: false` ⇒ la exención no se leyó en la norma notarial: no se calcula ni se afirma. */
  vip: { exento: boolean; verificado?: boolean };
};

export type TarifasEscrituracion = {
  unidades: { uvb: { valor: number }; smmlv: { valor: number } };
  topes_vis: {
    smmlv: number;
    smmlv_aglomeraciones: number;
    /** S15: el tope de la VIP, igual en todo el país (Ley 1955 de 2019, art. 85). */
    smmlv_vip: number;
    municipios_aglomeracion_bogota: readonly string[];
    /** Ciudades principales de las otras aglomeraciones con tope de 150 salarios (Medellín, Cali, Barranquilla…). */
    otras_aglomeraciones: readonly string[];
  };
  conceptos: readonly Concepto[];
  /** El año de las tarifas (S16: pasado ese año, ninguna cifra se muestra como si fuera de hoy). */
  vigencia?: number;
};

/**
 * Las tarifas tal como valen a `hoy` (S16; deuda del S12/S14, «en su año»): pasado el año de su vigencia, cada concepto queda
 * «no verificado», así que el precio verdadero NOMBRA el registro y la notaría sin monto en vez de cobrar las del año anterior.
 * La fecha es parámetro (regla 23), nunca el reloj.
 */
export function tarifasDelAnio(
  t: TarifasEscrituracion,
  hoy: string,
): TarifasEscrituracion {
  if (t.vigencia === undefined || Number(hoy.slice(0, 4)) <= t.vigencia) {
    return t;
  }
  return {
    ...t,
    conceptos: t.conceptos.map((c) => ({ ...c, estado: "no_verificado" })),
  };
}

/** Cómo liquida la norma: tarifa ordinaria, la mitad de VIS o la exención de VIP. */
export type ClaseVivienda = "general" | "vis" | "vip";

function vigente<T extends Concepto>(
  t: TarifasEscrituracion,
  id: string,
): T | null {
  const c = t.conceptos.find((x) => x.id === id);
  return c && c.estado === "vigente" ? (c as T) : null;
}

const aCentena = (n: number) => Math.round(n / 100) * 100;

/**
 * El tope de precio de la VIS en pesos de este año: 150 salarios en las aglomeraciones urbanas del decreto (Bogotá y sus
 * municipios; la ciudad principal de Medellín, Cali, Barranquilla, Cartagena, Bucaramanga y Cúcuta) y 135 en el resto.
 */
export function topeVis(ciudad: string, t: TarifasEscrituracion): number {
  const clave = normalizarClave(ciudad);
  const enAglomeracion = [
    ...t.topes_vis.municipios_aglomeracion_bogota,
    ...t.topes_vis.otras_aglomeraciones,
  ].some((m) => normalizarClave(m) === clave);
  const salarios = enAglomeracion
    ? t.topes_vis.smmlv_aglomeraciones
    : t.topes_vis.smmlv;
  return Math.round(salarios * t.unidades.smmlv.valor);
}

/** El tope de la VIP en pesos (S15): el mismo en todo el país (Ley 1955 de 2019, art. 85). */
export function topeVip(t: TarifasEscrituracion): number {
  return Math.round(t.topes_vis.smmlv_vip * t.unidades.smmlv.valor);
}

/** Derechos de registro de la compraventa, o `null` si la tarifa no está vigente en el archivo. */
export function derechosRegistro(
  valor: number,
  clase: ClaseVivienda,
  t: TarifasEscrituracion,
): number | null {
  const c = vigente<ConceptoRegistro>(t, "derechos_registro");
  if (!c) return null;
  if (clase === "vip" && c.vip.exento) return 0;
  const enUvb = valor / t.unidades.uvb.valor;
  const tramos = c.actos_con_cuantia.tramos_uvb;
  const tramo =
    tramos.find((x) => x.hasta_uvb !== undefined && enUvb <= x.hasta_uvb) ??
    tramos[tramos.length - 1];
  let base =
    tramo.tarifa_fija !== undefined
      ? tramo.tarifa_fija
      : (valor * (tramo.por_mil ?? 0)) / 1000;
  if (clase === "vis") base *= c.vis.factor;
  return aCentena(base * (1 + c.recargo_sistematizacion));
}

/**
 * Derechos notariales de la compraventa (sin IVA ni hojas: no verificados), o `null` si no están vigentes o si el caso no
 * está verificado en la norma notarial (hoy, la VIP: su exención viene de otra norma que la resolución notarial no se releyó).
 */
export function derechosNotariales(
  valor: number,
  clase: ClaseVivienda,
  t: TarifasEscrituracion,
): number | null {
  const c = vigente<ConceptoNotarial>(t, "derechos_notariales");
  if (!c) return null;
  if (clase === "vip") {
    if (c.vip.verificado === false) return null;
    if (c.vip.exento) return 0;
  }
  const a = c.actos_con_cuantia;
  let base =
    valor <= a.hasta_pesos
      ? a.tarifa_fija
      : a.tarifa_fija +
        ((valor - a.hasta_pesos) * a.sobre_exceso_por_mil) / 1000;
  if (clase === "vis") base *= c.vis.factor;
  return aCentena(base);
}
