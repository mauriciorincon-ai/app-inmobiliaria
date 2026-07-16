// Formato y parseo de pesos colombianos (COP). Sin decimales: los precios de vivienda se escriben
// en pesos enteros. El formato de miles usa punto (es-CO): $420.000.000.

const formateador = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/** Formatea un entero de pesos a `$420.000.000`. Valores no finitos → cadena vacía. */
export function formatearCOP(valor: number): string {
  if (!Number.isFinite(valor)) return "";
  // Intl mete un espacio no separable tras el $; lo normalizamos a "$420.000.000".
  return formateador.format(Math.round(valor)).replace(/\s/g, "");
}

/**
 * Convierte lo que el usuario escribe ("420.000.000", "420000000", "$ 420.000.000") a un entero
 * de pesos. Devuelve `null` si no hay dígitos. No valida rango (eso es del esquema zod).
 */
export function parsearCOP(texto: string): number | null {
  if (typeof texto !== "string") return null;
  const digitos = texto.replace(/\D/g, "");
  if (digitos.length === 0) return null;
  const n = Number(digitos);
  return Number.isSafeInteger(n) ? n : null;
}
