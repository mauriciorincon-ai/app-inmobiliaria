// Lo que la interfaz necesita de «¿Está caro?» sin hacer cuentas (S10, ADR 018): la escala de la barra, las cifras en
// «millones» y el reparto de los anuncios de «Comparar» en grupos de comparables. Puro: la UI solo pinta.
import { enMillones } from "@/engine/format/presupuesto";
import { formatearCOP } from "@/engine/format/cop";
import type { Operacion, TipoInmueble } from "@/engine/registro/schema";
import type { Idioma } from "@/i18n/idiomas";
import {
  rangoDePrecio,
  type Comparable,
  type FuentePrecio,
  type RangoPrecio,
} from "./comparables";

/** Un rango CON datos (no el «sin datos suficientes»). */
export type RangoConDatos = Exclude<RangoPrecio, { estado: "sin_datos" }>;

const MILLON = 1_000_000;

/**
 * «$9,7 M» (es) / «COP 9.7M» (en) para el precio por m² de venta. Un arriendo por m² (decenas de miles de pesos) no
 * cabe en millones: ahí se escribe completo.
 */
export function montoCorto(pesos: number, idioma: Idioma): string {
  if (pesos < MILLON) return formatearCOP(pesos, idioma);
  const m = enMillones(pesos, idioma);
  return idioma === "es" ? `$${m} M` : `COP ${m}M`;
}

export type EscalaBarra = {
  /** Los extremos de la escala, en pesos por m². */
  desde: number;
  hasta: number;
  /** Posiciones en % del ancho (0–100): la banda P25–P75 y la marca de «Este». */
  izquierdaBanda: number;
  anchoBanda: number;
  marca: number;
};

function porcentaje(valor: number, desde: number, span: number): number {
  const p = ((valor - desde) / span) * 100;
  return Math.round(Math.min(100, Math.max(0, p)) * 10) / 10;
}

/** La barra de la maqueta 09: un riel con la banda del rango y la marca del anuncio, con aire a los lados. */
export function escalaBarra(r: RangoConDatos): EscalaBarra {
  const bajo = Math.min(r.minM2, r.precioM2, r.p25M2);
  const alto = Math.max(r.maxM2, r.precioM2, r.p75M2);
  const margen = Math.max((alto - bajo) * 0.08, 1);
  const desde = Math.max(0, Math.floor(bajo - margen));
  const hasta = Math.ceil(alto + margen);
  const span = hasta - desde;
  const izquierdaBanda = porcentaje(r.p25M2, desde, span);
  return {
    desde,
    hasta,
    izquierdaBanda,
    anchoBanda:
      Math.round((porcentaje(r.p75M2, desde, span) - izquierdaBanda) * 10) / 10,
    marca: porcentaje(r.precioM2, desde, span),
  };
}

// ── Comparar: un grupo de comparables por (operación, tipo, localidad) ──────────────────────────────────────────────

export type GrupoComparables = {
  operacion: Operacion;
  tipo: TipoInmueble;
  localidad: string;
};

/** Lo que se necesita de un anuncio guardado para evaluarlo (la misma lista blanca de `/buscar`). */
export type AnuncioPorEvaluar = {
  slug: string;
  operacion: Operacion;
  tipo: TipoInmueble;
  localidad: string | null;
  sector_codigo: string | null;
  area_m2: number;
  precio_esperado: number;
};

export function claveGrupo(g: GrupoComparables): string {
  return `${g.operacion}|${g.tipo}|${g.localidad}`;
}

/** El grupo de un anuncio, o null si no tiene localidad (la base no devuelve comparables sin ella). */
export function grupoDe(a: AnuncioPorEvaluar): GrupoComparables | null {
  return a.localidad
    ? { operacion: a.operacion, tipo: a.tipo, localidad: a.localidad }
    : null;
}

/** Los grupos distintos de una lista de anuncios, para pedir los comparables una sola vez por grupo. */
export function gruposDe(
  anuncios: readonly AnuncioPorEvaluar[],
): GrupoComparables[] {
  const vistos = new Map<string, GrupoComparables>();
  for (const a of anuncios) {
    const g = grupoDe(a);
    if (g && !vistos.has(claveGrupo(g))) vistos.set(claveGrupo(g), g);
  }
  return [...vistos.values()];
}

/** El rango de cada anuncio contra los comparables de SU grupo (sin grupo o sin comparables: «sin datos»). */
export function evaluarAnuncios(
  anuncios: readonly AnuncioPorEvaluar[],
  comparablesPorGrupo: ReadonlyMap<string, readonly Comparable[]>,
  fuente: FuentePrecio,
): Map<string, RangoPrecio> {
  const salida = new Map<string, RangoPrecio>();
  for (const a of anuncios) {
    const g = grupoDe(a);
    const comparables = g ? (comparablesPorGrupo.get(claveGrupo(g)) ?? []) : [];
    salida.set(a.slug, rangoDePrecio(a, comparables, fuente));
  }
  return salida;
}
