// «El precio verdadero» de un proyecto de vivienda nueva (S11, F2). Puro. El aviso dice «desde $X»; aquí se suma lo que
// la norma dice que cuesta escriturar y lo que el aviso cobra aparte, y lo que NO se puede saber se NOMBRA, jamás se
// inventa. Por eso el resultado es una cota inferior: «pagas AL MENOS X», con la lista de lo que falta sumar.
//
//   al menos = precio desde + derechos de registro (a cargo del comprador que registra) + parqueadero aparte con precio
//
// Lo que queda nombrado y sin sumar: los derechos notariales (se reparten según la promesa: se da su total), el impuesto
// de registro y la beneficencia y el IVA notarial (se nombran sin monto), el parqueadero sin precio, lo que puede subir durante
// la obra si el precio no es fijo, la hipoteca si compras con crédito y que el registro de la VIS (la mitad) y el de la VIP (exento)
// exigen subsidio: la VIS nombra cuánto cuesta el registro sin él (S15).
// Un campo que dos páginas de la revista contradicen jamás entra a la cuenta (ni el precio ni el parqueadero), ni decide la
// clase de registro (VIS o general) ni «precio fijo»: se usa el caso MÁS BARATO posible para la cota inferior y se nombra.
// Una tarifa que no está `vigente` en `src/data` (o un caso que su norma no verifica) se nombra SIN monto: jamás se omite
// en silencio ni se suma (decisión 4 del S12).
//
// El m² es «aproximado»: el precio «desde» y el área «desde» no siempre son de la misma unidad.
import { NO_LO_DICE, type Proyecto } from "./edicion.ts";
import { enConflicto } from "./lectura.ts";
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
> & {
  /** Campos en que dos páginas de la revista imprimen cifras distintas (ver `ProyectoUnico`). */
  en_conflicto?: readonly string[];
};

export type Partida = {
  id: "precio_desde" | "derechos_registro" | "parqueadero";
  monto: number;
};

export type IdFaltante =
  | "derechos_registro"
  | "derechos_notariales"
  | "impuesto_registro"
  | "iva_notarial"
  | "parqueadero_sin_precio"
  | "parqueadero_no_lo_dice"
  | "parqueadero_en_conflicto"
  | "clase_en_conflicto"
  | "subidas_en_obra"
  | "hipoteca"
  | "segmento_no_lo_dice"
  | "exencion_vip_con_subsidio"
  | "registro_sin_subsidio"
  | "supera_tope_vis";

/** Sin `monto`: se nombra y no se puede dar la cifra (la tarifa no está verificada para este caso). */
export type Faltante = { id: IdFaltante; monto?: number };

export type M2Aproximado =
  | { base: "privada" | "construida"; valor: number; area: number }
  | { base: null; razon?: "en_conflicto" };

export type PrecioVerdadero =
  | { estado: "sin_precio"; m2: M2Aproximado }
  // Dos páginas de la revista imprimen precios distintos: no se elige uno, se nombra y no se suma nada.
  | { estado: "en_conflicto"; m2: M2Aproximado }
  | {
      estado: "calculado";
      desde: number;
      alMenos: number;
      clase: ClaseVivienda;
      partidas: Partida[];
      faltantes: Faltante[];
      m2: M2Aproximado;
    };

/**
 * El m² aproximado: sobre el área privada si el aviso la da; si no, sobre la construida (incluye muros y ductos). Un
 * campo que dos páginas de la revista contradicen no se usa: si el precio o el área que serviría está en conflicto, no
 * hay m² y se dice por qué.
 */
export function m2Aproximado(p: EntradaPrecio): M2Aproximado {
  if (typeof p.precio_desde !== "number") return { base: null };
  if (enConflicto(p, "precio_desde")) {
    return { base: null, razon: "en_conflicto" };
  }
  const privadaEnConflicto = enConflicto(p, "area_privada_desde");
  const construidaEnConflicto = enConflicto(p, "area_construida_desde");
  if (typeof p.area_privada_desde === "number" && !privadaEnConflicto) {
    return {
      base: "privada",
      area: p.area_privada_desde,
      valor: Math.round(p.precio_desde / p.area_privada_desde),
    };
  }
  if (typeof p.area_construida_desde === "number" && !construidaEnConflicto) {
    return {
      base: "construida",
      area: p.area_construida_desde,
      valor: Math.round(p.precio_desde / p.area_construida_desde),
    };
  }
  const hayAreaContradicha =
    (typeof p.area_privada_desde === "number" && privadaEnConflicto) ||
    (typeof p.area_construida_desde === "number" && construidaEnConflicto);
  return hayAreaContradicha
    ? { base: null, razon: "en_conflicto" }
    : { base: null };
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
  if (enConflicto(p, "precio_desde")) return { estado: "en_conflicto", m2 };
  const desde = p.precio_desde;
  const ciudad = typeof p.ciudad === "string" ? p.ciudad : "";
  // Si el segmento o la ciudad se contradicen no se elige: segmento «no lo dice» y el tope VIS más alto (el caso más barato).
  const claseDudosa = enConflicto(p, "segmento", "ciudad");
  const tope = enConflicto(p, "ciudad")
    ? topeVis("Bogotá", tarifas)
    : topeVis(ciudad, tarifas);
  const { clase, faltantes: porClase } = claseDe(
    enConflicto(p, "segmento") ? { ...p, segmento: NO_LO_DICE } : p,
    tope,
    desde,
  );

  const partidas: Partida[] = [{ id: "precio_desde", monto: desde }];
  const faltantes: Faltante[] = claseDudosa
    ? [
        ...porClase.filter((f) => f.id !== "segmento_no_lo_dice"),
        { id: "clase_en_conflicto" },
      ]
    : [...porClase];

  const registro = derechosRegistro(desde, clase, tarifas);
  if (registro === null) {
    faltantes.push({ id: "derechos_registro" });
  } else if (registro > 0) {
    partidas.push({ id: "derechos_registro", monto: registro });
  }
  // S15 (deuda del S14): la mitad de la VIS en el registro exige el subsidio (Res. SNR 2026-001726-6, art. 17, parágrafo 2). La
  // cota inferior sigue siendo el caso con subsidio; lo que cuesta sin él se nombra con su monto. Solo si el registro se sumó:
  // sin tarifa del año, `derechos_registro` ya lo nombra y «se sumó con la mitad» sería falso (S16).
  const sinSubsidio =
    clase === "vis" && registro !== null
      ? derechosRegistro(desde, "general", tarifas)
      : null;
  if (sinSubsidio !== null) {
    faltantes.push({ id: "registro_sin_subsidio", monto: sinSubsidio });
  }

  if (enConflicto(p, "parqueadero", "parqueadero_precio")) {
    faltantes.push({ id: "parqueadero_en_conflicto" });
  } else if (p.parqueadero === "adicional") {
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
  faltantes.push(
    notariales === null
      ? { id: "derechos_notariales" }
      : { id: "derechos_notariales", monto: notariales },
  );
  faltantes.push({ id: "impuesto_registro" }, { id: "iva_notarial" });
  const precioFijo = p.precio_fijo === "si" && !enConflicto(p, "precio_fijo");
  const yaEntregado =
    p.etapa === "entrega_inmediata" && !enConflicto(p, "etapa");
  if (!precioFijo && !yaEntregado) {
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
