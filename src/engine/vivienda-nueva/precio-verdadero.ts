// «El precio verdadero» de un proyecto de vivienda nueva (S11, F2). Puro. El aviso dice «desde $X»; aquí se suma lo que
// la norma dice que cuesta escriturar y lo que el aviso cobra aparte, y lo que NO se puede saber se NOMBRA, jamás se
// inventa. Por eso el resultado es una cota inferior: «pagas AL MENOS X», con la lista de lo que falta sumar.
//
//   al menos = precio desde + derechos de registro (a cargo del comprador que registra) + parqueadero aparte con precio
//
// Lo que queda nombrado y sin sumar: los derechos notariales (se reparten según la promesa: se da su total), el impuesto
// de registro y la beneficencia y el IVA notarial (no verificados), el parqueadero sin precio, lo que puede subir durante
// la obra si el precio no es fijo, la hipoteca si compras con crédito y, en VIP, que la exención exige subsidio.
//
// El m² es «aproximado»: el precio «desde» y el área «desde» no siempre son de la misma unidad.
import type { Proyecto } from "./edicion.ts";
import {
  derechosNotariales,
  derechosRegistro,
  topeVis,
  type ClaseVivienda,
  type TarifasEscrituracion,
} from "./escrituracion.ts";

export type EntradaPrecio = Pick<
  Proyecto,
  | "precio_desde"
  | "segmento"
  | "ciudad"
  | "area_privada_desde"
  | "area_construida_desde"
  | "parqueadero"
  | "parqueadero_precio"
  | "precio_fijo"
  | "etapa"
>;

export type Partida = {
  id: "precio_desde" | "derechos_registro" | "parqueadero";
  monto: number;
};

export type IdFaltante =
  | "derechos_notariales"
  | "impuesto_registro"
  | "iva_notarial"
  | "parqueadero_sin_precio"
  | "parqueadero_no_lo_dice"
  | "subidas_en_obra"
  | "hipoteca"
  | "segmento_no_lo_dice"
  | "exencion_vip_con_subsidio"
  | "supera_tope_vis";

export type Faltante = { id: IdFaltante; monto?: number };

export type M2Aproximado =
  | { base: "privada" | "construida"; valor: number; area: number }
  | { base: null };

export type PrecioVerdadero =
  | { estado: "sin_precio"; m2: M2Aproximado }
  | {
      estado: "calculado";
      desde: number;
      alMenos: number;
      clase: ClaseVivienda;
      partidas: Partida[];
      faltantes: Faltante[];
      m2: M2Aproximado;
    };

/** El m² aproximado: sobre el área privada si el aviso la da; si no, sobre la construida (incluye muros y ductos). */
export function m2Aproximado(p: EntradaPrecio): M2Aproximado {
  if (typeof p.precio_desde !== "number") return { base: null };
  if (typeof p.area_privada_desde === "number") {
    return {
      base: "privada",
      area: p.area_privada_desde,
      valor: Math.round(p.precio_desde / p.area_privada_desde),
    };
  }
  if (typeof p.area_construida_desde === "number") {
    return {
      base: "construida",
      area: p.area_construida_desde,
      valor: Math.round(p.precio_desde / p.area_construida_desde),
    };
  }
  return { base: null };
}

/**
 * La clase con que liquidan notaría y registro. Para una cota INFERIOR, un proyecto que no dice su segmento y cabe en el
 * tope de VIS se liquida como VIS (lo más barato posible) y se nombra; un «VIS» por encima del tope de este año se
 * liquida como general y también se nombra.
 */
function claseDe(
  p: EntradaPrecio,
  tope: number,
  precio: number,
): { clase: ClaseVivienda; faltantes: Faltante[] } {
  const cabe = precio <= tope;
  if (p.segmento === "VIP") {
    return {
      clase: "vip",
      faltantes: [{ id: "exencion_vip_con_subsidio" }],
    };
  }
  if (p.segmento === "VIS") {
    return cabe
      ? { clase: "vis", faltantes: [] }
      : { clase: "general", faltantes: [{ id: "supera_tope_vis" }] };
  }
  if (
    cabe &&
    (p.segmento === "no_lo_dice" ||
      p.segmento === "ilegible" ||
      p.segmento === "mixto")
  ) {
    return { clase: "vis", faltantes: [{ id: "segmento_no_lo_dice" }] };
  }
  return { clase: "general", faltantes: [] };
}

export function precioVerdadero(
  p: EntradaPrecio,
  tarifas: TarifasEscrituracion,
): PrecioVerdadero {
  const m2 = m2Aproximado(p);
  if (typeof p.precio_desde !== "number") return { estado: "sin_precio", m2 };
  const desde = p.precio_desde;
  const ciudad = typeof p.ciudad === "string" ? p.ciudad : "";
  const tope = topeVis(ciudad, tarifas);
  const { clase, faltantes: porClase } = claseDe(p, tope, desde);

  const partidas: Partida[] = [{ id: "precio_desde", monto: desde }];
  const faltantes: Faltante[] = [...porClase];

  const registro = derechosRegistro(desde, clase, tarifas);
  if (registro !== null && registro > 0) {
    partidas.push({ id: "derechos_registro", monto: registro });
  }

  if (p.parqueadero === "adicional") {
    if (typeof p.parqueadero_precio === "number") {
      partidas.push({ id: "parqueadero", monto: p.parqueadero_precio });
    } else {
      faltantes.push({ id: "parqueadero_sin_precio" });
    }
  } else if (p.parqueadero === "hay_sin_precio") {
    faltantes.push({ id: "parqueadero_sin_precio" });
  } else if (p.parqueadero !== "incluido") {
    faltantes.push({ id: "parqueadero_no_lo_dice" });
  }

  const notariales = derechosNotariales(desde, clase, tarifas);
  if (notariales !== null) {
    faltantes.push({ id: "derechos_notariales", monto: notariales });
  }
  faltantes.push({ id: "impuesto_registro" }, { id: "iva_notarial" });
  if (p.precio_fijo !== "si" && p.etapa !== "entrega_inmediata") {
    faltantes.push({ id: "subidas_en_obra" });
  }
  faltantes.push({ id: "hipoteca" });

  return {
    estado: "calculado",
    desde,
    alMenos: partidas.reduce((s, x) => s + x.monto, 0),
    clase,
    partidas,
    faltantes,
    m2,
  };
}
