import type { NextRequest } from "next/server";
import { z } from "zod";
import { respuestaDeErrorGuardar } from "@/engine/alertas/errores";
import { TOPE_FAVORITOS } from "@/engine/guardados/favoritos";
import { crearClienteAnon } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { cuerpoJson, json, responderError, sesionDe } from "@/lib/visitas-http";

// Los favoritos de la CUENTA (S9, ADR 017): solo con el WhatsApp verificado (la cookie httpOnly de la
// sesión). Sin verificar, los favoritos viven en el teléfono y esta ruta responde 403 (el navegador lo toma
// como «aún no»). GET: los de la cuenta · POST: fusionar los del teléfono, sin duplicar · DELETE: quitar uno.
export const runtime = "nodejs";

const SLUG = z.string().regex(/^[a-z0-9-]{3,120}$/);
const contexto = (requestId: string) => ({
  requestId,
  evento: "favoritos_error",
});

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, route: "/api/favoritos" });
  const sesion = await sesionDe(req);
  if (!sesion) return json(403, { error: "no_verificado" });
  const { data, error } = await crearClienteAnon().rpc("mis_favoritos", {
    p_sesion_hash: sesion,
  });
  if (error) {
    return responderError(
      error,
      log,
      contexto(requestId),
      respuestaDeErrorGuardar,
    );
  }
  return json(200, { slugs: data ?? [] });
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, route: "/api/favoritos" });
  const leido = z
    .object({ slugs: z.array(SLUG).max(TOPE_FAVORITOS) })
    .safeParse(await cuerpoJson(req));
  if (!leido.success) return json(400, { error: "validacion" });
  const sesion = await sesionDe(req);
  if (!sesion) return json(403, { error: "no_verificado" });
  const { data, error } = await crearClienteAnon().rpc("fusionar_favoritos", {
    p_sesion_hash: sesion,
    p_slugs: leido.data.slugs,
  });
  if (error) {
    return responderError(
      error,
      log,
      contexto(requestId),
      respuestaDeErrorGuardar,
    );
  }
  log.info({ evento: "favoritos_fusion", n: (data ?? []).length }, "ok");
  return json(200, { slugs: data ?? [] });
}

export async function DELETE(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, route: "/api/favoritos" });
  const leido = z.object({ slug: SLUG }).safeParse(await cuerpoJson(req));
  if (!leido.success) return json(400, { error: "validacion" });
  const sesion = await sesionDe(req);
  if (!sesion) return json(403, { error: "no_verificado" });
  const { error } = await crearClienteAnon().rpc("quitar_favorito", {
    p_sesion_hash: sesion,
    p_slug: leido.data.slug,
  });
  if (error) {
    return responderError(
      error,
      log,
      contexto(requestId),
      respuestaDeErrorGuardar,
    );
  }
  return json(200, { ok: true });
}
