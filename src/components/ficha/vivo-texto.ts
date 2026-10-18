import { rellenar } from "@/i18n/textos";
import type { TextosVivo } from "@/components/ficha/VivoHace";

/** El «vivo hace N días» corto de tarjetas y tablas; null si la fecha no se pudo leer (jamás un número inventado). */
export function textoVivo(n: number | null, t: TextosVivo): string | null {
  if (n === null) return null;
  if (n === 0) return t.cortoHoy;
  if (n === 1) return t.cortoUno;
  return rellenar(t.cortoVarios, { n });
}
