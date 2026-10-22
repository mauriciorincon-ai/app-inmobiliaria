// Lo que el servidor le entrega a las pantallas de vivienda nueva (S12, F2). Puro y determinista: recibe la edición que
// leyó la base (ya convertida por `deFila`), las tarifas de `src/data` y la fecha de hoy como PARÁMETRO (regla 23), y
// solo llama a los motores del S11. Aquí no se suma ni se divide nada a mano: cada cifra sale de `precioVerdadero`,
// `indice`, `espera`, `fichaHonesta` o `alcanza`, y las pruebas lo atan a los motores llamados directo.
//
// Lo que NUNCA entra: el ingreso y el arriendo del comprador. «Lo que puedes pagar» llega como el tope ya calculado en
// su teléfono (`max`, como en los usados); «la espera» sale en MESES y el teléfono los multiplica por su arriendo.
import { alcanza } from "./alcanza.ts";
import { topeVis, type TarifasEscrituracion } from "./escrituracion.ts";
import { espera, type Espera } from "./espera.ts";
import { fichaHonesta, type FichaHonesta } from "./ficha-honesta.ts";
import {
  esVivienda,
  estadoEdicion,
  indice,
  zonaDe,
  type Franja,
  type Indice,
} from "./indice.ts";
import type { ProyectoUnico, Region } from "./lectura.ts";
import { precioVerdadero, type PrecioVerdadero } from "./precio-verdadero.ts";

// --- la edición --------------------------------------------------------------------------------------------------------
export type EdicionPublicada = {
  numero: number;
  nombre: string;
  desde: string;
  hasta: string;
  paginas: number;
};
export type ProyectoPublicado = ProyectoUnico & { slug: string };
export type EdicionLeida = {
  edicion: EdicionPublicada;
  proyectos: readonly ProyectoPublicado[];
};

export type Vigencia =
  | { estado: "sin_publicar" }
  | { estado: "vigente"; edicion: EdicionPublicada }
  | {
      estado: "sin_edicion";
      edicion: EdicionPublicada;
      /** El último día de la edición que se muestra y cuántos días hace que venció. */
      vencida: string;
      dias: number;
    };

/**
 * La edición que se muestra a `hoy`, con la MISMA regla que `nuevos_publicados` (migración 15): la publicada cuya ventana
 * contiene hoy (la de mayor número si hay varias); si ninguna, la última publicada ya vencida, dicha como «mes sin
 * edición». Una edición que aún no empieza no sale.
 */
export function edicionVigente(
  publicadas: readonly EdicionPublicada[],
  hoy: string,
): Vigencia {
  const empezadas = publicadas
    .filter((e) => e.desde <= hoy)
    .sort((a, b) => b.numero - a.numero);
  const elegida =
    empezadas.find((e) => hoy <= e.hasta) ??
    (empezadas[0] as EdicionPublicada | undefined);
  if (!elegida) return { estado: "sin_publicar" };
  const e = estadoEdicion(elegida, hoy);
  return e.estado === "vigente"
    ? { estado: "vigente", edicion: elegida }
    : {
        estado: "sin_edicion",
        edicion: elegida,
        vencida: e.vencida,
        dias: e.dias,
      };
}

// --- los filtros de «Nuevos» (en la URL; jamás lanzan) -------------------------------------------------------------
export const FRANJAS_NUEVOS = [
  "hasta_150",
  "hasta_tope_vis",
  "hasta_400",
  "mas_de_400",
  "sin_precio",
] as const;
export type ClaveFranja = (typeof FRANJAS_NUEVOS)[number];

/** El segmento como lo imprime el aviso; lo ilegible o mixto cuenta como «no lo dice». */
export const SEGMENTOS_NUEVOS = {
  vis: "VIS",
  vip: "VIP",
  no_vis: "No VIS",
  no_lo_dice: "no_lo_dice",
} as const;
export type SegmentoNuevos = keyof typeof SEGMENTOS_NUEVOS;
const CLAVES_SEGMENTO = Object.keys(SEGMENTOS_NUEVOS) as SegmentoNuevos[];

export const ETAPAS_NUEVOS = [
  "sobre_planos",
  "en_construccion",
  "entrega_inmediata",
  "no_lo_dice",
] as const;
export type EtapaNuevos = (typeof ETAPAS_NUEVOS)[number];

