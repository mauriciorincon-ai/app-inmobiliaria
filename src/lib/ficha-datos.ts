import { crearClienteAnon } from "@/lib/supabase/server";
import type { FichaData } from "@/lib/supabase/types";

// La ficha pública por su slug (RPC `obtener_ficha`, lista blanca de columnas), para la ficha y para su «¿Está caro?».
export async function cargarFicha(slug: string): Promise<FichaData | null> {
  const { data } = await crearClienteAnon().rpc("obtener_ficha", {
    p_slug: slug,
  });
  return data;
}
