import type { NextRequest } from "next/server";
import { z } from "zod";
import { clienteDelOperador } from "@/lib/operador-sesion";
import { logger } from "@/lib/logger";
import { cuerpoJson, json } from "@/lib/visitas-http";

// Guarda las huellas que el navegador del operador calculó para las fotos ya subidas (S15). Una foto que ya tiene huella no
// cambia (la base solo escribe donde no hay). Devuelve cuántas se guardaron.
export const runtime = "nodejs";

const cuerpoSchema = z.object({
  huellas: z
    .array(
      z.object({
        fotoId: z.uuid(),
        huella: z.string().regex(/^[0-9a-f]{16}$/),
      }),
    )
    .min(1)
    .max(50),
});

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, route: "/api/operador/fotos/huellas" });

  const supabase = await clienteDelOperador();
  if (!supabase) return json(401, { error: "no_autorizado" });
  const leido = cuerpoSchema.safeParse(await cuerpoJson(req));
  if (!leido.success) return json(400, { error: "validacion" });

  let guardadas = 0;
  for (const h of leido.data.huellas) {
    const { error } = await supabase.rpc("registrar_huella_operador", {
      p_foto_id: h.fotoId,
      p_huella: h.huella,
    });
    if (!error) guardadas++;
  }
  log.info({ evento: "huellas", guardadas }, "ok");
  return json(200, { guardadas });
}
