import type { NextRequest } from "next/server";
import { z } from "zod";
import { clienteDelOperador } from "@/lib/operador-sesion";
import { logger } from "@/lib/logger";
import { avisarVisita } from "@/lib/visitas-correo";
import { cuerpoJson, json, responderError } from "@/lib/visitas-http";

// El operador cancela una visita ya confirmada a una sala (S13). Después, el correo al comprador. SOLO el operador: la sesión y
// la allowlist se comprueban aquí; la RPC es `authenticated`.
export const runtime = "nodejs";

const cuerpoSchema = z.object({ solicitudId: z.uuid() });

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({
    requestId,
    route: "/api/operador/salas/cancelar",
  });

  const supabase = await clienteDelOperador();
  if (!supabase) return json(401, { error: "no_autorizado" });
  const leido = cuerpoSchema.safeParse(await cuerpoJson(req));
  if (!leido.success) return json(400, { error: "validacion" });

  const { error } = await supabase.rpc("cancelar_visita_sala", {
    p_solicitud_id: leido.data.solicitudId,
  });
  if (error) {
    return responderError(error, log, {
      requestId,
      evento: "sala_cancelar_error",
    });
  }
  const aviso = await avisarVisita(
    "cancelada_por_dueno",
    leido.data.solicitudId,
  );
  log.info({ evento: "cancelar_sala", ...aviso }, "ok");
  return json(200, { ok: true });
}
