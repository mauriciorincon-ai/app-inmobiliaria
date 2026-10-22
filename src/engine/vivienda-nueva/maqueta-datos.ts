// Los datos de la maqueta de vivienda nueva (S11, F2). Puro y determinista: de la edición unida, las tarifas, los
// programas y un escenario de ejemplo, a un objeto que la maqueta solo PINTA. Toda cifra sale de un motor de esta carpeta
// o del simulador del S10; el navegador no calcula nada. Solo pasan los campos de una lista blanca: ni notas de lectura
// ni nada que no esté en `ProyectoUnico` (que ya excluye contactos, direcciones, webs y textos de avisos).
import { precioMaximo } from "../simulador/cuota.ts";
import type { FuentePrecio } from "../precio/comparables.ts";
import { alcanza } from "./alcanza.ts";
import type { EDICION } from "./edicion.ts";
import { espera, type Espera } from "./espera.ts";
import { fichaHonesta, type FichaHonesta } from "./ficha-honesta.ts";
import {
  esVivienda,
  estadoEdicion,
  indice,
  type EstadoEdicion,
  type Indice,
} from "./indice.ts";
import {
  normalizarClave,
  type Conflicto,
  type ProyectoUnico,
  type Region,
} from "./lectura.ts";
import {
  nuevoOUsado,
  type NuevoOUsado,
  type UsadoParaComparar,
} from "./nuevo-o-usado.ts";
import { precioVerdadero, type PrecioVerdadero } from "./precio-verdadero.ts";
import { topeVis, type TarifasEscrituracion } from "./escrituracion.ts";
import {
  mejorCaso,
  subsidiosPara,
  type Programa,
  type ResultadoPrograma,
} from "./subsidio.ts";

export type Escenario = {
  /** La fecha de corte de la maqueta (perilla de build, nunca el reloj). */
  fechaCorte: string;
  /** Una fecha después de la vigencia, para el estado «mes sin edición». */
  fechaSinEdicion: string;
  /** El arriendo de ejemplo que escribe el comprador para «la espera». */
  arriendo: number;
  tasa: { tasaEA: number; fechaCorte: string };
  /** El hogar de «lo que puedes pagar». */
  hogar: { ingresos: number; inicial: number; plazoAnos: number };
  /** Los hogares de «¿te alcanza con subsidio?». */
  hogaresSubsidio: { id: string; ingresos: number }[];
  /** Usados verificados DE EJEMPLO por zona, para «¿nuevo o usado?». */
  usados: {
    zona: Region;
    fuente: FuentePrecio;
    anuncios: UsadoParaComparar[];
  }[];
};

export type EntradaMaqueta = {
  edicion: Pick<typeof EDICION, "numero" | "desde" | "hasta">;
  proyectos: readonly ProyectoUnico[];
  conflictos: readonly Conflicto[];
  tarifas: TarifasEscrituracion;
  programas: readonly (Programa & {
    nombre: { es: string; en: string };
    normas: readonly string[];
    consultado: string;
    estado_al: string;
  })[];
  escenario: Escenario;
};

export type ProyectoMaqueta = {
  id: string;
  nombre: ProyectoUnico["nombre"];
  constructora: ProyectoUnico["constructora"];
  tipo: ProyectoUnico["tipo"];
  ciudad: ProyectoUnico["ciudad"];
  sector: ProyectoUnico["sector"];
  region: Region;
  segmento: ProyectoUnico["segmento"];
  precioDesde: ProyectoUnico["precio_desde"];
  areaConstruida: [
    ProyectoUnico["area_construida_desde"],
    ProyectoUnico["area_construida_hasta"],
  ];
  areaPrivada: [
    ProyectoUnico["area_privada_desde"],
    ProyectoUnico["area_privada_hasta"],
  ];
  etapa: ProyectoUnico["etapa"];
  entrega: ProyectoUnico["entrega"];
  entregaPrecision: ProyectoUnico["entrega_precision"];
  parqueadero: ProyectoUnico["parqueadero"];
  parqueaderoPrecio: ProyectoUnico["parqueadero_precio"];
  precioFijo: ProyectoUnico["precio_fijo"];
  subsidioAnunciado: ProyectoUnico["subsidio_anunciado"];
  rotulos: ProyectoUnico["rotulos"];
  /** Páginas de la edición donde aparece (para citar la fuente). */
  paginas: number[];
  /** Campos en que dos páginas de la revista imprimen cifras distintas. */
  discrepancias: string[];
  precioVerdadero: PrecioVerdadero;
  ficha: FichaHonesta;
  espera: Espera;
};

