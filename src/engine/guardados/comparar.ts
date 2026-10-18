// Comparar hasta 4 anuncios guardados (S9, maqueta 07). Puro: la selección y los valores de cada fila
// (precio, área, precio por m², habitaciones, sello y «vivo hace»). Los textos los pone la interfaz. La fila
// «¿Está caro?» de la maqueta no está aquí: llega con su propio sprint (S10–S11).
import { estadoSello, type EstadoSello } from "@/engine/sello/sello";
import { diasVivo } from "@/engine/vigencia/vigencia";

export const TOPE_COMPARAR = 4;

/** Marca o desmarca un anuncio. Un quinto no entra: `tope` avisa para decirlo en pantalla. */
export function alternarSeleccion(
  seleccion: readonly string[],
  slug: string,
): { seleccion: string[]; tope: boolean } {
  if (seleccion.includes(slug)) {
    return { seleccion: seleccion.filter((s) => s !== slug), tope: false };
  }
  if (seleccion.length >= TOPE_COMPARAR) {
    return { seleccion: [...seleccion], tope: true };
  }
  return { seleccion: [...seleccion, slug], tope: false };
}

export function puedeComparar(seleccion: readonly string[]): boolean {
  return seleccion.length >= 2;
}

export type AnuncioComparable = {
  slug: string;
  barrio: string;
  precio_esperado: number;
  area_m2: number;
  habitaciones: number;
  nivel_verificacion: "fundador" | "verificado";
  ctl_expedido_el: string | null;
  vigente_hasta: string;
};

export type ColumnaComparar = {
  slug: string;
  barrio: string;
  precio: number;
  area: number;
  precioPorM2: number | null;
  habitaciones: number;
  sello: EstadoSello;
  vivoDias: number | null;
};

/** Pesos por metro cuadrado, redondeado; null si el área no sirve para dividir. */
export function precioPorM2(precio: number, area: number): number | null {
  if (!Number.isFinite(precio) || !Number.isFinite(area) || area <= 0) {
    return null;
  }
  return Math.round(precio / area);
}

/** Una columna por anuncio, en el orden de la selección (los que ya no están se omiten). */
export function columnasComparar(
  anuncios: readonly AnuncioComparable[],
  seleccion: readonly string[],
  ahora: Date = new Date(),
): ColumnaComparar[] {
  const porSlug = new Map(anuncios.map((a) => [a.slug, a]));
  return seleccion
    .slice(0, TOPE_COMPARAR)
    .flatMap((slug) => {
      const a = porSlug.get(slug);
      return a ? [a] : [];
    })
    .map((a) => ({
      slug: a.slug,
      barrio: a.barrio,
      precio: a.precio_esperado,
      area: a.area_m2,
      precioPorM2: precioPorM2(a.precio_esperado, a.area_m2),
      habitaciones: a.habitaciones,
      sello: estadoSello(a.nivel_verificacion, a.ctl_expedido_el),
      vivoDias: diasVivo(a.vigente_hasta, ahora),
    }));
}