export type FiltrosNuevos = {
  /** `bogota`, `sabana` o una zona del índice (`bogota:Suba`, `sabana:Funza`, `bogota:sin_localidad`). */
  lugar?: string;
  franja?: ClaveFranja;
  segmento?: SegmentoNuevos;
  etapa?: EtapaNuevos;
  /** Entrega a más tardar en ese año (incluye la inmediata), o solo la inmediata. */
  entrega?: number | "inmediata";
  /** El tope de «lo que puedes pagar», ya calculado en el teléfono. */
  max?: number;
  /** El comprador llegó desde el simulador: la página rotula de dónde sale el tope. */
  pago: boolean;
};

/** El mismo techo que la búsqueda de usados para `max`. */
export const MAX_NUEVOS = 900_000_000_000;
const RE_LUGAR = /^(bogota|sabana)(:[^\s:][^:]{0,58})?$/;
const RE_ANIO = /^20\d{2}$/;
const RE_ENTERO = /^\d{1,12}$/;

type EntradaUrl = Record<string, string | string[] | undefined>;
const primero = (e: EntradaUrl, k: string): string | undefined => {
  const v = e[k];
  const x = Array.isArray(v) ? v[0] : v;
  return typeof x === "string" ? x.trim() : undefined;
};
const de = <T extends string>(lista: readonly T[], v: string | undefined) =>
  lista.find((x) => x === v);

/** Los filtros de «Nuevos» desde la URL. Un valor que no se entiende se ignora: nunca lanza. */
export function leerFiltrosNuevos(entrada: EntradaUrl): FiltrosNuevos {
  const f: FiltrosNuevos = { pago: false };
  const lugar = primero(entrada, "lugar");
  if (lugar !== undefined && RE_LUGAR.test(lugar)) f.lugar = lugar;
  const franja = de(FRANJAS_NUEVOS, primero(entrada, "franja"));
  if (franja) f.franja = franja;
  const segmento = de(CLAVES_SEGMENTO, primero(entrada, "segmento"));
  if (segmento) f.segmento = segmento;
  const etapa = de(ETAPAS_NUEVOS, primero(entrada, "etapa"));
  if (etapa) f.etapa = etapa;
  const entrega = primero(entrada, "entrega");
  if (entrega === "inmediata") f.entrega = "inmediata";
  else if (entrega !== undefined && RE_ANIO.test(entrega)) {
    f.entrega = Number(entrega);
  }
  const max = primero(entrada, "max");
  if (max !== undefined && RE_ENTERO.test(max)) {
    const n = Number(max);
    if (n > 0 && n <= MAX_NUEVOS) f.max = n;
  }
  f.pago = primero(entrada, "pago") === "1" && f.max !== undefined;
  return f;
}

/** Cuántas tarjetas salen de a una vez; «ver más» es un enlace (`pag`), sin JavaScript. */
export const PAGINA_NUEVOS = 12;
const PAGINAS_MAX = 20;

/** La página de la lista (1 por omisión). Un valor que no se entiende es la primera; nunca lanza. */
export function leerPagina(entrada: EntradaUrl): number {
  const v = primero(entrada, "pag");
  if (v === undefined || !/^\d{1,3}$/.test(v)) return 1;
  return Math.min(Math.max(1, Number(v)), PAGINAS_MAX);
}

/** La URL de «Nuevos» con sus filtros (`v=nuevos` primero): la inversa de `leerFiltrosNuevos`. */
export function paramsNuevos(f: FiltrosNuevos): URLSearchParams {
  const p = new URLSearchParams({ v: "nuevos" });
  if (f.lugar) p.set("lugar", f.lugar);
  if (f.franja) p.set("franja", f.franja);
  if (f.segmento) p.set("segmento", f.segmento);
  if (f.etapa) p.set("etapa", f.etapa);
  if (f.entrega !== undefined) p.set("entrega", String(f.entrega));
  if (f.max !== undefined) p.set("max", String(f.max));
  if (f.pago) p.set("pago", "1");
  return p;
}

/** ¿Hay algún filtro de proyecto (sin contar el tope)? */
export function hayFiltrosNuevos(f: FiltrosNuevos): boolean {
  return (
    f.lugar !== undefined ||
    f.franja !== undefined ||
    f.segmento !== undefined ||
    f.etapa !== undefined ||
    f.entrega !== undefined
  );
}

