// El asistente del papeleo (S14, F1). Puro: recibe las tarifas de `src/data/tarifas-escrituracion.json` (S11/S12: derechos
// de registro, derechos notariales, UVB, salario mínimo, tope de la VIS) y de `src/data/tarifas-papeleo.json` (S14: impuesto
// de registro, retención, recaudos, CTL) como DATO, y la fecha de hoy como PARÁMETRO (regla 23: nunca el reloj).
//
// Lo que el comprador y el vendedor pagan al escriturar una compraventa, línea por línea y por actor, cada una con su norma, su
// año y su estado. Solo se suma lo `vigente`; lo que no se pudo verificar se NOMBRA sin cifra con quien lo cobra (decisión 4 del
// S12): el total es una cota inferior y dice cuántos conceptos faltan. Desde el 1 de enero siguiente a la vigencia de las
// tarifas el resultado es `vencidas`: ninguna cifra de un año anterior se muestra como si fuera de hoy.
//
//   · Derechos notariales y de registro: los del S12 (`escrituracion.ts`), sobre el MAYOR entre el precio de la escritura y el
//     avalúo catastral (Res. SNR 2026-000964-6 art. 51 a; Ord. 039/2020 art. 213). La mitad de VIS exige, en el registro,
//     subsidio (Res. SNR 2026-001726-6 art. 17 parágrafo 2); en la notaría no (Res. SNR 2026-000964-6 art. 31).
//   · Reparto: los derechos notariales y sus recaudos, por mitades (Decreto-Ley 960 de 1970 art. 223); el impuesto de registro,
//     por partes iguales «salvo manifestación expresa en otro sentido» (Ord. 039/2020 art. 212). Otro reparto es un acuerdo de
//     las partes: la herramienta deja elegirlo. Los derechos de registro y el CTL, a cargo de quien los pide (el comprador).
//   · Impuesto de registro: solo Bogotá y Cundinamarca (su Estatuto de Rentas). Fuera de ahí se nombra sin cifra.
//   · Retención en la fuente (ET art. 398): solo si vende una persona natural. Si vende una empresa, se nombra sin cifra.
import {
  derechosNotariales,
  derechosRegistro,
  topeVis,
  type ClaseVivienda,
  type TarifasEscrituracion,
} from "../vivienda-nueva/escrituracion.ts";
import { normalizarClave } from "../vivienda-nueva/clave.ts";

export type Bilingue = { es: string; en: string };

export type TipoVivienda = "normal" | "vis" | "vip";
export type QuienVende = "persona" | "empresa";
export type Reparto = "iguales" | "comprador" | "vendedor";
export type Actor = "comprador" | "vendedor";

export const REPARTOS: readonly Reparto[] = [
  "iguales",
  "comprador",
  "vendedor",
];
export const TIPOS_VIVIENDA: readonly TipoVivienda[] = ["normal", "vis", "vip"];

/** Ciudad de la compra: el id de una opción de `opcionesCiudad`. */
export const CIUDAD_OTRO_CUNDINAMARCA = "otro-cundinamarca";
export const CIUDAD_OTRA = "otra";
export const CIUDAD_BOGOTA = "bogota";

export type EntradaGastos = {
  /** Precio de la escritura, en pesos. */
  precio: number | null;
  ciudad: string;
  tipo: TipoVivienda;
  /** Subsidio de vivienda del Estado o de una caja de compensación (cuenta solo para VIS y VIP). */
  subsidio: boolean;
  vende: QuienVende;
  reparto: Reparto;
  /** Avalúo catastral, opcional: si es mayor que el precio, las liquidaciones lo usan. */
  avaluo: number | null;
  credito: boolean;
};

export const ENTRADA_INICIAL: EntradaGastos = {
  precio: null,
  ciudad: CIUDAD_BOGOTA,
  tipo: "normal",
  subsidio: false,
  vende: "persona",
  reparto: "iguales",
  avaluo: null,
  credito: false,
};

// --- Los datos de `src/data/tarifas-papeleo.json` -------------------------------------------------------------------------

type ConceptoBase = {
  id: string;
  nombre: Bilingue;
  norma: Bilingue | null;
  anio: number;
  consultado: string;
  estado: string;
  cobra?: Bilingue;
};

