// Cupos fundadores por zona — C7. El operador fija `cupo_total` por zona desde el panel; el
// contador público = cupo_total − publicados reales. REGLA DURA (dominio 4 + G-Visión): si el
// operador NO fijó cupo (`cupo_total` nulo) la zona NO muestra contador — **escasez REAL o no
// existe**. Cero números fabricados, cero "quedan 3" decorativos. Módulo puro; la fuente es la BD.

// ¿Se muestra el contador de esta zona? Solo si el operador fijó un cupo positivo.
export function mostrarContador(cupoTotal: number | null | undefined): boolean {
  return (
    typeof cupoTotal === "number" && Number.isFinite(cupoTotal) && cupoTotal > 0
  );
}

// Cupos restantes = cupo_total − publicados (nunca negativo). `null` si no hay cupo fijado (⇒ no se
// muestra contador). El llamador distingue null (ocultar) de 0 (agotado).
export function cuposRestantes(
  cupoTotal: number | null | undefined,
  publicados: number,
): number | null {
  if (!mostrarContador(cupoTotal)) return null;
  const rest = (cupoTotal as number) - Math.max(0, publicados ?? 0);
  return rest > 0 ? rest : 0;
}

// ¿Se agotaron los cupos de la zona? (cupo fijado y 0 restantes). false si no hay cupo fijado.
export function agotado(
  cupoTotal: number | null | undefined,
  publicados: number,
): boolean {
  return cuposRestantes(cupoTotal, publicados) === 0;
}

// Estado honesto del contador de una zona. `null` si NO se debe mostrar (sin cupo fijado). La frase
// la compone la UI en el idioma de la persona (`src/textos/landing.ts`); el motor solo dice qué pasa.
export type EstadoCupos =
  | { tipo: "completos" }
  | { tipo: "uno" }
  | { tipo: "varios"; restantes: number };

export function estadoCupos(
  cupoTotal: number | null | undefined,
  publicados: number,
): EstadoCupos | null {
  const rest = cuposRestantes(cupoTotal, publicados);
  if (rest === null) return null;
  if (rest === 0) return { tipo: "completos" };
  return rest === 1 ? { tipo: "uno" } : { tipo: "varios", restantes: rest };
}