// --- las franjas y el índice -----------------------------------------------------------------------------------------
/** Las franjas del «desde»: el tope VIS de Bogotá de este año sale de las tarifas, nunca escrito a mano. */
export function franjasNuevos(tarifas: TarifasEscrituracion): Franja[] {
  return [
    { clave: "hasta_150", hasta: 150_000_000 },
    { clave: "hasta_tope_vis", hasta: topeVis("Bogotá", tarifas) },
    { clave: "hasta_400", hasta: 400_000_000 },
    { clave: "mas_de_400", hasta: null },
  ];
}

function franjaDe(p: ProyectoUnico, franjas: readonly Franja[]): ClaveFranja {
  if (typeof p.precio_desde !== "number") return "sin_precio";
  const precio = p.precio_desde;
  return (franjas.find((x) => x.hasta === null || precio <= x.hasta) as Franja)
    .clave as ClaveFranja;
}

/** Bogotá y la Sabana, solo vivienda: el universo del índice y de la lista (como en la maqueta). */
function cercanos<T extends ProyectoUnico>(proyectos: readonly T[]): T[] {
  return proyectos.filter(
    (p) => (p.region === "bogota" || p.region === "sabana") && esVivienda(p),
  );
}

export function vistaIndice(
  proyectos: readonly ProyectoUnico[],
  tarifas: TarifasEscrituracion,
): Indice {
  return indice(
    proyectos.map((p) => ({
      tipo: p.tipo,
      etapa: p.etapa,
      entrega: p.entrega,
      region: p.region,
      ciudad: p.ciudad,
      sector: p.sector,
      segmento: p.segmento,
      precio_desde: p.precio_desde,
      area_privada_desde: p.area_privada_desde,
      en_conflicto: p.en_conflicto,
    })),
    franjasNuevos(tarifas),
  );
}

// --- la lista ----------------------------------------------------------------------------------------------------------
/** Lo que una tarjeta necesita del precio: el estado, el «desde», el «al menos» y el m² aproximado con su base. */
export type PrecioTarjeta =
  | {
      estado: "calculado";
      desde: number;
      alMenos: number;
      m2: PrecioVerdadero["m2"];
    }
  | { estado: "sin_precio" | "en_conflicto"; m2: PrecioVerdadero["m2"] };

export type TarjetaNuevo = {
  slug: string;
  nombre: ProyectoUnico["nombre"];
  constructora: ProyectoUnico["constructora"];
  ciudad: ProyectoUnico["ciudad"];
  sector: ProyectoUnico["sector"];
  region: Region;
  segmento: ProyectoUnico["segmento"];
  etapa: ProyectoUnico["etapa"];
  precio: PrecioTarjeta;
  /** De los datos de la ficha honesta: cuántos calla el aviso y de cuántos. */
  faltan: number;
  datos: number;
};

export type VistaLista = {
  /** Proyectos de vivienda de Bogotá y la Sabana en la edición. */
  total: number;
  /** Los que pasan los filtros. */
  coinciden: number;
  tope: number | null;
  /** Con precio y dentro del tope (todos los que tienen precio si no hay tope), del «al menos» más bajo al más alto. */
  dentro: TarjetaNuevo[];
  /** Con precio y por encima del tope. */
  fuera: TarjetaNuevo[];
  /** Sin precio o con precios que se contradicen: no caben ni dejan de caber. */
  sinPrecio: TarjetaNuevo[];
  /** Los lugares para elegir, con cuántos proyectos tiene cada uno (antes de filtrar). */
  lugares: { clave: string; n: number }[];
  /** Los años de entrega que la edición imprime (antes de filtrar), para elegir «a más tardar». */
  anios: number[];
};

function resumenPrecio(pv: PrecioVerdadero): PrecioTarjeta {
  return pv.estado === "calculado"
    ? { estado: "calculado", desde: pv.desde, alMenos: pv.alMenos, m2: pv.m2 }
    : { estado: pv.estado, m2: pv.m2 };
}

function tarjeta(p: ProyectoPublicado, pv: PrecioVerdadero): TarjetaNuevo {
  const ficha = fichaHonesta(p);
  return {
    slug: p.slug,
    nombre: p.nombre,
    constructora: p.constructora,
    ciudad: p.ciudad,
    sector: p.sector,
    region: p.region,
    segmento: p.segmento,
    etapa: p.etapa,
    precio: resumenPrecio(pv),
    faltan: ficha.faltan,
    datos: ficha.datos.length,
  };
}

