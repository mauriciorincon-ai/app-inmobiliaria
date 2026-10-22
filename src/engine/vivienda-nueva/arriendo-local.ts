// «Tu arriendo» de la espera, guardado SOLO en el teléfono (S12, como `capacidad-local` del S10). Puro: leer y serializar el
// valor de `localStorage`. El arriendo vive aquí y en ningún otro sitio: el servidor da los MESES de espera y el teléfono los
// multiplica; ninguna petición lleva el arriendo ni el total. Validación a mano (sin zod: la ficha pública carga esta isla y
// zod le sumaría ~48 KB de script a una página que no lo necesita).
import { parsearCOP, esEnteroEscrito } from "../format/cop.ts";

export const CLAVE_ARRIENDO = "inn:arriendo:v1";

/** Un arriendo mensual plausible en Bogotá: de $100.000 a $50.000.000. */
export const ARRIENDO_MIN = 100_000;
export const ARRIENDO_MAX = 50_000_000;

export type ArriendoGuardado = { arriendo: number };

const esArriendo = (v: unknown): v is number =>
  typeof v === "number" &&
  Number.isInteger(v) &&
  v >= ARRIENDO_MIN &&
  v <= ARRIENDO_MAX;

/** Lo guardado (texto) → el arriendo, o `null` si falta o no es válido (claves de más, otro tipo, fuera de rango). */
export function leerArriendo(texto: string | null): number | null {
  if (!texto) return null;
  try {
    const v: unknown = JSON.parse(texto);
    if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
    const claves = Object.keys(v);
    if (claves.length !== 1 || claves[0] !== "arriendo") return null;
    const { arriendo } = v as Record<string, unknown>;
    return esArriendo(arriendo) ? arriendo : null;
  } catch {
    return null;
  }
}

/** El texto que se guarda. Lanza si no es válido: jamás se guarda algo que no se podría volver a leer. */
export function serializarArriendo(arriendo: number): string {
  if (!esArriendo(arriendo)) throw new Error("arriendo_invalido");
  return JSON.stringify({ arriendo } satisfies ArriendoGuardado);
}

/** Lo que escribió la persona → el arriendo en pesos, o `null` si no es un entero dentro del rango. */
export function arriendoEscrito(texto: string): number | null {
  if (!esEnteroEscrito(texto)) return null;
  const n = parsearCOP(texto);
  return esArriendo(n) ? n : null;
}

/** La espera en pesos: meses × arriendo. Es lo único que el teléfono calcula; jamás sale de él. */
export function totalEspera(meses: number, arriendo: number): number {
  return Math.round(Math.max(0, meses) * Math.max(0, arriendo));
}
