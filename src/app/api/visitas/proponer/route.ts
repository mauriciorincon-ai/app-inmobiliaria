import type { NextRequest } from "next/server";
import { z } from "zod";
import { validarHorarios } from "@/engine/agenda/horarios";
import { crearClienteAnon } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { avisarVisita } from "@/lib/visitas-correo";
import { cuerpoJson, json, responderError } from "@/lib/visitas-http";

// El dueño propone de 1 a 3 horarios (S8, maqueta 06). Llega con su token de «Mi anuncio» y las fechas y
// horas en hora de Bogotá; el motor las valida y las convierte a instantes; la base vuelve a validar y
// comprueba que la solicitud sea de su anuncio. Después, el correo al comprador con su enlace.
export const runtime = "nodejs";

const cuerpoSchema = z.object({
  token: z.string().length(43),
  solicitudId: z.uuid(),
  horarios: z
    .array(z.object({ fecha: z.string().max(10), hora: z.string().max(5) }))
    .max(3),
});

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, route: "/api/visitas/proponer" });

  const leido = cuerpoSchema.safeParse(await cuerpoJson(req));
  if (!leido.success) return json(400, { error: "validacion" });
  const validos = validarHorarios(leido.data.horarios, new Date());
  if (!validos.ok) {
    return json(400, { error: "horarios", problema: validos.problema });
  }

  const { error } = await crearClienteAnon().rpc("proponer_horarios", {
    p_token: leido.data.token,
    p_solicitud_id: leido.data.solicitudId,
    p_horarios: validos.horarios,
  });
  if (error) {
    return responderError(error, log, {
      requestId,
      evento: "visita_proponer_error",
    });
  }
  const aviso = await avisarVisita("horarios", leido.data.solicitudId);
  log.info({ evento: "horarios", n: validos.horarios.length, ...aviso }, "ok");
  return json(200, { ok: true });
}
