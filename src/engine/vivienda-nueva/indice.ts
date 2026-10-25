// El índice de la vivienda nueva (S11, F2). Puro. La mediana del m² PRIVADO por zona y por segmento, con las mismas
// reglas del S10 (`../precio/comparables.ts`): recorte de atípicos por vallas de Tukey y, con menos de 5 proyectos
// tras el recorte, NO hay mediana («sin datos suficientes»). Un proyecto sin área privada no entra y se cuenta.
// La edición tiene vigencia: pasada su fecha, el índice lo dice («mes sin edición») en vez de presentarse como de hoy.
import {
  MINIMO_COMPARABLES,
  percentil,
  recortarAtipicos,
} from "../precio/comparables.ts";
import { LOCALIDADES } from "../zonas/localidades.ts";
import type { Proyecto } from "./edicion.ts";
import { enConflicto, normalizarClave, type Region } from "./lectura.ts";

export type ProyectoIndice = Pick<
  Proyecto,
  | "tipo"
  | "etapa"
  | "entrega"
  | "ciudad"
  | "sector"
  | "segmento"
  | "precio_desde"
  | "area_privada_desde"
> & {
  region: Region;
  /** Campos que dos páginas de la revista contradicen: el proyecto no entra a la mediana (ver `ProyectoUnico`). */
  en_conflicto?: readonly string[];
};

/** El índice es de VIVIENDA: locales, oficinas y lotes no entran (su m² no se compara con el de un apartamento). */
export function esVivienda(p: Pick<Proyecto, "tipo">): boolean {
  return p.tipo !== "otro" && p.tipo !== "lote";
}

export type Grupo =
  | {
      clave: string;
      n: number;
      conArea: number;
      /** Proyectos que no entran al m² porque dos páginas de la revista contradicen su precio o su área privada. */
      enConflicto: number;
      estado: "sin_datos";
      minimo: number;
    }
  | {
      clave: string;
      n: number;
      conArea: number;
      enConflicto: number;
      estado: "mediana";
      /** Cuántos quedaron tras el recorte de atípicos. */
      usados: number;
      medianaM2: number;
    };

const LOCALIDAD_POR_CLAVE = new Map(
  LOCALIDADES.map((l) => [normalizarClave(l), l] as const),
);

/** La zona del índice: la localidad en Bogotá si el aviso la imprime; el municipio en la Sabana; lo demás aparte. */
export function zonaDe(p: ProyectoIndice): string {
  if (p.region === "bogota") {
    const loc =
      typeof p.sector === "string"
        ? LOCALIDAD_POR_CLAVE.get(normalizarClave(p.sector))
        : undefined;
    return loc ? `bogota:${loc}` : "bogota:sin_localidad";
  }
  if (p.region === "sabana") return `sabana:${String(p.ciudad)}`;
  return p.region;
}

function grupo(clave: string, lista: readonly ProyectoIndice[]): Grupo {
  const contradichos = lista.filter((p) =>
    enConflicto(p, "precio_desde", "area_privada_desde"),
  ).length;
  const m2 = lista
    .filter(
      (p) =>
        typeof p.precio_desde === "number" &&
        typeof p.area_privada_desde === "number" &&
        !enConflicto(p, "precio_desde", "area_privada_desde"),
    )
    .map((p) => (p.precio_desde as number) / (p.area_privada_desde as number));
  const recortados = recortarAtipicos(m2);
  if (recortados.length < MINIMO_COMPARABLES) {
    return {
      clave,
      n: lista.length,
      conArea: m2.length,
      enConflicto: contradichos,
      estado: "sin_datos",
      minimo: MINIMO_COMPARABLES,
    };
  }
  return {
    clave,
    n: lista.length,
    conArea: m2.length,
    enConflicto: contradichos,
    estado: "mediana",
    usados: recortados.length,
    medianaM2: Math.round(percentil(recortados, 0.5)),
  };
}

function agrupar(
  proyectos: readonly ProyectoIndice[],
  clave: (p: ProyectoIndice) => string,
): Grupo[] {
  const mapa = new Map<string, ProyectoIndice[]>();
  for (const p of proyectos) {
    const k = clave(p);
    mapa.set(k, [...(mapa.get(k) ?? []), p]);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, lista]) => grupo(k, lista));
}

/** Una franja de precio «desde»: hasta un tope en pesos, o sin tope la última. */
export type Franja = { clave: string; hasta: number | null };

export type Indice = {
  bogota: Grupo;
  sabana: Grupo;
  porZona: Grupo[];
  /** Por franja de precio, en el orden de las franjas; los que no traen precio, aparte. */
  porFranja: Grupo[];
  /** Proyectos de vivienda que se anuncian con entrega inmediata. */
  entregasInmediatas: number;
  /** Bogotá y la Sabana por segmento impreso: VIS, VIP, No VIS o «no lo dice». */
  porSegmento: Grupo[];
};

function franjaDe(p: ProyectoIndice, franjas: readonly Franja[]): string {
  // Un precio en conflicto SÍ cuenta en su franja (la maqueta aprobada lo dice con «N con cifras en conflicto»); no entra a la mediana.
  if (typeof p.precio_desde !== "number") return "sin_precio";
  const precio = p.precio_desde;
  const f = franjas.find((x) => x.hasta === null || precio <= x.hasta);
  return f ? f.clave : "sin_franja";
}

export function indice(
  proyectos: readonly ProyectoIndice[],
  franjas: readonly Franja[] = [],
): Indice {
  const cerca = proyectos.filter(
    (p) => (p.region === "bogota" || p.region === "sabana") && esVivienda(p),
  );
  return {
    bogota: grupo(
      "bogota",
      cerca.filter((p) => p.region === "bogota"),
    ),
    sabana: grupo(
      "sabana",
      cerca.filter((p) => p.region === "sabana"),
    ),
    porZona: agrupar(cerca, zonaDe),
    porFranja: [...franjas.map((f) => f.clave), "sin_precio"]
      .map((clave) =>
        grupo(
          clave,
          cerca.filter((p) => franjaDe(p, franjas) === clave),
        ),
      )
      .filter((g) => g.n > 0),
    // Una entrega o una etapa en conflicto no cuenta como inmediata (S13, igual que el filtro de la lista).
    entregasInmediatas: cerca.filter(
      (p) =>
        !enConflicto(p, "entrega", "entrega_precision", "etapa") &&
        (p.etapa === "entrega_inmediata" || p.entrega === "inmediata"),
    ).length,
    porSegmento: agrupar(cerca, (p) =>
      p.segmento === "ilegible" || p.segmento === "mixto"
        ? "no_lo_dice"
        : String(p.segmento),
    ),
  };
}

export type EstadoEdicion =
  | { estado: "vigente"; hasta: string }
  | { estado: "sin_edicion"; vencida: string; dias: number };

/** ¿La edición sigue vigente a la fecha de corte? La fecha es un parámetro, nunca el reloj. */
export function estadoEdicion(
  edicion: { hasta: string },
  hoy: string,
): EstadoEdicion {
  if (hoy <= edicion.hasta) return { estado: "vigente", hasta: edicion.hasta };
  const dias = Math.round(
    (Date.parse(`${hoy}T00:00:00Z`) -
      Date.parse(`${edicion.hasta}T00:00:00Z`)) /
      86_400_000,
  );
  return { estado: "sin_edicion", vencida: edicion.hasta, dias };
}
