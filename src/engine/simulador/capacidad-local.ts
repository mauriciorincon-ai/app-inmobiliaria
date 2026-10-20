// «Lo que puedes pagar», guardado SOLO en el teléfono (S10, ADR 018), como los favoritos sin cuenta. Puro: leer y
// serializar el valor de `localStorage`. Los ingresos viven aquí y en ningún otro sitio; lo único que viaja es el precio
// máximo (`max=` de `/buscar` o de una alerta), que no los revela.
import { z } from "zod";
import { PLAZO_MAX_ANOS, PLAZO_MIN_ANOS } from "./cuota";

export const CLAVE_CAPACIDAD = "inn:capacidad:v1";

export type Capacidad = {
  ingresos: number;
  /** Fracción del precio (0,3 = 30 %). */
  inicial: number;
  plazoAnos: number;
  /** La tasa que el comprador escribió, o null para usar la de referencia del día. */
  tasaEA: number | null;
};

const esquema = z.object({
  ingresos: z.number().positive().finite(),
  inicial: z.number().min(0).lt(1),
  plazoAnos: z.number().int().min(PLAZO_MIN_ANOS).max(PLAZO_MAX_ANOS),
  tasaEA: z.number().positive().max(60).nullable(),
});

export function leerCapacidad(texto: string | null): Capacidad | null {
  if (!texto) return null;
  try {
    const r = esquema.safeParse(JSON.parse(texto));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

export function serializarCapacidad(c: Capacidad): string {
  return JSON.stringify(esquema.parse(c));
}