function segmentoDe(p: ProyectoUnico): SegmentoNuevos {
  if (p.segmento === "VIS") return "vis";
  if (p.segmento === "VIP") return "vip";
  if (p.segmento === "No VIS") return "no_vis";
  return "no_lo_dice";
}

function etapaDe(p: ProyectoUnico): EtapaNuevos {
  return de(ETAPAS_NUEVOS, String(p.etapa)) ?? "no_lo_dice";
}

function entregaCumple(
  p: ProyectoUnico,
  filtro: number | "inmediata",
): boolean {
  const inmediata =
    p.entrega === "inmediata" || p.etapa === "entrega_inmediata";
  if (filtro === "inmediata") return inmediata;
  if (inmediata) return true;
  const m = /^(\d{4})-\d{2}$/.exec(String(p.entrega));
  return m !== null && Number(m[1]) <= filtro;
}

function lugarCumple(p: ProyectoUnico, lugar: string): boolean {
  return lugar === p.region || lugar === zonaDe(p);
}

export function vistaLista(
  proyectos: readonly ProyectoPublicado[],
  tarifas: TarifasEscrituracion,
  f: FiltrosNuevos,
): VistaLista {
  const cerca = cercanos(proyectos);
  const franjas = franjasNuevos(tarifas);

  const conteo = new Map<string, number>();
  for (const p of cerca) {
    for (const k of [p.region, zonaDe(p)]) {
      conteo.set(k, (conteo.get(k) ?? 0) + 1);
    }
  }
  const lugares = [...conteo.entries()]
    .map(([clave, n]) => ({ clave, n }))
    .sort((a, b) => (a.clave < b.clave ? -1 : 1));

  const anios = [
    ...new Set(
      cerca.flatMap((p) => {
        const m = /^(\d{4})-\d{2}$/.exec(String(p.entrega));
        return m ? [Number(m[1])] : [];
      }),
    ),
  ].sort((a, b) => a - b);

  const filtrados = cerca.filter(
    (p) =>
      (f.lugar === undefined || lugarCumple(p, f.lugar)) &&
      (f.franja === undefined || franjaDe(p, franjas) === f.franja) &&
      (f.segmento === undefined || segmentoDe(p) === f.segmento) &&
      (f.etapa === undefined || etapaDe(p) === f.etapa) &&
      (f.entrega === undefined || entregaCumple(p, f.entrega)),
  );

  // El tope se compara con el precio VERDADERO, nunca con el «desde» (alcanza.ts). Sin tope, todo lo que tiene precio
  // queda «dentro», en el mismo orden.
  const conPrecio = filtrados.map((p) => {
    const pv = precioVerdadero(p, tarifas);
    return {
      id: p.slug,
      alMenos: pv.estado === "calculado" ? pv.alMenos : null,
      tarjeta: tarjeta(p, pv),
    };
  });
  const tope = f.max ?? null;
  // Los slugs son únicos en la edición (PK de la tabla): el desempate es total.
  const porSlug = (a: { id: string }, b: { id: string }) =>
    a.id < b.id ? -1 : 1;
  const a = alcanza(
    [...conPrecio].sort(porSlug),
    tope ?? Number.POSITIVE_INFINITY,
  );
  return {
    total: cerca.length,
    coinciden: filtrados.length,
    tope,
    dentro: a.caben.map((x) => x.tarjeta),
    fuera: a.noCaben.map((x) => x.tarjeta),
    sinPrecio: a.sinPrecio.map((x) => x.tarjeta),
    lugares,
    anios,
  };
}

// --- la ficha del proyecto -------------------------------------------------------------------------------------------
/** «La espera» en meses: el teléfono los multiplica por el arriendo que el comprador escribe allí y no sale de allí. */
export type EsperaMeses =
  | Exclude<Espera, { estado: "calculada" }>
  | Omit<Extract<Espera, { estado: "calculada" }>, "total">;

/** De dónde sale cada peso que se suma o se da: la norma y la fecha en que se consultó. */
export type NormaCitada = { norma: string; consultado: string };

