// El proyecto procesado ↔ la fila de la base (S12, F1). Puro. La base guarda SOLO lo procesado (migración 15): cada campo
// numérico que el aviso no dice es `NULL`, el que no se alcanzó a leer queda además en `ilegibles`, y los campos que dos
// páginas de la revista contradicen quedan en `en_conflicto`. `deFila` rehace el `ProyectoUnico` del S11 para que los
// motores sigan siendo los mismos: lo que se publica lo calcula el motor, jamás la base.
import { ILEGIBLE, NO_LO_DICE } from "./edicion.ts";
import {
  aleatorioConSemilla,
  normalizarClave,
  type ProyectoUnico,
  type Region,
} from "./lectura.ts";

/** Lo que devuelve `nuevos_publicados` por proyecto (y lo que recibe `cargar_edicion`). */
export type FilaProyecto = {
  slug: string;
  clave: string;
  nombre: string;
  constructora: string;
  tipo: string;
  ciudad: string;
  sector: string;
  region: Region;
  segmento: string;
  precio_desde: number | null;
  area_construida_desde: number | null;
  area_construida_hasta: number | null;
  area_privada_desde: number | null;
  area_privada_hasta: number | null;
  etapa: string;
  entrega: string;
  entrega_precision: string | null;
  parqueadero: string;
  parqueadero_precio: number | null;
  precio_fijo: string;
  subsidio_anunciado: string;
  rotulos: string[];
  apariciones: number[];
  ilegibles: string[];
  en_conflicto: string[];
};

/**
 * Las ÚNICAS claves de un proyecto que el anónimo puede leer (la lista blanca de `nuevos_publicados`, migración 15).
 * La prueba unitaria la iguala a lo que produce `aFila`; el humo anónimo la exige en lo que devuelve la base.
 */
export const CLAVES_FILA = [
  "slug",
  "clave",
  "nombre",
  "constructora",
  "tipo",
  "ciudad",
  "sector",
  "region",
  "segmento",
  "precio_desde",
  "area_construida_desde",
  "area_construida_hasta",
  "area_privada_desde",
  "area_privada_hasta",
  "etapa",
  "entrega",
  "entrega_precision",
  "parqueadero",
  "parqueadero_precio",
  "precio_fijo",
  "subsidio_anunciado",
  "rotulos",
  "apariciones",
  "ilegibles",
  "en_conflicto",
] as const satisfies readonly (keyof FilaProyecto)[];

// Los campos numéricos: en los «desde» el aviso puede callar («no lo dice»); en los «hasta», `null` es «no es un rango».
type Desde = "precio_desde" | "area_construida_desde" | "area_privada_desde";
type Hasta = "area_construida_hasta" | "area_privada_hasta";
type Numerico = Desde | Hasta;

/** El proyecto unido → su fila. Los campos numéricos sin valor son `NULL`; los ilegibles se anotan aparte. */
export function aFila(p: ProyectoUnico, slug: string): FilaProyecto {
  const ilegibles: Numerico[] = [];
  const num = (campo: Numerico): number | null => {
    const v = p[campo];
    if (typeof v === "number") return v;
    if (v === ILEGIBLE) ilegibles.push(campo);
    return null;
  };
  const fila: FilaProyecto = {
    slug,
    clave: p.clave,
    nombre: String(p.nombre),
    constructora: String(p.constructora),
    tipo: String(p.tipo),
    ciudad: String(p.ciudad),
    sector: String(p.sector),
    region: p.region,
    segmento: String(p.segmento),
    precio_desde: num("precio_desde"),
    area_construida_desde: num("area_construida_desde"),
    area_construida_hasta: num("area_construida_hasta"),
    area_privada_desde: num("area_privada_desde"),
    area_privada_hasta: num("area_privada_hasta"),
    etapa: String(p.etapa),
    entrega: String(p.entrega),
    entrega_precision: p.entrega_precision,
    parqueadero: String(p.parqueadero),
    parqueadero_precio: p.parqueadero_precio,
    precio_fijo: String(p.precio_fijo),
    subsidio_anunciado: String(p.subsidio_anunciado),
    rotulos: [...p.rotulos],
    apariciones: [...p.apariciones],
    ilegibles,
    en_conflicto: [...(p.en_conflicto ?? [])],
  };
  return fila;
}

