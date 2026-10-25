// La bandera de precio (S15): el MISMO cálculo que ve el comprador en «¿Está caro?» (`rangoDePrecio`), corrido sobre todos
// los anuncios visibles. Cada anuncio se compara con los de su misma operación, tipo y localidad (lo que entrega
// `comparables_precio`), sin él mismo. Solo el estado «sospechoso» da bandera; «sin datos» (menos de 5 comparables) jamás.
import {
  rangoDePrecio,
  type Ambito,
  type FuentePrecio,
} from "@/engine/precio/comparables";

export type AnuncioPrecio = {
  id: string;
  slug: string;
  operacion: string;
  tipo: string;
  localidad: string | null;
  sector_codigo: string | null;
  area_m2: number;
  precio_esperado: number;
};

export type HallazgoPrecio = { porcentaje: number; n: number; ambito: Ambito };

export function banderasDePrecio(
  anuncios: readonly AnuncioPrecio[],
  fuente: FuentePrecio,
): Record<string, HallazgoPrecio> {
  const grupos = new Map<string, AnuncioPrecio[]>();
  for (const a of anuncios) {
    // Sin localidad no hay comparables (la ficha tampoco muestra un rango).
    if (!a.localidad) continue;
    const clave = `${a.operacion}|${a.tipo}|${a.localidad.toLowerCase()}`;
    const grupo = grupos.get(clave);
    if (grupo) grupo.push(a);
    else grupos.set(clave, [a]);
  }

  const hallazgos: Record<string, HallazgoPrecio> = {};
  for (const grupo of grupos.values()) {
    for (const a of grupo) {
      const rango = rangoDePrecio(a, grupo, fuente);
      if (rango.estado === "sospechoso") {
        hallazgos[a.id] = {
          porcentaje: rango.porcentaje,
          n: rango.n,
          ambito: rango.ambito,
        };
      }
    }
  }
  return hallazgos;
}