export type DatosMaqueta = {
  version: 1;
  edicion: EntradaMaqueta["edicion"];
  fechaCorte: string;
  estadoEdicion: { hoy: EstadoEdicion; despues: EstadoEdicion };
  tasa: Escenario["tasa"];
  hogar: Escenario["hogar"] & { tope: number | null };
  arriendo: number;
  proyectos: ProyectoMaqueta[];
  indice: Indice;
  alcanza: {
    tope: number | null;
    caben: string[];
    noCaben: string[];
    sinPrecio: string[];
  };
  programas: {
    id: string;
    nombre: { es: string; en: string };
    estado: string;
    estadoAl: string;
    normas: readonly string[];
    consultado: string;
    minimo: number | null;
    maximo: number;
    restaAlPrecio: boolean;
  }[];
  /** La norma, el estado y la fecha de consulta de cada concepto de escrituración (lo no verificado también). */
  escrituracion: {
    id: string;
    norma: string | null;
    estado: string;
    consultado: string;
  }[];
  subsidio: {
    id: string;
    ingresos: number;
    tope: number | null;
    /** Solo proyectos de Bogotá y la Sabana con precio. */
    porProyecto: {
      id: string;
      resultados: Pick<ResultadoPrograma, "id" | "estado" | "motivos">[];
      mejor: { id: string; monto: number } | null;
      cabeSinSubsidio: boolean;
      cabeConSubsidio: boolean;
    }[];
  }[];
  nuevoOUsado: { zona: Region; resultado: NuevoOUsado }[];
  destacados: { completo: string; faltante: string; fuera: string | null };
};

const ORDEN_REGION: Record<Region, number> = {
  bogota: 0,
  sabana: 1,
  otra: 2,
  sin_ciudad: 3,
};

