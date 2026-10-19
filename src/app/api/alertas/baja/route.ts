import type { NextRequest } from "next/server";
import { respuestaDeErrorGuardar } from "@/engine/alertas/errores";
import { crearClienteAnon } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { cuerpoJson, json, responderError } from "@/lib/visitas-http";

// La baja en un clic (S9, ADR 017): sin sesión, sin cookie, sin cuenta. Dos caminos:
//   · la página `/baja#t=…` hace este POST con `{ token }` en el cuerpo al abrirse;
//   · la cabecera `List-Unsubscribe` del correo (RFC 8058): el cliente de correo hace un POST a
//     `/api/alertas/baja?t=…` con el cuerpo `List-Unsubscribe=One-Click`. Es la ÚNICA ruta que acepta un token
//     en la URL, y es el de BAJA: su único poder es dar de baja esa alerta (ADR 017, decisión 4).
// Repetirla no hace nada nuevo. Jamás se registra el token.
export const runtime = "nodejs";

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

async function tokenDe(req: NextRequest): Promise<string | null> {
  const enUrl = req.nextUrl.searchParams.get("t");
  if (enUrl !== null) return TOKEN.test(enUrl) ? enUrl : null;
  const cuerpo = await cuerpoJson(req);
  const token =
    cuerpo && typeof cuerpo === "object"
      ? (cuerpo as Record<string, unknown>).token
      : null;
  return typeof token === "string" && TOKEN.test(token) ? token : null;
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, route: "/api/alertas/baja" });

  const token = await tokenDe(req);
  if (!token) return json(400, { error: "validacion" });

  const { data, error } = await crearClienteAnon().rpc("baja_alerta", {
    p_token: token,
  });
  if (error || !data) {
    return responderError(
      error ?? {},
      log,
      { requestId, evento: "alerta_baja_error" },
      respuestaDeErrorGuardar,
    );
  }
  log.info({ evento: "alerta_baja" }, "ok");
  return json(200, data);
}
