// «Lo que puedes pagar», guardado SOLO en el teléfono (S10, ADR 018), como los favoritos sin cuenta. Puro: leer y
// serializar el valor de `localStorage`. Los ingresos viven aquí y en ningún otro sitio; lo único que viaja es el precio
// máximo (`max=` de `/buscar` o de una alerta), que no los revela.
//
// La validación es a mano y no con zod: la ficha pública carga una isla que lee esto, y zod le sumaba ~48 KB de script a
// una página que no lo necesita (el presupuesto de script no sube).
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

const esNumero = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/** Solo las cuatro cifras de `Capacidad`, dentro de sus rangos; lo demás (claves de más, tipos distintos) no pasa. */
function validar(valor: unknown): Capacidad | null {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
    return null;
  }
  const { ingresos, inicial, plazoAnos, tasaEA } = valor as Record<
    string,
    unknown
  >;
  if (!esNumero(ingresos) || ingresos <= 0) return null;
  if (!esNumero(inicial) || inicial < 0 || inicial >= 1) return null;
  if (
    !esNumero(plazoAnos) ||
    !Number.isInteger(plazoAnos) ||
    plazoAnos < PLAZO_MIN_ANOS ||
    plazoAnos > PLAZO_MAX_ANOS
  ) {
    return null;
  }
  if (tasaEA !== null && (!esNumero(tasaEA) || tasaEA <= 0 || tasaEA > 60)) {
    return null;
  }
  return { ingresos, inicial, plazoAnos, tasaEA };
}

export function leerCapacidad(texto: string | null): Capacidad | null {
  if (!texto) return null;
  try {
    return validar(JSON.parse(texto));
  } catch {
    return null;
  }
}

/** El texto que se guarda. Lanza si la capacidad no es válida: jamás se guarda algo que no se podría volver a leer. */
export function serializarCapacidad(c: Capacidad): string {
  const valida = validar(c);
  if (!valida) throw new Error("capacidad_invalida");
  return JSON.stringify(valida);
}
