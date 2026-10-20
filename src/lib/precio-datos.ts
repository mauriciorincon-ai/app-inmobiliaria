// Lo que las páginas del servidor necesitan para «Decidir con números» (S10): los comparables de un anuncio y la tasa
// de vivienda con su fecha. Solo lecturas por las RPC públicas (la misma lista blanca de `/buscar`); un fallo nunca
// tumba la página: los comparables se vuelven `null` («no disponible») y la tasa cae a la última guardada o a la del repo.
import { hoyBogota } from "@/engine/agenda/bogota";
import {
  elegirTasa,
  type Tasa,
  type TasaElegida,
} from "@/engine/simulador/tasa";
import type { FuentePrecio } from "@/engine/precio/comparables";
import type { Operacion, TipoInmueble } from "@/engine/registro/schema";
import { crearClienteAnon } from "@/lib/supabase/server";
import type { ComparablePrecio } from "@/lib/supabase/types";

export async function cargarComparables(g: {
  operacion: Operacion;
  tipo: TipoInmueble;
  localidad: string;
}): Promise<ComparablePrecio[] | null> {
  try {
    const { data, error } = await crearClienteAnon().rpc("comparables_precio", {
      p_operacion: g.operacion,
      p_tipo: g.tipo,
      p_localidad: g.localidad,
    });
    return error ? null : (data ?? []);
  } catch {
    return null;
  }
}

/** La tasa a mostrar HOY: la última que guardó el cron o, si no hay ninguna, la del repo con su fecha. */
export async function cargarTasa(
  ahora: Date = new Date(),
): Promise<TasaElegida> {
  let guardada: Tasa | null = null;
  try {
    const { data } = await crearClienteAnon().rpc("tasa_vivienda");
    if (data) {
      guardada = {
        fechaCorte: data.fecha_corte,
        tasaEA: Number(data.tasa_ea),
        creditos: data.creditos,
        entidades: data.entidades,
        fuente: data.fuente,
      };
    }
  } catch {
    // sin base: se muestra la tasa del repo, con su fecha
  }
  return elegirTasa(guardada, hoyBogota(ahora));
}

/** De dónde y de cuándo salen los comparables: los anuncios vivos de hoy en Innmobiliaria. */
export function fuenteAnuncios(
  nombre: string,
  ahora: Date = new Date(),
): FuentePrecio {
  return { nombre, fecha: hoyBogota(ahora) };
}
