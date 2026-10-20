// «Datos de la zona» (S10, maqueta 09, ADR 018). Puro. Tres cifras, cada una con su fuente y su fecha, y que NUNCA se
// mezclan entre sí:
//   · el m² mediano de OFERTA del barrio (o la localidad, con su rótulo): misma operación y tipo, sin filtro de área,
//     con el mismo recorte de atípicos y el mismo mínimo de 5 que el rango; con menos, no hay cifra;
//   · la oferta activa: cuántos anuncios vivos hay hoy en el barrio y en la localidad (un conteo es un hecho, no
//     necesita mínimo);
//   · el valor de referencia del TERRENO por m² (Catastro Bogotá, por manzana): se recibe hecho, porque el archivo de
//     Catastro vive solo en el servidor (`@/engine/zonas/valor-referencia`). Jamás entra al rango de oferta.
import {
  MINIMO_COMPARABLES,
  percentil,
  precioPorM2,
  recortarAtipicos,
  type Ambito,
  type Comparable,
  type FuentePrecio,
} from "./comparables";

export type ValorReferenciaTerreno = {
  /** Mediana de los valores de referencia de las manzanas del barrio, en pesos por m² de terreno. */
  mediana: number;
  manzanas: number;
  vigencia: number;
  fuente: string;
  licencia: string;
};

export type DatosZona = {
  medianaOferta: {
    ambito: Ambito;
    n: number;
    medianaM2: number;
    fuente: FuentePrecio;
  } | null;
  ofertaActiva: { barrio: number | null; localidad: number };
  terreno: ValorReferenciaTerreno | null;
};

export function datosDeZona(
  sectorCodigo: string | null,
  comparables: readonly Comparable[],
  fuente: FuentePrecio,
  terreno: ValorReferenciaTerreno | null,
): DatosZona {
  const validos = comparables.filter(
    (c) => c.area_m2 > 0 && c.precio_esperado > 0,
  );
  const delBarrio = sectorCodigo
    ? validos.filter((c) => c.sector_codigo === sectorCodigo)
    : [];
  const m2 = (lista: readonly Comparable[]) =>
    recortarAtipicos(
      lista.map((c) => precioPorM2(c.precio_esperado, c.area_m2)),
    );

  const barrio = m2(delBarrio);
  const localidad = m2(validos);
  let medianaOferta: DatosZona["medianaOferta"] = null;
  if (barrio.length >= MINIMO_COMPARABLES) {
    medianaOferta = {
      ambito: "barrio",
      n: barrio.length,
      medianaM2: Math.round(percentil(barrio, 0.5)),
      fuente,
    };
  } else if (localidad.length >= MINIMO_COMPARABLES) {
    medianaOferta = {
      ambito: "localidad",
      n: localidad.length,
      medianaM2: Math.round(percentil(localidad, 0.5)),
      fuente,
    };
  }

  return {
    medianaOferta,
    ofertaActiva: {
      barrio: sectorCodigo ? delBarrio.length : null,
      localidad: validos.length,
    },
    terreno,
  };
}
