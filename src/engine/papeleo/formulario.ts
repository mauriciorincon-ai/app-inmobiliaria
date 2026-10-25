// El formulario del papeleo (S14) sin la pantalla: lo que viaja en la URL (`?precio=&ciudad=&tipo=…`) → la entrada de `gastos`, y de
// vuelta. Puro y sin zod (corre en el teléfono). Lo que llega de la URL no es confiable: un valor que no se entiende cae en el de
// por omisión y jamás lanza. En el enlace solo van el precio y datos del inmueble, nunca nada de la persona.
import { esEnteroEscrito, parsearCOP } from "../format/cop.ts";
import {
  ENTRADA_INICIAL,
  REPARTOS,
  TIPOS_VIVIENDA,
  type EntradaGastos,
  type OpcionCiudad,
  type QuienVende,
  type TipoVivienda,
} from "./gastos.ts";

/** Igual a `PRECIO_MAX` de `engine/busqueda/filtros.ts` (que trae zod); una prueba los ata. */
export const PRECIO_MAX_PAPELEO = 900_000_000_000;

export type ParamsUrl = Record<string, string | string[] | undefined>;

const primero = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

/** Un entero de pesos razonable o nada. */
export function leerDinero(texto: string | undefined): number | null {
  if (!texto || !esEnteroEscrito(texto)) return null;
  const n = parsearCOP(texto);
  return n !== null && n > 0 && n <= PRECIO_MAX_PAPELEO ? n : null;
}

/** La entrada de `gastos` que describe la URL. */
export function leerEntrada(
  params: ParamsUrl,
  ciudades: readonly OpcionCiudad[],
): EntradaGastos {
  const ciudad = primero(params.ciudad);
  const tipo = primero(params.tipo);
  const vende = primero(params.vende);
  const reparto = primero(params.reparto);
  return {
    precio: leerDinero(primero(params.precio)),
    ciudad: ciudades.some((c) => c.id === ciudad)
      ? (ciudad as string)
      : ENTRADA_INICIAL.ciudad,
    tipo: TIPOS_VIVIENDA.includes(tipo as TipoVivienda)
      ? (tipo as TipoVivienda)
      : ENTRADA_INICIAL.tipo,
    subsidio: primero(params.subsidio) === "1",
    vende: vende === "empresa" ? "empresa" : ENTRADA_INICIAL.vende,
    reparto: REPARTOS.includes(reparto as EntradaGastos["reparto"])
      ? (reparto as EntradaGastos["reparto"])
      : ENTRADA_INICIAL.reparto,
    avaluo: leerDinero(primero(params.avaluo)),
    credito: primero(params.credito) === "1",
  };
}

/** El segmento de un proyecto de vivienda nueva → el tipo de vivienda del papeleo (lo que no se sabe, `normal`). */
export function tipoDeSegmento(
  segmento: string | null | undefined,
): TipoVivienda {
  return segmento === "VIS" ? "vis" : segmento === "VIP" ? "vip" : "normal";
}

export type DatosEnlace = {
  /** El precio del inmueble; si la ficha no lo tiene (un proyecto sin «desde»), el enlace no lo lleva y la persona lo escribe. */
  precio?: number | null;
  ciudad?: string;
  tipo?: TipoVivienda;
  vende?: QuienVende;
};

/** La ficha manda a `/papeleo` con el precio del inmueble (lo que vale por omisión no viaja). */
export function enlacePapeleo(d: DatosEnlace): string {
  const p = new URLSearchParams();
  if (d.precio && d.precio > 0) p.set("precio", String(Math.round(d.precio)));
  if (d.ciudad && d.ciudad !== ENTRADA_INICIAL.ciudad)
    p.set("ciudad", d.ciudad);
  if (d.tipo && d.tipo !== ENTRADA_INICIAL.tipo) p.set("tipo", d.tipo);
  if (d.vende && d.vende !== ENTRADA_INICIAL.vende) p.set("vende", d.vende);
  const consulta = p.toString();
  return consulta ? `/papeleo?${consulta}` : "/papeleo";
}
