// «¿Te alcanza con subsidio?» para UN hogar (S13, F2). Puro y sin zod: lo llama el servidor con los tres hogares de
// ejemplo de la maqueta y la isla del teléfono con lo que el comprador guardó en «lo que puedes pagar» (`inn:capacidad:v1`).
// Es el MISMO motor en los dos lados; el ingreso del comprador nunca sale del teléfono: aquí no hay ninguna petición.
//
// De los ingresos a «lo que puedes pagar» (`precioMaximo`, S10) y, por proyecto, a los programas (`subsidiosPara`) y al
// mejor caso (`mejorCaso`, S11): el MAYOR subsidio de compra que aplica o está por confirmar. Jamás se suman dos programas;
// lo `no_verificado` ni siquiera entra a `subsidiosPara`; un programa `sin_cupos` se dice y no suma.
import { precioMaximo } from "../simulador/cuota.ts";
import {
  mejorCaso,
  subsidiosPara,
  type Programa,
  type ResultadoPrograma,
} from "./subsidio.ts";
import type { ProyectoUnico, Region } from "./lectura.ts";

/** Los hogares de ejemplo de la maqueta aprobada (pantalla 04): ingresos al mes, con la misma cuota inicial y el mismo plazo. */
export const HOGARES_EJEMPLO = [4_000_000, 6_000_000, 8_000_000] as const;
export const INICIAL_EJEMPLO = 0.3;
export const PLAZO_EJEMPLO = 20;

/** Lo que el motor necesita de un proyecto: datos públicos de la edición, ya con su precio verdadero y su tope VIS. */
export type ProyectoSubsidio = {
  slug: string;
  nombre: ProyectoUnico["nombre"];
  segmento: ProyectoUnico["segmento"];
  precio_desde: number;
  region: Region;
  /** El tope VIS de este año en la ciudad del proyecto (de las tarifas, nunca escrito a mano). */
  topeVis: number;
  /** «Pagas al menos» (`precioVerdadero`): lo que se compara con lo que puedes pagar. */
  alMenos: number;
};

export type ProyectoEnHogar = {
  slug: string;
  resultados: Pick<ResultadoPrograma, "id" | "estado" | "motivos">[];
  mejor: { id: string; monto: number } | null;
  cabeSinSubsidio: boolean;
  /** Cabe restando el mejor caso, que queda «por confirmar»: nunca la suma de dos programas. */
  cabeConSubsidio: boolean;
};

export type HogarTeAlcanza = {
  ingresos: number;
  inicial: number;
  plazoAnos: number;
  tasaEA: number;
  /** Lo que puede pagar ese hogar; `null` si falta algo (el simulador no inventa). */
  tope: number | null;
  /** De cuántos proyectos (con precio, de Bogotá y la Sabana). */
  total: number;
  porProyecto: ProyectoEnHogar[];
  /** Los que caben sin subsidio. */
  sinSubsidio: number;
  /** Los que caben con el mejor caso (incluye los que ya cabían sin él). */
  conSubsidio: number;
};

export function teAlcanza(
  hogar: {
    ingresos: number;
    inicial: number;
    plazoAnos: number;
    tasaEA: number;
  },
  proyectos: readonly ProyectoSubsidio[],
  programas: readonly Programa[],
): HogarTeAlcanza {
  const tope = precioMaximo(
    hogar.ingresos,
    hogar.inicial,
    hogar.plazoAnos,
    hogar.tasaEA,
  );
  const porProyecto = proyectos.map((p): ProyectoEnHogar => {
    const resultados = subsidiosPara(
      hogar.ingresos,
      { segmento: p.segmento, precio_desde: p.precio_desde, region: p.region },
      programas,
      p.topeVis,
    );
    const mejor = mejorCaso(resultados);
    return {
      slug: p.slug,
      resultados: resultados.map(({ id, estado, motivos }) => ({
        id,
        estado,
        motivos,
      })),
      mejor,
      cabeSinSubsidio: tope !== null && p.alMenos <= tope,
      cabeConSubsidio: tope !== null && p.alMenos - (mejor?.monto ?? 0) <= tope,
    };
  });
  return {
    ...hogar,
    tope,
    total: proyectos.length,
    porProyecto,
    sinSubsidio: porProyecto.filter((x) => x.cabeSinSubsidio).length,
    conSubsidio: porProyecto.filter((x) => x.cabeConSubsidio).length,
  };
}
