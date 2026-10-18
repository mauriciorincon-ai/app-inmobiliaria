// Piezas comunes de las rutas de la visita y la identidad (S8): respuestas JSON sin caché, lectura del
// cuerpo con tope de tamaño y la traducción de un error de RPC a HTTP. Lo que se registra es el código,
// jamás el cuerpo ni los datos de la persona.
import { NextResponse, type NextRequest } from "next/server";
import { respuestaDeError, type ErrorRpc } from "@/engine/visita/errores";
import type { Logger } from "@/lib/logger";
import { reportError } from "@/lib/observability";

const LIMITE_CUERPO = 8 * 1024;

export function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

/** El cuerpo JSON de la petición, o null si no es JSON o es más grande de lo razonable. */
export async function cuerpoJson(req: NextRequest): Promise<unknown> {
  if (Number(req.headers.get("content-length") ?? "0") > LIMITE_CUERPO)
    return null;
  const texto = await req.text().catch(() => "");
  if (!texto || texto.length > LIMITE_CUERPO) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

export function responderError(
  error: ErrorRpc,
  log: Logger,
  contexto: { requestId: string; evento: string },
) {
  const { status, codigo } = respuestaDeError(error);
  if (status >= 500) {
    reportError(contexto.evento, {
      requestId: contexto.requestId,
      code: error.code ?? "desconocido",
    });
    log.error({ evento: "rpc_error", code: error.code }, "falló la RPC");
  } else {
    log.warn({ evento: "rechazado", codigo }, "rechazado");
  }
  return json(status, { error: codigo });
}
