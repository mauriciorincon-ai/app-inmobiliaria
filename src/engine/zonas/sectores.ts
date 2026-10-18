// Catálogo de barrios de Bogotá: los 1 230 sectores del dataset «Sector catastral» de Catastro Bogotá
// (UAECD, CC BY 4.0, versión 09.26). `sectores.json` lo genera scripts/sectores/convertir.mjs y es el
// espejo EXACTO de la tabla `sectores` de la migración 20261019000001: [código, nombre, localidad,
// tipo]. El wizard ofrece estos barrios en un select y la BD fija `inmuebles.sector_codigo` por
// coincidencia de nombre + localidad. El anuncio se ubica por el barrio, jamás por un punto.

import catalogo from "./sectores.json";

export type TipoSector = "urbano" | "rural" | "mixto";

export type Sector = {
  codigo: string;
  nombre: string;
  localidad: string;
  tipo: TipoSector;
};

const FILAS = catalogo as unknown as ReadonlyArray<
  readonly [string, string, string, TipoSector]
>;

export const SECTORES: readonly Sector[] = FILAS.map(
  ([codigo, nombre, localidad, tipo]) => ({ codigo, nombre, localidad, tipo }),
);

const POR_CODIGO = new Map(SECTORES.map((s) => [s.codigo, s]));

// Llave de comparación de un barrio: sin tildes ni eñe, minúsculas, solo letras y números. Espejo de
// `public.clave_barrio` en la BD.
export function claveBarrio(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function sectorPorCodigo(codigo: string): Sector | undefined {
  return POR_CODIGO.get(codigo);
}

// Los barrios que el wizard ofrece en una localidad: urbanos y mixtos (los rurales puros son veredas),
// en orden alfabético del español.
export function sectoresDeLocalidad(localidad: string): Sector[] {
  return SECTORES.filter(
    (s) => s.localidad === localidad && s.tipo !== "rural",
  ).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

// El barrio del catálogo que corresponde a un texto escrito a mano (mismo criterio que el trigger de
// la BD). Solo dentro de la localidad: «San Pedro» existe en varias.
export function sectorPorNombre(
  localidad: string,
  nombre: string,
): Sector | undefined {
  const k = claveBarrio(nombre);
  return SECTORES.find(
    (s) => s.localidad === localidad && claveBarrio(s.nombre) === k,
  );
}
