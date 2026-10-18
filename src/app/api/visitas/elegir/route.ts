import type { NextRequest } from "next/server";
import { z } from "zod";
import { crearClienteAnon } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { avisarVisita, solicitudDeToken } from "@/lib/visitas-correo";
import { cuerpoJson, json, responderError } from "@/lib/visitas-http";

// El comprador confirma uno de los horarios, o dice «ninguno me sirve» (`horarioId: null`), desde el enlace
// de su solicitud (S8, maqueta 06). Confirmada, les llega el correo a los dos; con «ninguno», al dueño.
export const runtime = "nodejs";

const cuerpoSchema = z.object({
  token: z.string().length(43),
  horarioId: z.uuid().nullable(),
});

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, route: "/api/visitas/elegir" });

  const leido = cuerpoSchema.safeParse(await cuerpoJson(req));
  if (!leido.success) return json(400, { error: "validacion" });
  const { token, horarioId } = leido.data;

  const { error } = await crearClienteAnon().rpc("elegir_horario", {
    p_token: token,
    p_horario_id: horarioId,
  });
  if (error) {
    return responderError(error, log, {
      requestId,
      evento: "visita_elegir_error",
    });
  }
  const id = await solicitudDeToken(token);
  const aviso = id
    ? await avisarVisita(horarioId ? "confirmada" : "ninguno", id, {
        tokenComprador: token,
      })
    : { enviados: 0, fallidos: 0 };
  log.info({ evento: horarioId ? "confirmada" : "ninguno", ...aviso }, "ok");
  return json(200, { ok: true });
}