export type ConceptoImpuestoRegistro = ConceptoBase & {
  tarifa_por_mil: number;
};
export type ConceptoRetencion = ConceptoBase & {
  tarifa: number;
  aplica_a: "persona_natural";
};
export type ConceptoRecaudos = ConceptoBase & {
  tramos: readonly { hasta?: number; valor: number }[];
};
export type ConceptoCtl = ConceptoBase & { electronico: number };

export type TarifasPapeleo = {
  vigencia: number;
  consultado: string;
  /** Nombres alternos de una ciudad (clave normalizada → clave de la opción). */
  alias_ciudad: Readonly<Record<string, string>>;
  conceptos: readonly ConceptoBase[];
  referencias: {
    derechos_registro: { norma: Bilingue };
    derechos_notariales: { norma: Bilingue };
    hipoteca: { norma: Bilingue };
  };
};

function vigente<T extends ConceptoBase>(
  t: TarifasPapeleo,
  id: string,
): T | null {
  const c = t.conceptos.find((x) => x.id === id);
  return c && c.estado === "vigente" ? (c as T) : null;
}

// --- Ciudades ------------------------------------------------------------------------------------------------------------

export type GrupoCiudad =
  "bogota" | "aglomeracion" | "cundinamarca" | "otras_aglomeraciones" | "otra";
export type OpcionCiudad = {
  id: string;
  /** El nombre propio de la ciudad; `null` en las dos opciones genéricas, cuyo rótulo vive en el diccionario (`PAPELEO.ciudades`). */
  nombre: string | null;
  grupo: GrupoCiudad;
  /** ¿Está en Cundinamarca (incluye Bogotá D.C.)? Solo ahí hay impuesto de registro verificado. */
  cundinamarca: boolean;
};

const idDeNombre = (n: string) => normalizarClave(n).replace(/\s+/g, "-");

/**
 * Las opciones del selector de ciudad, sacadas de las listas del tope VIS (no se copian a mano). Los nombres alternos de una misma
 * ciudad (`alias_ciudad` de `tarifas-papeleo.json`) no son opciones propias.
 */
export function opcionesCiudad(
  t: TarifasEscrituracion,
  pap: Pick<TarifasPapeleo, "alias_ciudad">,
): OpcionCiudad[] {
  const ops: OpcionCiudad[] = [];
  const vistos = new Set<string>();
  const agregar = (nombre: string, grupo: GrupoCiudad, cund: boolean) => {
    const clave = normalizarClave(nombre);
    if (vistos.has(clave) || clave in pap.alias_ciudad) return;
    vistos.add(clave);
    ops.push({ id: idDeNombre(nombre), nombre, grupo, cundinamarca: cund });
  };
  for (const m of t.topes_vis.municipios_aglomeracion_bogota) {
    agregar(
      m,
      normalizarClave(m) === "bogota" ? "bogota" : "aglomeracion",
      true,
    );
  }
  ops.push({
    id: CIUDAD_OTRO_CUNDINAMARCA,
    nombre: null,
    grupo: "cundinamarca",
    cundinamarca: true,
  });
  for (const m of t.topes_vis.otras_aglomeraciones) {
    agregar(m, "otras_aglomeraciones", false);
  }
  ops.push({
    id: CIUDAD_OTRA,
    nombre: null,
    grupo: "otra",
    cundinamarca: false,
  });
  return ops;
}

/**
 * La opción de ciudad que corresponde a un texto libre (el que trae un proyecto o un anuncio). Un municipio de Cundinamarca que
 * no está en la lista (la «Sabana») cae en «otro municipio de Cundinamarca»; cualquier otra cosa, en «otra ciudad».
 */
export function resolverCiudad(
  texto: string | null | undefined,
  sabana: boolean,
  t: TarifasEscrituracion,
  pap: Pick<TarifasPapeleo, "alias_ciudad">,
): string {
  const escrita = normalizarClave(texto ?? "");
  const clave = pap.alias_ciudad[escrita] ?? escrita;
  const directa = opcionesCiudad(t, pap).find(
    (o) => o.nombre !== null && normalizarClave(o.nombre) === clave,
  );
  if (directa) return directa.id;
  return sabana ? CIUDAD_OTRO_CUNDINAMARCA : CIUDAD_OTRA;
}

// --- Líneas y resultado --------------------------------------------------------------------------------------------------

