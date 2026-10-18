import type { NextRequest } from "next/server";
import { z } from "zod";
import { crearClienteAnon } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { avisarVisita, solicitudDeToken } from "@/lib/visitas-correo";
import { cuerpoJson, json, responderError } from "@/lib/visitas-http";

// Cancelar (S8). El comprador, desde el enlace de su solicitud: retira la solicitud o cancela la visita
// confirmada. El dueño, desde «Mi anuncio»: cancela una visita confirmada. Mientras no haya pasado la hora.
// Al otro le llega el correo.
export const runtime = "nodejs";

const cuerpoSchema = z.discriminatedUnion("quien", [
  z.object({ quien: z.literal("comprador"), token: z.string().length(43) }),
  z.object({
    quien: z.literal("dueno"),
    token: z.string().length(43),
    solicitudId: z.uuid(),
  }),
]);

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, route: "/api/visitas/cancelar" });

  const leido = cuerpoSchema.safeParse(await cuerpoJson(req));
  if (!leido.success) return json(400, { error: "validacion" });
  const b = leido.data;
  const supabase = crearClienteAnon();

  const { error } =
    b.quien === "comprador"
      ? await supabase.rpc("cancelar_visita_comprador", { p_token: b.token })
      : await supabase.rpc("cancelar_visita_dueno", {
          p_token: b.token,
          p_solicitud_id: b.solicitudId,
        });
  if (error) {
    return responderError(error, log, {
      requestId,
      evento: "visita_cancelar_error",
    });
  }
  const id =
    b.quien === "comprador" ? await solicitudDeToken(b.token) : b.solicitudId;
  const aviso = id
    ? await avisarVisita(
        b.quien === "comprador"
          ? "cancelada_por_comprador"
          : "cancelada_por_dueno",
        id,
      )
    : { enviados: 0, fallidos: 0 };
  log.info({ evento: "cancelada", quien: b.quien, ...aviso }, "ok");
  return json(200, { ok: true });
}
