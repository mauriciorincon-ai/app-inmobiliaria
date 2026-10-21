// «¿Te alcanza con subsidio?» (S11, F2). Puro. Del ingreso del hogar y del proyecto a los programas de
// `src/data/subsidios-vivienda.json`. Solo cuenta lo verificado: un programa `sin_cupos` se dice pero no suma; lo
// `no_verificado` ni siquiera llega aquí. Lo que el aviso no dice (si es VIS, si está inscrito en el programa) deja el
// resultado «por confirmar», jamás «aplica».
import type { Proyecto } from "./edicion.ts";
import type { Region } from "./lectura.ts";

export type Programa = {
  id: string;
  ambito: "bogota" | "nacional";
  destino: "compra" | "cuota" | "arriendo";
  estado: "vigente" | "sin_cupos" | "suspendido" | "no_verificado";
  ingreso_maximo_pesos_2026: number | null;
  monto: { pesos_2026: { minimo: number | null; maximo: number } };
};

export type MotivoSubsidio =
  | "ingreso"
  | "fuera_de_bogota"
  | "no_vis"
  | "segmento_no_lo_dice"
  | "supera_tope_vis"
  | "proyecto_inscrito"
  | "sin_cupos"
  | "suspendido";

export type ResultadoPrograma = {
  id: string;
  estado: "aplica" | "por_confirmar" | "no_aplica" | "sin_cupos";
  motivos: MotivoSubsidio[];
  minimo: number | null;
  maximo: number;
  /** Solo un subsidio de compra baja el precio al firmar; el de la cuota alivia después. */
  restaAlPrecio: boolean;
};

// Programas que se aplican solo en proyectos o unidades inscritos ante la Secretaría: el aviso no lo dice.
const EXIGEN_PROYECTO_INSCRITO = new Set([
  "oferta_preferente",
  "reactiva_tu_compra",
]);

export function subsidiosPara(
  ingresoMensual: number,
  proyecto: Pick<Proyecto, "segmento" | "precio_desde"> & { region: Region },
  programas: readonly Programa[],
  topeVisPesos: number,
): ResultadoPrograma[] {
  return programas
    .filter((p) => p.destino !== "arriendo" && p.estado !== "no_verificado")
    .map((p) => {
      const base = {
        id: p.id,
        minimo: p.monto.pesos_2026.minimo,
        maximo: p.monto.pesos_2026.maximo,
        restaAlPrecio: p.destino === "compra",
      };
      if (p.estado === "sin_cupos" || p.estado === "suspendido") {
        return { ...base, estado: "sin_cupos" as const, motivos: [p.estado] };
      }
      const fuera: MotivoSubsidio[] = [];
      const dudas: MotivoSubsidio[] = [];
      if (
        p.ingreso_maximo_pesos_2026 !== null &&
        ingresoMensual > p.ingreso_maximo_pesos_2026
      ) {
        fuera.push("ingreso");
      }
      if (p.ambito === "bogota" && proyecto.region !== "bogota") {
        fuera.push("fuera_de_bogota");
      }
      const precio = proyecto.precio_desde;
      const supera = typeof precio === "number" && precio > topeVisPesos;
      if (proyecto.segmento === "No VIS") fuera.push("no_vis");
      else if (proyecto.segmento === "VIS" || proyecto.segmento === "VIP") {
        if (supera) dudas.push("supera_tope_vis");
      } else if (supera) fuera.push("supera_tope_vis");
      else dudas.push("segmento_no_lo_dice");
      if (EXIGEN_PROYECTO_INSCRITO.has(p.id)) dudas.push("proyecto_inscrito");
      if (fuera.length > 0) {
        return { ...base, estado: "no_aplica" as const, motivos: fuera };
      }
      return dudas.length > 0
        ? { ...base, estado: "por_confirmar" as const, motivos: dudas }
        : { ...base, estado: "aplica" as const, motivos: [] };
    });
}

/**
 * El mejor caso honesto: el mayor subsidio de COMPRA que aplica o está por confirmar. No se suman programas entre sí:
 * que se puedan acumular no está verificado.
 */
export function mejorCaso(resultados: readonly ResultadoPrograma[]): {
  id: string;
  monto: number;
} | null {
  const candidatos = resultados.filter(
    (r) =>
      r.restaAlPrecio &&
      (r.estado === "aplica" || r.estado === "por_confirmar"),
  );
  if (candidatos.length === 0) return null;
  const mejor = candidatos.reduce((a, b) => (b.maximo > a.maximo ? b : a));
  return { id: mejor.id, monto: mejor.maximo };
}
