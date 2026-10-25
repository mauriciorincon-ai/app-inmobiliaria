import type { NextRequest } from "next/server";
import { keyThumb, urlPublicaFoto } from "@/lib/fotos-url";
import { clienteDelOperador } from "@/lib/operador-sesion";
import { logger } from "@/lib/logger";
import { json } from "@/lib/visitas-http";

// La miniatura PÚBLICA de una foto, servida desde el mismo origen (S15) para que el navegador del operador pueda leer sus
// píxeles y calcular la huella de las fotos subidas antes del sprint (el bucket público no manda CORS). Solo el operador, y
// solo keys con la forma exacta de una foto de la app: la ruta no es un proxy abierto.
export const runtime = "nodejs";

const KEY = /^[0-9a-f-]{36}\/[0-9a-f-]{36}-full\.webp$/;

export async function GET(req: NextRequest) {
  const log = logger.child({
    requestId: crypto.randomUUID(),
    route: "/api/operador/fotos/miniatura",
  });
  if (!(await clienteDelOperador())) return json(401, { error: "no_autorizado" });
  const key = req.nextUrl.searchParams.get("key") ?? "";
  if (!KEY.test(key)) return json(400, { error: "validacion" });

  try {
    const res = await fetch(urlPublicaFoto(keyThumb(key)), { cache: "no-store" });
    if (!res.ok) return json(404, { error: "no_disponible" });
    return new Response(await res.arrayBuffer(), {
      headers: {
        "content-type": "image/webp",
        "cache-control": "private, no-store",
      },
    });
  } catch {
    log.warn({ evento: "miniatura_error" }, "no se pudo leer");
    return json(502, { error: "no_disponible" });
  }
}
