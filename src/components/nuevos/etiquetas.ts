// Ayudantes de presentación de vivienda nueva (S12): nombres de los identificadores que devuelven los motores, con la
// lengua ya elegida. Sin frases: todo texto sale de `src/textos/vivienda-nueva.ts`.
import { localeIntl, type Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import type { EntregaPartes, EsperaMeses } from "@/engine/vivienda-nueva/vista";
import type { VIVIENDA_NUEVA } from "@/textos/vivienda-nueva";

export type TextosNuevos = Proyectado<typeof VIVIENDA_NUEVA>;

/** «No lo dice» e «ilegible»: el aviso no dio el dato. */
export function esVacio(v: unknown): boolean {
  return v === "no_lo_dice" || v === "ilegible";
}

/** El nombre de un identificador en su diccionario; uno desconocido se muestra tal cual (jamás se oculta). */
export function etiqueta(mapa: Record<string, string>, clave: string): string {
  return mapa[clave] ?? clave;
}

const formateadoresMes: Record<Idioma, Intl.DateTimeFormat> = {
  es: new Intl.DateTimeFormat(localeIntl("es"), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }),
  en: new Intl.DateTimeFormat(localeIntl("en"), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }),
};

/** «diciembre de 2028» · «December 2028» — el mes de una entrega. */
export function mesYAnio(anio: number, mes: number, lang: Idioma): string {
  return formateadoresMes[lang].format(new Date(Date.UTC(anio, mes - 1, 1)));
}

/** Cómo se dice la entrega: el mes exacto, «hasta» un mes o «durante» un año. */
export function textoEntrega(
  p: EntregaPartes,
  t: TextosNuevos["ficha"]["espera"],
  lang: Idioma,
): string {
  if (p.forma === "anio") return rellenar(t.cuandoAnio, { anio: p.anio });
  const mes = mesYAnio(p.anio, p.mes, lang);
  return p.forma === "hasta" ? rellenar(t.cuandoHasta, { mes }) : mes;
}

const formateadoresNumero: Record<Idioma, Intl.NumberFormat> = {
  es: new Intl.NumberFormat(localeIntl("es"), { maximumFractionDigits: 2 }),
  en: new Intl.NumberFormat(localeIntl("en"), { maximumFractionDigits: 2 }),
};

/** Un número con la coma o el punto de su idioma: 35,18 (es) · 35.18 (en). */
export function numero(n: number, lang: Idioma): string {
  return formateadoresNumero[lang].format(n);
}

/** La espera en una línea (la lista de «¿Nuevo o usado?»): los meses, o por qué no se cuentan. Jamás un número inventado. */
export function esperaCorta(
  e: EsperaMeses,
  t: TextosNuevos["nuevoOUsado"]["caben"]["espera"],
): string {
  switch (e.estado) {
    case "inmediata":
      return t.inmediata;
    case "sin_fecha":
      return t.sinFecha;
    case "en_conflicto":
      return t.enConflicto;
    case "calculada":
      if (e.vencida) return t.vencida;
      return e.meses === 1 ? t.mesesUno : rellenar(t.meses, { meses: e.meses });
  }
}