export type VistaProyecto = {
  slug: string;
  nombre: ProyectoUnico["nombre"];
  constructora: ProyectoUnico["constructora"];
  tipo: ProyectoUnico["tipo"];
  ciudad: ProyectoUnico["ciudad"];
  sector: ProyectoUnico["sector"];
  region: Region;
  segmento: ProyectoUnico["segmento"];
  etapa: ProyectoUnico["etapa"];
  entrega: ProyectoUnico["entrega"];
  entregaPrecision: ProyectoUnico["entrega_precision"];
  parqueadero: ProyectoUnico["parqueadero"];
  rotulos: ProyectoUnico["rotulos"];
  /** Las páginas de la edición donde aparece (la fuente). */
  paginas: number[];
  enConflicto: string[];
  precio: PrecioVerdadero;
  ficha: FichaHonesta;
  espera: EsperaMeses;
  /** El tope VIS de este año en su ciudad (para decir por qué un «VIS» se calculó como vivienda general). */
  topeVis: number;
  /** La norma y la fecha de los derechos que se suman o se dan; `null` si la tarifa no está vigente. */
  normas: {
    derechos_registro: NormaCitada | null;
    derechos_notariales: NormaCitada | null;
  };
  /** Contra «lo que puedes pagar», si el comprador trae su tope. */
  alcanza: "dentro" | "fuera" | "sin_precio" | null;
};

function normaVigente(
  tarifas: TarifasEscrituracion,
  id: string,
): NormaCitada | null {
  const c = tarifas.conceptos.find((x) => x.id === id) as
    { estado: string; norma?: string | null; consultado?: string } | undefined;
  return c && c.estado === "vigente" && c.norma && c.consultado
    ? { norma: c.norma, consultado: c.consultado }
    : null;
}

export function vistaProyecto(
  proyectos: readonly ProyectoPublicado[],
  slug: string,
  tarifas: TarifasEscrituracion,
  hoy: string,
  tope: number | null = null,
): VistaProyecto | null {
  const p = proyectos.find((x) => x.slug === slug);
  if (!p) return null;
  const precio = precioVerdadero(p, tarifas);
  const e = espera(p, hoy, 0);
  const esperaMeses: EsperaMeses =
    e.estado === "calculada"
      ? {
          estado: "calculada",
          meses: e.meses,
          aproximada: e.aproximada,
          vencida: e.vencida,
        }
      : e;
  return {
    slug: p.slug,
    nombre: p.nombre,
    constructora: p.constructora,
    tipo: p.tipo,
    ciudad: p.ciudad,
    sector: p.sector,
    region: p.region,
    segmento: p.segmento,
    etapa: p.etapa,
    entrega: p.entrega,
    entregaPrecision: p.entrega_precision,
    parqueadero: p.parqueadero,
    rotulos: [...p.rotulos],
    paginas: [...p.apariciones],
    enConflicto: [...(p.en_conflicto ?? [])],
    precio,
    ficha: fichaHonesta(p),
    espera: esperaMeses,
    // «ilegible» o «no lo dice» no es ninguna ciudad de la aglomeración: tope general.
    topeVis: topeVis(String(p.ciudad), tarifas),
    normas: {
      derechos_registro: normaVigente(tarifas, "derechos_registro"),
      derechos_notariales: normaVigente(tarifas, "derechos_notariales"),
    },
    alcanza:
      tope === null
        ? null
        : precio.estado !== "calculado"
          ? "sin_precio"
          : precio.alMenos <= tope
            ? "dentro"
            : "fuera",
  };
}

// --- la fecha de entrega, para escribirla en cada idioma ---------------------------------------------------------------
/** Cómo se dice la entrega: el mes exacto, «hasta» un mes (trimestre o semestre) o «durante» un año. */
export type EntregaPartes = {
  anio: number;
  mes: number;
  forma: "mes" | "hasta" | "anio";
};

/** `AAAA-MM` + la precisión impresa → las partes para escribirla; `null` si el aviso no da una fecha. */
export function entregaPartes(
  entrega: string,
  precision: string | null,
): EntregaPartes | null {
  const m = /^(\d{4})-(\d{2})$/.exec(entrega);
  if (!m) return null;
  return {
    anio: Number(m[1]),
    mes: Number(m[2]),
    forma:
      precision === "anio"
        ? "anio"
        : precision === "mes" || precision === null
          ? "mes"
          : "hasta",
  };
}