/** La fila → el proyecto unido del S11 (la ida y vuelta está probada: ningún dato se pierde ni se inventa). */
export function deFila(f: FilaProyecto): ProyectoUnico {
  const desde = (campo: Desde) => {
    const v = f[campo];
    if (v !== null) return v;
    return f.ilegibles.includes(campo) ? ILEGIBLE : NO_LO_DICE;
  };
  const hasta = (campo: Hasta) => {
    const v = f[campo];
    if (v !== null) return v;
    return f.ilegibles.includes(campo) ? ILEGIBLE : null;
  };
  return {
    nombre: f.nombre,
    constructora: f.constructora,
    tipo: f.tipo,
    ciudad: f.ciudad,
    sector: f.sector,
    segmento: f.segmento,
    precio_desde: desde("precio_desde"),
    area_construida_desde: desde("area_construida_desde"),
    area_construida_hasta: hasta("area_construida_hasta"),
    area_privada_desde: desde("area_privada_desde"),
    area_privada_hasta: hasta("area_privada_hasta"),
    etapa: f.etapa,
    entrega: f.entrega,
    entrega_precision: f.entrega_precision,
    parqueadero: f.parqueadero,
    parqueadero_precio: f.parqueadero_precio,
    precio_fijo: f.precio_fijo,
    subsidio_anunciado: f.subsidio_anunciado,
    rotulos: f.rotulos,
    apariciones: f.apariciones,
    region: f.region,
    clave: f.clave,
    en_conflicto: f.en_conflicto,
  } as ProyectoUnico;
}

// --- el identificador legible de cada proyecto -------------------------------------------------------------------------
function slugDe(texto: string): string {
  // El corte a 80 no puede dejar un guion al final: el slug de la tabla no lo admite.
  return normalizarClave(texto)
    .replace(/ /g, "-")
    .slice(0, 80)
    .replace(/-+$/, "");
}

/**
 * Un slug único por proyecto dentro de la edición: el nombre; si choca, el nombre y la constructora; si aún choca, un
 * número. Determinista: el orden es el de la clave, no el de lectura. Un nombre ilegible usa la página de su aparición.
 */
export function asignarSlugs(
  proyectos: readonly Pick<
    ProyectoUnico,
    "clave" | "nombre" | "constructora" | "apariciones"
  >[],
): Map<string, string> {
  const usados = new Set<string>();
  const salida = new Map<string, string>();
  const ordenados = [...proyectos].sort((a, b) =>
    a.clave < b.clave ? -1 : a.clave > b.clave ? 1 : 0,
  );
  for (const p of ordenados) {
    const nombre =
      p.nombre === NO_LO_DICE || p.nombre === ILEGIBLE
        ? `proyecto-p${p.apariciones[0]}`
        : slugDe(String(p.nombre));
    const base = nombre || `proyecto-p${p.apariciones[0]}`;
    const constructora =
      p.constructora === NO_LO_DICE || p.constructora === ILEGIBLE
        ? ""
        : slugDe(String(p.constructora));
    let candidato = base;
    if (usados.has(candidato) && constructora) {
      candidato = `${base}-${constructora}`.slice(0, 100).replace(/-+$/, "");
    }
    let n = 2;
    const raiz = candidato;
    while (usados.has(candidato)) candidato = `${raiz}-${n++}`;
    usados.add(candidato);
    salida.set(p.clave, candidato);
  }
  return salida;
}

// --- la muestra de revisión (G5) -----------------------------------------------------------------------------------------
/**
 * La muestra que el usuario revisa antes de publicar: `n` proyectos al azar con semilla DECLARADA (por omisión, el número
 * de la edición). Misma semilla y misma edición, misma muestra en cualquier máquina. Devuelve sus claves, en orden.
 */
export function muestraDeRevision(
  claves: readonly string[],
  semilla: number,
  n = 5,
): string[] {
  const azar = aleatorioConSemilla(semilla);
  const barajadas = [...claves].sort();
  for (let i = barajadas.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [barajadas[i], barajadas[j]] = [barajadas[j], barajadas[i]];
  }
  return barajadas.slice(0, Math.min(n, barajadas.length)).sort();
}

// --- lo que se manda a la base -------------------------------------------------------------------------------------------
export type EdicionParaCargar = {
  numero: number;
  nombre: string;
  desde: string;
  hasta: string;
  paginas: number;
  muestra_claves: string[];
  muestra_semilla: number;
  proyectos: FilaProyecto[];
};

/** La carga completa de una edición: las filas con su slug y la muestra que habrá que revisar para publicarla. */
export function cargaDeEdicion(
  meta: { numero: number; nombre: string; desde: string; hasta: string },
  paginas: number,
  proyectos: readonly ProyectoUnico[],
  semilla: number = meta.numero,
): EdicionParaCargar {
  const slugs = asignarSlugs(proyectos);
  return {
    ...meta,
    paginas,
    muestra_claves: muestraDeRevision(
      proyectos.map((p) => p.clave),
      semilla,
    ),
    muestra_semilla: semilla,
    proyectos: proyectos.map((p) => aFila(p, slugs.get(p.clave) as string)),
  };
}
