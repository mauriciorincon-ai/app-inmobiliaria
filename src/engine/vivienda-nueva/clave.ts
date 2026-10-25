// La comparación de nombres de la vivienda nueva, sin dependencias: `lectura.ts` trae zod y el asistente del papeleo (S14) corre en el
// teléfono, donde zod suma ~48 KB de script. `lectura.ts` la reexporta: quien ya la importaba de ahí no cambia.

/** Minúsculas, sin tildes ni signos, espacios simples. La base de toda comparación de nombres. */
export function normalizarClave(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
