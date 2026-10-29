import type { NextRequest } from "next/server";
import { z } from "zod";
import { respuestaDeErrorAntifraude } from "@/engine/antifraude/errores";
import { RAZONES_DESCARTE, UMBRALES } from "@/engine/antifraude/reglas";
import { clienteDelOperador } from "@/lib/operador-sesion";
import { logger } from "@/lib/logger";
import { cuerpoJson, json, responderError } from "@/lib/visitas-http";

// Lo que el operador hace con un anuncio de la cola antifraude (S15): pausar, reactivar, pedir el CTL o descartar con razón.
// SOLO el operador: la sesión y la allowlist se comprueban aquí; las RPC son `authenticated`. Nada sale solo hacia el dueño:
// el operador le escribe desde su WhatsApp con el texto que la cola ya trae escrito.
export const runtime = "nodejs";

const cuerpoSchema = z.discriminatedUnion("cambio", [
  z.object({
    // S16: «cerrar_ctl» saca de la cola un CTL pedido que el dueño no entregó.
    cambio: z.enum(["pausar", "reactivar", "pedir_ctl", "cerrar_ctl"]),
    inmuebleId: z.uuid(),
  }),
  z.object({
    cambio: z.literal("descartar"),
    inmuebleId: z.uuid(),
    razon: z.enum(RAZONES_DESCARTE),
    nota: z.string().trim().max(UMBRALES.notaMax).nullable().optional(),
  }),
]);

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({
    requestId,
    route: "/api/operador/antifraude/accion",
  });

  const supabase = await clienteDelOperador();
  if (!supabase) return json(401, { error: "no_autorizado" });
  const leido = cuerpoSchema.safeParse(await cuerpoJson(req));
  if (!leido.success) return json(400, { error: "validacion" });
  const b = leido.data;

  const { error } =
    b.cambio === "descartar"
      ? await supabase.rpc("descartar_revision", {
          p_inmueble_id: b.inmuebleId,
          p_razon: b.razon,
          p_nota: b.nota || null,
        })
      : await supabase.rpc(
          b.cambio === "pausar"
            ? "pausar_anuncio"
            : b.cambio === "reactivar"
              ? "reactivar_anuncio"
              : b.cambio === "pedir_ctl"
                ? "pedir_ctl"
                : "cerrar_ctl_pedido",
          { p_inmueble_id: b.inmuebleId },
        );
  if (error) {
    return responderError(
      error,
      log,
      { requestId, evento: "antifraude_accion_error" },
      respuestaDeErrorAntifraude,
    );
  }
  log.info({ evento: "antifraude_accion", cambio: b.cambio }, "ok");
  return json(200, { ok: true });
}