export type IdLinea =
  | "derechos_notariales"
  | "recaudos_notariales"
  | "iva_notarial"
  | "impuesto_registro"
  | "derechos_registro"
  | "certificado_tradicion"
  | "retencion_enajenacion"
  | "hipoteca";

export type Tarifa =
  | { tipo: "por_mil"; valor: number }
  | { tipo: "porcentaje"; valor: number }
  | { tipo: "fija"; valor: number }
  | { tipo: "escala" };

export type EstadoLinea = "vigente" | "no_verificado";

export type LineaGasto = {
  id: IdLinea;
  actor: Actor;
  /** Pesos que paga ESTE actor; `null` si no se pudo verificar (se nombra, jamás se inventa). */
  valor: number | null;
  /** El total del concepto antes de repartirlo entre los dos. */
  total: number | null;
  /** La fracción del total que paga este actor (0,5 si se parte por mitades). */
  parte: number;
  estado: EstadoLinea;
  base: number | null;
  tarifa: Tarifa | null;
  norma: Bilingue | null;
  /** Quién lo cobra, dicho solo cuando la línea no tiene cifra. */
  cobra: Bilingue | null;
  anio: number;
  consultado: string;
};

export type AvisoGasto =
  | { id: "supera_tope_vis"; tope: number }
  | { id: "vis_sin_subsidio" }
  | { id: "vip_sin_subsidio" }
  | { id: "avaluo_mayor"; avaluo: number }
  | { id: "vis_tarifa_unica" }
  | { id: "vip_notarial_no_verificado" }
  | { id: "impuesto_otro_departamento" }
  | { id: "vende_empresa" }
  | { id: "hojas_adicionales" };

export type Totales = Record<Actor, { suma: number; faltan: number }>;

export type Gastos =
  | { estado: "sin_precio" }
  /** Las tarifas son de un año que ya pasó: no se muestra ninguna cifra como si fuera de hoy. */
  | { estado: "vencidas"; anioTarifas: number; anioHoy: number }
  | {
      estado: "calculado";
      precio: number;
      /** Sobre lo que se liquidan notaría, registro e impuesto: el mayor entre el precio y el avalúo. */
      base: number;
      claseNotarial: ClaseVivienda;
      claseRegistro: ClaseVivienda;
      topeVis: number;
      lineas: LineaGasto[];
      totales: Totales;
      avisos: AvisoGasto[];
    };

const ORDEN: readonly IdLinea[] = [
  "derechos_notariales",
  "recaudos_notariales",
  "iva_notarial",
  "impuesto_registro",
  "derechos_registro",
  "certificado_tradicion",
  "retencion_enajenacion",
  "hipoteca",
];

const FRACCION: Record<Reparto, Record<Actor, number>> = {
  iguales: { comprador: 0.5, vendedor: 0.5 },
  comprador: { comprador: 1, vendedor: 0 },
  vendedor: { comprador: 0, vendedor: 1 },
};

/** Parte un total sin perder un peso: lo que no paga uno lo paga el otro. */
function partir(total: number, reparto: Reparto): Record<Actor, number> {
  const comprador = Math.round(total * FRACCION[reparto].comprador);
  return { comprador, vendedor: total - comprador };
}

/** El recaudo del tramo de cuantía que contiene `base`; `null` si ningún tramo la cubre (el último, sin `hasta`, cubre el resto). */
function tramoRecaudo(c: ConceptoRecaudos, base: number): number | null {
  for (const t of c.tramos) {
    if (t.hasta === undefined || base <= t.hasta) return t.valor;
  }
  return null;
}

const anioDe = (hoy: string) => Number(hoy.slice(0, 4));

const aDinero = (n: number | null | undefined): number | null =>
  typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;

/**
 * Los gastos de escriturar una compraventa a `hoy`, por actor. `esc` son las tarifas del S12 y `pap` las del S14.
 */
