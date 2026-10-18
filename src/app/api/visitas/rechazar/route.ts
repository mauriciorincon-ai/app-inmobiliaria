import type { NextRequest } from "next/server";
import { z } from "zod";
import { crearClienteAnon } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { avisarVisita } from "@/lib/visitas-correo";
import { cuerpoJson, json, responderError } from "@/lib/visitas-http";

// El dueño dice que no a una solicitud que aún no se confirmó (S8). Al comprador le llega el correo.
export const runtime = "nodejs";

const cuerpoSchema = z.object({
  token: z.string().length(43),
  solicitudId: z.uuid(),
});

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, route: "/api/visitas/rechazar" });

  const leido = cuerpoSchema.safeParse(await cuerpoJson(req));
  if (!leido.success) return json(400, { error: "validacion" });

  const { error } = await crearClienteAnon().rpc("rechazar_solicitud", {
    p_token: leido.data.token,
    p_solicitud_id: leido.data.solicitudId,
  });
  if (error) {
    return responderError(error, log, {
      requestId,
      evento: "visita_rechazar_error",
    });
  }
  const aviso = await avisarVisita("rechazada", leido.data.solicitudId);
  log.info({ evento: "rechazada", ...aviso }, "ok");
  return json(200, { ok: true });
}
