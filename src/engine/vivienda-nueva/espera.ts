// «La espera» (S11, F2). Puro. Mientras el proyecto se construye, el comprador sigue pagando arriendo: meses hasta la
// entrega × el arriendo que él escribe (ese número vive solo en su teléfono). La fecha de hoy es un PARÁMETRO, nunca el
// reloj (regla 23): la maqueta y las pruebas la fijan. Una entrega impresa como semestre o año cuenta hasta su último mes
// y se marca «aproximada»; una fecha que ya pasó no inventa meses.
import type { Proyecto } from "./edicion.ts";

export type Espera =
  | { estado: "inmediata" }
  | { estado: "sin_fecha" }
  | {
      estado: "calculada";
      meses: number;
      total: number;
      aproximada: boolean;
      /** La fecha impresa ya pasó a la fecha de corte: se dice, no se cuenta. */
      vencida: boolean;
    };

/** Meses completos entre un día (AAAA-MM-DD) y el final de un mes (AAAA-MM). Nunca negativo. */
export function mesesHasta(hoy: string, mes: string): number {
  const [ya, ma] = hoy.split("-").map(Number);
  const [yb, mb] = mes.split("-").map(Number);
  return Math.max(0, (yb - ya) * 12 + (mb - ma));
}

export function espera(
  p: Pick<Proyecto, "entrega" | "entrega_precision" | "etapa">,
  hoy: string,
  arriendoMensual: number,
): Espera {
  if (p.entrega === "inmediata" || p.etapa === "entrega_inmediata") {
    return { estado: "inmediata" };
  }
  if (typeof p.entrega !== "string" || !/^\d{4}-\d{2}$/.test(p.entrega)) {
    return { estado: "sin_fecha" };
  }
  const meses = mesesHasta(hoy, p.entrega);
  return {
    estado: "calculada",
    meses,
    total: Math.round(meses * Math.max(0, arriendoMensual)),
    aproximada: p.entrega_precision !== "mes",
    vencida: meses === 0,
  };
}