export function gastos(
  entrada: EntradaGastos,
  esc: TarifasEscrituracion & { vigencia?: number },
  pap: TarifasPapeleo,
  hoy: string,
): Gastos {
  const precio = aDinero(entrada.precio);
  if (precio === null) return { estado: "sin_precio" };

  const anioTarifas = Math.min(esc.vigencia ?? pap.vigencia, pap.vigencia);
  if (anioDe(hoy) > anioTarifas) {
    return { estado: "vencidas", anioTarifas, anioHoy: anioDe(hoy) };
  }

  const opciones = opcionesCiudad(esc, pap);
  const ciudad =
    opciones.find((o) => o.id === entrada.ciudad) ??
    opciones.find((o) => o.id === CIUDAD_OTRA)!;
  const enCundinamarca = ciudad.cundinamarca;
  const avisos: AvisoGasto[] = [];

  // El tope de la VIS se mide contra el precio de la escritura (Res. SNR 2026-001726-6 art. 17).
  // Una opción genérica («otro municipio de Cundinamarca», «otra ciudad») no está en las listas de aglomeración: tope de 135.
  const tope = topeVis(ciudad.nombre ?? "", esc);
  const especial = entrada.tipo !== "normal";
  const dentroDelTope = precio <= tope;
  if (especial && !dentroDelTope) avisos.push({ id: "supera_tope_vis", tope });

  let claseNotarial: ClaseVivienda = "general";
  let claseRegistro: ClaseVivienda = "general";
  if (especial && dentroDelTope) {
    if (entrada.tipo === "vis") {
      claseNotarial = "vis";
      if (entrada.subsidio) claseRegistro = "vis";
      else avisos.push({ id: "vis_sin_subsidio" });
    } else if (entrada.subsidio) {
      claseNotarial = "vip";
      claseRegistro = "vip";
    } else {
      avisos.push({ id: "vip_sin_subsidio" });
    }
  }

  // Notaría, registro e impuesto se liquidan sobre el mayor entre el precio y el avalúo catastral.
  const avaluo = aDinero(entrada.avaluo);
  const base = avaluo !== null && avaluo > precio ? avaluo : precio;
  if (base > precio) avisos.push({ id: "avaluo_mayor", avaluo: base });

  const lineas: LineaGasto[] = [];
  const anio = pap.vigencia;
  const consultado = pap.consultado;

  /** Reparte un concepto entre los dos actores; el que paga cero no tiene línea. */
  function repartida(
    id: IdLinea,
    total: number | null,
    reparto: Reparto,
    resto: Pick<
      LineaGasto,
      "base" | "tarifa" | "norma" | "cobra" | "anio" | "consultado"
    >,
  ) {
    for (const actor of ["comprador", "vendedor"] as const) {
      const parte = FRACCION[reparto][actor];
      if (parte === 0) continue;
      lineas.push({
        id,
        actor,
        valor: total === null ? null : partir(total, reparto)[actor],
        total,
        parte,
        estado: total === null ? "no_verificado" : "vigente",
        ...resto,
      });
    }
  }
  const un = (
    id: IdLinea,
    actor: Actor,
    total: number | null,
    resto: Pick<
      LineaGasto,
      "base" | "tarifa" | "norma" | "cobra" | "anio" | "consultado"
    >,
  ) =>
    lineas.push({
      id,
      actor,
      valor: total,
      total,
      parte: 1,
      estado: total === null ? "no_verificado" : "vigente",
      ...resto,
    });

  // Derechos notariales (S12): VIP sin verificar en la norma notarial ⇒ sin cifra.
  const notariales = derechosNotariales(base, claseNotarial, esc);
  if (notariales === null && claseNotarial === "vip") {
    avisos.push({ id: "vip_notarial_no_verificado" });
  }
  repartida("derechos_notariales", notariales, entrada.reparto, {
    base,
    tarifa: { tipo: "escala" },
    norma: pap.referencias.derechos_notariales.norma,
    cobra: null,
    anio,
    consultado,
  });
  if (claseNotarial === "vis") avisos.push({ id: "vis_tarifa_unica" });
  if (notariales !== null) avisos.push({ id: "hojas_adicionales" });

  // Recaudos de la notaría (art. 50): por tramo de cuantía. La tabla trae una fila aparte para las escrituras exentas de derechos
  // notariales (19.300), pero la exención de una VIP con subsidio no se leyó en la norma notarial: ahí el recaudo no se afirma.
  const rec = vigente<ConceptoRecaudos>(pap, "recaudos_notariales");
  const exentaSinVerificar = claseNotarial === "vip" && notariales === null;
  const recaudo = rec && !exentaSinVerificar ? tramoRecaudo(rec, base) : null;
  repartida("recaudos_notariales", recaudo, entrada.reparto, {
    base,
    tarifa: recaudo === null ? null : { tipo: "fija", valor: recaudo },
    norma: rec?.norma ?? null,
    cobra: null,
    anio,
    consultado,
  });

  // IVA de los derechos notariales: sin norma clara, se nombra sin cifra (cada actor paga el de su parte).
  const iva = pap.conceptos.find((c) => c.id === "iva_notarial");
  if (iva) {
    repartida("iva_notarial", null, entrada.reparto, {
      base: null,
      tarifa: null,
      norma: iva.norma,
      cobra: iva.cobra ?? null,
      anio: iva.anio,
      consultado: iva.consultado,
    });
  }

  // Impuesto de registro: la tarifa de Cundinamarca (que cubre a Bogotá) solo vale para inmuebles de ahí.
  const imp = vigente<ConceptoImpuestoRegistro>(pap, "impuesto_registro");
  if (imp && enCundinamarca) {
    repartida(
      "impuesto_registro",
      Math.round((base * imp.tarifa_por_mil) / 1000),
      entrada.reparto,
      {
        base,
        tarifa: { tipo: "por_mil", valor: imp.tarifa_por_mil },
        norma: imp.norma,
        cobra: null,
        anio,
        consultado,
      },
    );
  } else {
    // Fuera de Cundinamarca no se lee la ordenanza de cada departamento: se nombra sin cifra y sin citar la de otro.
    if (!enCundinamarca) avisos.push({ id: "impuesto_otro_departamento" });
    repartida("impuesto_registro", null, entrada.reparto, {
      base,
      tarifa: null,
      norma: enCundinamarca ? (imp?.norma ?? null) : null,
      cobra: null,
      anio,
      consultado,
    });
  }

  // Derechos de registro (S12) y CTL: los paga quien los pide, el comprador.
  const registro = derechosRegistro(base, claseRegistro, esc);
  un("derechos_registro", "comprador", registro, {
    base,
    tarifa: { tipo: "escala" },
    norma: pap.referencias.derechos_registro.norma,
    cobra: null,
    anio,
    consultado,
  });
  const ctl = vigente<ConceptoCtl>(pap, "certificado_tradicion");
  un("certificado_tradicion", "comprador", ctl ? ctl.electronico : null, {
    base: null,
    tarifa: ctl ? { tipo: "fija", valor: ctl.electronico } : null,
    norma: ctl?.norma ?? null,
    cobra: null,
    anio,
    consultado,
  });

  // Retención en la fuente: del vendedor, solo si es una persona natural.
  const ret = vigente<ConceptoRetencion>(pap, "retencion_enajenacion");
  if (entrada.vende === "persona" && ret) {
    un("retencion_enajenacion", "vendedor", Math.round(precio * ret.tarifa), {
      base: precio,
      tarifa: { tipo: "porcentaje", valor: ret.tarifa * 100 },
      norma: ret.norma,
      cobra: null,
      anio,
      consultado,
    });
  } else {
    if (entrada.vende === "empresa") avisos.push({ id: "vende_empresa" });
    un("retencion_enajenacion", "vendedor", null, {
      base: null,
      tarifa: null,
      norma: ret?.norma ?? null,
      cobra: null,
      anio,
      consultado,
    });
  }

  // Con crédito: la hipoteca la paga el deudor (el comprador); sus cifras no se calculan aquí.
  if (entrada.credito) {
    un("hipoteca", "comprador", null, {
      base: null,
      tarifa: null,
      norma: pap.referencias.hipoteca.norma,
      cobra: null,
      anio,
      consultado,
    });
  }

  lineas.sort(
    (a, b) =>
      (a.actor === b.actor ? 0 : a.actor === "comprador" ? -1 : 1) ||
      ORDEN.indexOf(a.id) - ORDEN.indexOf(b.id),
  );

  const totales: Totales = {
    comprador: { suma: 0, faltan: 0 },
    vendedor: { suma: 0, faltan: 0 },
  };
  for (const l of lineas) {
    if (l.valor === null) totales[l.actor].faltan += 1;
    else totales[l.actor].suma += l.valor;
  }

  return {
    estado: "calculado",
    precio,
    base,
    claseNotarial,
    claseRegistro,
    topeVis: tope,
    lineas,
    totales,
    avisos,
  };
}
