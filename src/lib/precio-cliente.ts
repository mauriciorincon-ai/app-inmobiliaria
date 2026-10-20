// Los comparables de precio desde el NAVEGADOR (S10): para el dueño que publica o edita su precio y para la fila
// «¿Está caro?» de Comparar. Una sola RPC pública (`comparables_precio`, la misma lista blanca de `/buscar`) por grupo
// de operación, tipo y localidad, que se recuerda mientras la página siga abierta. Nunca lanza hacia la pantalla: un
// fallo rechaza la promesa y se vuelve a intentar la próxima vez.
import { hoyBogota } from "@/engine/agenda/bogota";
import type { FuentePrecio } from "@/engine/precio/comparables";
import {
  claveGrupo,
  type GrupoComparables,
} from "@/engine/precio/presentacion";
import { crearClienteNavegador } from "@/lib/supabase/client";
import type { ComparablePrecio } from "@/lib/supabase/types";

const recordados = new Map<string, Promise<ComparablePrecio[]>>();

async function pedir(g: GrupoComparables): Promise<ComparablePrecio[]> {
  const { data, error } = await crearClienteNavegador().rpc(
    "comparables_precio",
    {
      p_operacion: g.operacion,
      p_tipo: g.tipo,
      p_localidad: g.localidad,
    },
  );
  if (error) throw new Error(error.code ?? "comparables");
  return data ?? [];
}

export function comparablesDe(
  g: GrupoComparables,
): Promise<ComparablePrecio[]> {
  const clave = claveGrupo(g);
  const hecha = recordados.get(clave);
  if (hecha) return hecha;
  const promesa = pedir(g);
  recordados.set(clave, promesa);
  promesa.catch(() => recordados.delete(clave));
  return promesa;
}

/** La fuente de los comparables en el navegador: los anuncios vivos de hoy (hora de Bogotá). */
export function fuenteHoy(nombre: string): FuentePrecio {
  return { nombre, fecha: hoyBogota(new Date()) };
}
