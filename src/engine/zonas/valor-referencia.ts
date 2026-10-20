// El valor de referencia del TERRENO por barrio (S10, ADR 018): el archivo que genera scripts/valor-referencia/convertir.mjs
// a partir del dataset abierto de Catastro Bogotá (UAECD, CC BY 4.0). ~23 KB: SOLO lo importa el servidor (la ficha y
// «¿Está caro?» se renderizan allá); `tests/unit/valor-referencia.test.ts` falla si un componente "use client" lo importa.
import documento from "./valor-referencia.json";
import type { ValorReferenciaTerreno } from "@/engine/precio/zona";

type Fila = readonly [string, number, number];

const POR_CODIGO = new Map(
  (documento.filas as unknown as Fila[]).map((f) => [f[0], f] as const),
);

export const ATRIBUCION_CATASTRO = {
  fuente: documento.fuente,
  licencia: documento.licencia,
  vigencia: documento.vigencia,
};

/** El valor del barrio, o null si el barrio no tiene manzanas con valor (rurales, parques…). */
export function valorReferenciaDe(
  sectorCodigo: string | null | undefined,
): ValorReferenciaTerreno | null {
  if (!sectorCodigo) return null;
  const fila = POR_CODIGO.get(sectorCodigo);
  if (!fila) return null;
  return {
    mediana: fila[1],
    manzanas: fila[2],
    vigencia: documento.vigencia,
    fuente: documento.fuente,
    licencia: documento.licencia,
  };
}
