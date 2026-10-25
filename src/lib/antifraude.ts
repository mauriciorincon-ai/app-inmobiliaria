// Correr las cuatro reglas antifraude (S15): las tres de la base (matrícula, teléfono y foto, en `revisar_banderas`) y la de
// precio en TypeScript, con el MISMO motor de «¿Está caro?» sobre los anuncios visibles. La llaman el botón del operador
// (con su sesión) y el trabajo diario (con la llave del servidor, que ya tiene). Devuelve las banderas ABIERTAS por regla,
// o null si algo falló (nada queda a medias: cada regla reemplaza solo sus propias banderas abiertas).
import type { SupabaseClient } from "@supabase/supabase-js";
import { banderasDePrecio } from "@/engine/antifraude/precio";
import type { Regla } from "@/engine/antifraude/reglas";
import { enIdioma } from "@/i18n/textos";
import { fuenteAnuncios } from "@/lib/precio-datos";
import type { Database } from "@/lib/supabase/types";
import { PRECIO } from "@/textos/precio";

export type ConteoBanderas = Record<Regla, number>;

export async function revisarReglas(
  supabase: Pick<SupabaseClient<Database>, "rpc">,
  ahora: Date = new Date(),
): Promise<ConteoBanderas | null> {
  const { data: enBase, error } = await supabase.rpc("revisar_banderas");
  if (error || !enBase) return null;

  const { data: anuncios, error: errorAnuncios } = await supabase.rpc(
    "anuncios_para_precio",
  );
  if (errorAnuncios || !anuncios) return null;
  const hallazgos = banderasDePrecio(
    anuncios,
    fuenteAnuncios(enIdioma(PRECIO.fuente, "es"), ahora),
  );
  const { data: precio, error: errorPrecio } = await supabase.rpc(
    "guardar_banderas_precio",
    { p_hallazgos: hallazgos },
  );
  if (errorPrecio || typeof precio !== "number") return null;

  return { precio, ...enBase };
}
