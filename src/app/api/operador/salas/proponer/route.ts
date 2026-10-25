import type { NextRequest } from "next/server";
import { z } from "zod";
import { validarHorarios } from "@/engine/agenda/horarios";
import { clienteDelOperador } from "@/lib/operador-sesion";
import { logger } from "@/lib/logger";
import { avisarVisita } from "@/lib/visitas-correo";
import { cuerpoJson, json, responderError } from "@/lib/visitas-http";

// El operador propone de 1 a 3 horarios para la visita a una sala de ventas (S13). Llegan en hora de Bogotá; el motor los
// valida y los convierte a instantes (los mismos que le exige la base al dueño de un anuncio). Después, el correo al comprador
// con su enlace. SOLO el operador: la sesión y la allowlist se comprueban aquí; la RPC es `authenticated`.
export const runtime = "nodejs";

const cuerpoSchema = z.object({
  solicitudId: z.uuid(),
  horarios: z
    .array(z.object({ fecha: z.string().max(10), hora: z.string().max(5) }))
    .max(3),
});

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({
    requestId,
    route: "/api/operador/salas/proponer",
  });

  const supabase = await clienteDelOperador();
  if (!supabase) return json(401, { error: "no_autorizado" });
  const leido = cuerpoSchema.safeParse(await cuerpoJson(req));
  if (!leido.success) return json(400, { error: "validacion" });
  const validos = validarHorarios(leido.data.horarios, new Date());
  if (!validos.ok) {
    return json(400, { error: "horarios", problema: validos.problema });
  }

  const { error } = await supabase.rpc("proponer_horarios_sala", {
    p_solicitud_id: leido.data.solicitudId,
    p_horarios: validos.horarios,
  });
  if (error) {
    return responderError(error, log, {
      requestId,
      evento: "sala_proponer_error",
    });
  }
  const aviso = await avisarVisita("horarios", leido.data.solicitudId);
  log.info(
    { evento: "horarios_sala", n: validos.horarios.length, ...aviso },
    "ok",
  );
  return json(200, { ok: true });
}
