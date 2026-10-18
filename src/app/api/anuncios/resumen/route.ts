import type { NextRequest } from "next/server";
import { z } from "zod";
import { respuestaDeErrorGuardar } from "@/engine/alertas/errores";
import { TOPE_FAVORITOS } from "@/engine/guardados/favoritos";
import { crearClienteAnon } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { cuerpoJson, json, responderError } from "@/lib/visitas-http";

// Los datos públicos de una lista de anuncios (S9): los favoritos del teléfono y comparar los piden aquí, sin
// sesión. La misma lista blanca que `/buscar` (jamás dirección ni datos del vendedor), solo los visibles, en
// el orden pedido. Una ruta en vez del cliente de Supabase en el navegador: la página no carga esa librería.
export const runtime = "nodejs";

const cuerpoSchema = z.object({
  slugs: z.array(z.string().regex(/^[a-z0-9-]{3,120}$/)).max(TOPE_FAVORITOS),
});

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, route: "/api/anuncios/resumen" });
  const leido = cuerpoSchema.safeParse(await cuerpoJson(req));
  if (!leido.success) return json(400, { error: "validacion" });
  if (leido.data.slugs.length === 0) return json(200, { anuncios: [] });
  const { data, error } = await crearClienteAnon().rpc("resumen_anuncios", {
    p_slugs: leido.data.slugs,
  });
  if (error) {
    return responderError(
      error,
      log,
      { requestId, evento: "anuncios_resumen_error" },
      respuestaDeErrorGuardar,
    );
  }
  return json(200, { anuncios: data ?? [] });
}
