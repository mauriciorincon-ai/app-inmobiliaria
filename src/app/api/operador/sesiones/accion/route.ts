import type { NextRequest } from "next/server";
import { z } from "zod";
import { respuestaDeErrorAntifraude } from "@/engine/antifraude/errores";
import { horarioDeSesion } from "@/engine/antifraude/sesion";
import { clienteDelOperador } from "@/lib/operador-sesion";
import { logger } from "@/lib/logger";
import { cuerpoJson, json, responderError } from "@/lib/visitas-http";

// Lo que el operador hace con una sesión de fotos (S15): agendarla (fecha y hora de Bogotá), darla por hecha o cancelarla.
// SOLO el operador: la sesión y la allowlist se comprueban aquí; las RPC son `authenticated`. Nada sale solo hacia el dueño:
// el operador le escribe desde su WhatsApp con el texto que la cola ya trae escrito.
export const runtime = "nodejs";

const cuerpoSchema = z.discriminatedUnion("cambio", [
  z.object({
    cambio: z.literal("agendar"),
    sesionId: z.uuid(),
    fecha: z.string().max(10),
    hora: z.string().max(5),
  }),
  z.object({
    cambio: z.enum(["hecha", "cancelar"]),
    sesionId: z.uuid(),
  }),
]);

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({
    requestId,
    route: "/api/operador/sesiones/accion",
  });

  const supabase = await clienteDelOperador();
  if (!supabase) return json(401, { error: "no_autorizado" });
  const leido = cuerpoSchema.safeParse(await cuerpoJson(req));
  if (!leido.success) return json(400, { error: "validacion" });
  const b = leido.data;

  let error;
  if (b.cambio === "agendar") {
    const horario = horarioDeSesion(b.fecha, b.hora, new Date());
    if (!horario.ok) {
      return json(400, { error: "horario", problema: horario.problema });
    }
    ({ error } = await supabase.rpc("agendar_sesion_fotos", {
      p_sesion_id: b.sesionId,
      p_para: horario.iso,
    }));
  } else if (b.cambio === "hecha") {
    ({ error } = await supabase.rpc("marcar_sesion_hecha", {
      p_sesion_id: b.sesionId,
    }));
  } else {
    ({ error } = await supabase.rpc("cancelar_sesion_fotos_operador", {
      p_sesion_id: b.sesionId,
    }));
  }
  if (error) {
    return responderError(
      error,
      log,
      { requestId, evento: "sesion_fotos_accion_error" },
      respuestaDeErrorAntifraude,
    );
  }
  log.info({ evento: "sesion_fotos_accion", cambio: b.cambio }, "ok");
  return json(200, { ok: true });
}
