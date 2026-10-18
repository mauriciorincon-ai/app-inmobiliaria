// El presupuesto que declara el comprador, en millones de pesos (S8). La tarjeta del dueño lo muestra como
// «$1.000 a $1.200 millones»; aquí solo se decide QUÉ se dice (rango, desde, hasta o nada) y el número ya
// formateado; la frase vive en el diccionario. Los pesos llegan de la base (`bigint`); la persona los escribe
// en millones en el formulario.
import { localeIntl, type Idioma } from "@/i18n/idiomas";

const MILLON = 1_000_000;

export type PresupuestoDicho =
  | { tipo: "ninguno" }
  | { tipo: "desde"; min: string }
  | { tipo: "hasta"; max: string }
  | { tipo: "rango"; min: string; max: string };

/** 1_200_000_000 → «1.200» (es) / «1,200» (en); con un decimal si hace falta: 350_500_000 → «350,5». */
export function enMillones(pesos: number, idioma: Idioma): string {
  return new Intl.NumberFormat(localeIntl(idioma), {
    maximumFractionDigits: 1,
  }).format(pesos / MILLON);
}

export function presupuestoDicho(
  min: number | null,
  max: number | null,
  idioma: Idioma,
): PresupuestoDicho {
  const tieneMin = typeof min === "number" && min > 0;
  const tieneMax = typeof max === "number" && max > 0;
  if (tieneMin && tieneMax) {
    return {
      tipo: "rango",
      min: enMillones(min, idioma),
      max: enMillones(max, idioma),
    };
  }
  if (tieneMin) return { tipo: "desde", min: enMillones(min, idioma) };
  if (tieneMax) return { tipo: "hasta", max: enMillones(max, idioma) };
  return { tipo: "ninguno" };
}

/** Lo que escribió la persona en el formulario (millones, entero o vacío) → pesos, o null si va vacío. */
export function pesosDeMillones(texto: string): number | null | "invalido" {
  const limpio = texto.trim().replace(/[.\s]/g, "").replace(",", ".");
  if (limpio === "") return null;
  if (!/^\d{1,6}(\.\d)?$/.test(limpio)) return "invalido";
  return Math.round(Number(limpio) * MILLON);
}