/** Un identificador estable y legible: constructora y nombre normalizados; si se repite, con su página. */
function identificadores(proyectos: readonly ProyectoUnico[]): string[] {
  const vistos = new Map<string, number>();
  return proyectos.map((p) => {
    const base =
      `${normalizarClave(String(p.constructora))}-${normalizarClave(String(p.nombre))}`
        .replace(/ /g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    const n = (vistos.get(base) ?? 0) + 1;
    vistos.set(base, n);
    return n === 1 ? base : `${base}-p${p.apariciones[0]}`;
  });
}

function ordenar(proyectos: readonly ProyectoUnico[]): ProyectoUnico[] {
  const clave = (p: ProyectoUnico) =>
    `${ORDEN_REGION[p.region]}|${normalizarClave(String(p.ciudad))}|${normalizarClave(String(p.nombre))}|${String(p.apariciones[0]).padStart(3, "0")}`;
  return [...proyectos].sort((a, b) => {
    const x = clave(a);
    const y = clave(b);
    return x < y ? -1 : x > y ? 1 : 0;
  });
}

const alMenosDe = (p: ProyectoMaqueta) =>
  p.precioVerdadero.estado === "calculado" ? p.precioVerdadero.alMenos : null;

export function datosMaqueta(e: EntradaMaqueta): DatosMaqueta {
  const ordenados = ordenar(e.proyectos);
  const ids = identificadores(ordenados);
  const esc = e.escenario;

  const proyectos: ProyectoMaqueta[] = ordenados.map((p, i) => {
    const discrepancias = e.conflictos
      .filter((c) => c.proyecto === p.clave)
      .map((c) => c.campo)
      .sort();
    return {
      id: ids[i],
      nombre: p.nombre,
      constructora: p.constructora,
      tipo: p.tipo,
      ciudad: p.ciudad,
      sector: p.sector,
      region: p.region,
      segmento: p.segmento,
      precioDesde: p.precio_desde,
      areaConstruida: [p.area_construida_desde, p.area_construida_hasta],
      areaPrivada: [p.area_privada_desde, p.area_privada_hasta],
      etapa: p.etapa,
      entrega: p.entrega,
      entregaPrecision: p.entrega_precision,
      parqueadero: p.parqueadero,
      parqueaderoPrecio: p.parqueadero_precio,
      precioFijo: p.precio_fijo,
      subsidioAnunciado: p.subsidio_anunciado,
      rotulos: [...p.rotulos].sort(),
      paginas: [...p.apariciones],
      discrepancias: [...new Set(discrepancias)],
      precioVerdadero: precioVerdadero(p, e.tarifas),
      ficha: fichaHonesta(p),
      espera: espera(p, esc.fechaCorte, esc.arriendo),
    };
  });

  const tope = precioMaximo(
    esc.hogar.ingresos,
    esc.hogar.inicial,
    esc.hogar.plazoAnos,
    esc.tasa.tasaEA,
  );
  const conPrecio = proyectos.map((p) => ({ id: p.id, alMenos: alMenosDe(p) }));
  const cerca = proyectos.filter(
    (p) => (p.region === "bogota" || p.region === "sabana") && esVivienda(p),
  );
  const a = alcanza(
    conPrecio.filter((x) => cerca.some((p) => p.id === x.id)),
    tope ?? 0,
  );

  const subsidio = esc.hogaresSubsidio.map((h) => {
    const topeHogar = precioMaximo(
      h.ingresos,
      esc.hogar.inicial,
      esc.hogar.plazoAnos,
      esc.tasa.tasaEA,
    );
    return {
      id: h.id,
      ingresos: h.ingresos,
      tope: topeHogar,
      porProyecto: cerca
        .filter((p) => alMenosDe(p) !== null)
        .map((p) => {
          const resultados = subsidiosPara(
            h.ingresos,
            {
              segmento: p.segmento,
              precio_desde: p.precioDesde,
              region: p.region,
            },
            e.programas,
            topeVis(String(p.ciudad), e.tarifas),
          );
          const mejor = mejorCaso(resultados);
          const alMenos = alMenosDe(p) as number;
          return {
            id: p.id,
            resultados: resultados.map(({ id, estado, motivos }) => ({
              id,
              estado,
              motivos,
            })),
            mejor,
            cabeSinSubsidio: topeHogar !== null && alMenos <= topeHogar,
            cabeConSubsidio:
              topeHogar !== null && alMenos - (mejor?.monto ?? 0) <= topeHogar,
          };
        }),
    };
  });

  const nuevoOUsadoPorZona = esc.usados.map((u) => ({
    zona: u.zona,
    resultado: nuevoOUsado(
      tope ?? 0,
      proyectos
        .filter((p) => p.region === u.zona && esVivienda(p))
        .map((p) => ({
          id: p.id,
          alMenos: alMenosDe(p),
          m2Privado:
            p.precioVerdadero.m2.base === "privada"
              ? p.precioVerdadero.m2.valor
              : null,
        })),
      u.anuncios,
      u.fuente,
    ),
  }));

  // Los proyectos que la maqueta muestra en la ficha: el más completo, el que más calla y uno que no cabe, de Bogotá.
  const bogota = proyectos.filter(
    (p) =>
      p.region === "bogota" &&
      esVivienda(p) &&
      p.precioVerdadero.estado === "calculado",
  );
  const porVerificables = [...bogota].sort(
    (x, y) =>
      y.ficha.verificables - x.ficha.verificables || (x.id < y.id ? -1 : 1),
  );
  const fuera = porVerificables.find((p) =>
    a.noCaben.some((n) => n.id === p.id),
  );
  // El completo enseña también «la espera»: el de más datos que imprime su fecha de entrega, si hay alguno.
  const completo =
    porVerificables.find((p) => p.espera.estado === "calculada") ??
    porVerificables[0];

  return {
    version: 1,
    edicion: e.edicion,
    fechaCorte: esc.fechaCorte,
    estadoEdicion: {
      hoy: estadoEdicion(e.edicion, esc.fechaCorte),
      despues: estadoEdicion(e.edicion, esc.fechaSinEdicion),
    },
    tasa: esc.tasa,
    hogar: { ...esc.hogar, tope },
    arriendo: esc.arriendo,
    proyectos,
    indice: indice(
      proyectos.map((p) => ({
        tipo: p.tipo,
        etapa: p.etapa,
        entrega: p.entrega,
        region: p.region,
        ciudad: p.ciudad,
        sector: p.sector,
        segmento: p.segmento,
        precio_desde: p.precioDesde,
        area_privada_desde: p.areaPrivada[0],
        en_conflicto: p.discrepancias,
      })),
      [
        { clave: "hasta_150", hasta: 150_000_000 },
        { clave: "hasta_tope_vis", hasta: topeVis("Bogotá", e.tarifas) },
        { clave: "hasta_400", hasta: 400_000_000 },
        { clave: "mas_de_400", hasta: null },
      ],
    ),
    alcanza: {
      tope,
      caben: a.caben.map((x) => x.id),
      noCaben: a.noCaben.map((x) => x.id),
      sinPrecio: a.sinPrecio.map((x) => x.id),
    },
    programas: e.programas
      .filter((p) => p.destino !== "arriendo")
      .map((p) => ({
        id: p.id,
        nombre: p.nombre,
        estado: p.estado,
        estadoAl: p.estado_al,
        normas: p.normas,
        consultado: p.consultado,
        minimo: p.monto.pesos_2026.minimo,
        maximo: p.monto.pesos_2026.maximo,
        restaAlPrecio: p.destino === "compra",
      })),
    escrituracion: e.tarifas.conceptos.map((c) => {
      const x = c as typeof c & { norma: string | null; consultado: string };
      return {
        id: x.id,
        norma: x.norma,
        estado: x.estado,
        consultado: x.consultado,
      };
    }),
    subsidio,
    nuevoOUsado: nuevoOUsadoPorZona,
    destacados: {
      completo: completo?.id ?? "",
      faltante: porVerificables[porVerificables.length - 1]?.id ?? "",
      fuera: fuera?.id ?? null,
    },
  };
}
