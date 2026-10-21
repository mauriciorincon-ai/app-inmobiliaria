// La ficha honesta de un proyecto (S11, F2). Puro. Separa, campo por campo, el dato que se puede verificar, el dato que
// el aviso no dice (o no se alcanza a leer) y el mensaje de venta. Nombra lo que falta; no acusa a nadie.
import type { Proyecto, Rotulo } from "./edicion.ts";
import { ILEGIBLE, NO_LO_DICE } from "./edicion.ts";

export const CAMPOS_FICHA = [
  "precio_desde",
  "area_privada_desde",
  "area_construida_desde",
  "segmento",
  "etapa",
  "entrega",
  "parqueadero",
  "precio_fijo",
  "subsidio_anunciado",
] as const satisfies readonly (keyof Proyecto)[];

export type CampoFicha = (typeof CAMPOS_FICHA)[number];
export type ClaseDato = "verificable" | "no_lo_dice" | "ilegible";

export type FichaHonesta = {
  datos: { campo: CampoFicha; clase: ClaseDato }[];
  verificables: number;
  faltan: number;
  /** Mensajes de venta de la lista cerrada; «otro» se cuenta aparte y su texto no se guarda. */
  mensajes: Exclude<Rotulo, "otro">[];
  otrosMensajes: number;
};

export function fichaHonesta(
  p: Pick<Proyecto, CampoFicha | "rotulos">,
): FichaHonesta {
  const datos = CAMPOS_FICHA.map((campo) => {
    const v = p[campo];
    const clase: ClaseDato =
      v === NO_LO_DICE
        ? "no_lo_dice"
        : v === ILEGIBLE
          ? "ilegible"
          : "verificable";
    return { campo, clase };
  });
  const verificables = datos.filter((d) => d.clase === "verificable").length;
  return {
    datos,
    verificables,
    faltan: datos.length - verificables,
    mensajes: p.rotulos.filter(
      (r): r is Exclude<Rotulo, "otro"> => r !== "otro",
    ),
    otrosMensajes: p.rotulos.filter((r) => r === "otro").length,
  };
}
