import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  evaluarFoto,
  FULL_MAX_BYTES,
  THUMB_MAX_BYTES,
  MAX_FOTOS,
} from "@/engine/fotos/gate";
import { esTokenValido } from "@/engine/token/token";
import { presignPut } from "@/lib/r2";
import { keyThumb } from "@/lib/fotos-url";
import { crearClienteAnon } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { reportError } from "@/lib/observability";

// Runtime Node (NO edge): aws4fetch usa WebCrypto y OpenNext/Workers lo ejecuta con
// nodejs_compat (ADR 001/003). Firma dos PUT presigned (full + thumb) tras validar el token y
// re-evaluar el gate server-side. NO sube nada: el navegador hace el PUT directo a R2.
export const runtime = "nodejs";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

const cuerpoSchema = z.object({
  token: z.string().refine(esTokenValido, "token"),
  ancho: z.number().int().positive(),
  alto: z.number().int().positive(),
  tipo: z.string(),
  bytesFull: z.number().int().positive().max(FULL_MAX_BYTES),
  bytesThumb: z.number().int().positive().max(THUMB_MAX_BYTES),
});

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const t0 = Date.now();
  const log = logger.child({ requestId, route: "/api/fotos/presign" });

  try {
    const body = await req.json().catch(() => null);
    const parsed = cuerpoSchema.safeParse(body);
    if (!parsed.success) {
      log.warn(
        { evento: "validacion", ms: Date.now() - t0 },
        "payload rechazado",
      );
      return json(400, { error: "validacion" });
    }
    const { token, ancho, alto, tipo, bytesFull } = parsed.data;

    // Re-evalúa el gate en el servidor (defensa en profundidad: el cliente ya lo hizo).
    const gate = evaluarFoto({ tipo, bytes: bytesFull, ancho, alto });
    if (!gate.ok) {
      return json(400, { error: "gate", razon: gate.razon });
    }

    // Resuelve el token → inmueble y verifica el límite de fotos, todo en la RPC.
    const supabase = crearClienteAnon();
    const { data: anuncio, error } = await supabase.rpc("obtener_mi_anuncio", {
      p_token: token,
    });
    if (error) {
      reportError("presign_rpc_error", { requestId, code: error.code ?? "?" });
      log.error({ evento: "rpc_error", ms: Date.now() - t0 }, "fallo la RPC");
      return json(500, { error: "servidor" });
    }
    if (!anuncio) {
      return json(401, { error: "token_invalido" });
    }
    if (anuncio.fotos.length >= MAX_FOTOS) {
      return json(409, { error: "limite_fotos" });
    }

    // Key atada al inmueble del token (la RPC registrar_foto la re-valida por prefijo).
    const keyFull = `${anuncio.id}/${crypto.randomUUID()}-full.webp`;
    const [urlFull, urlThumb] = await Promise.all([
      presignPut(keyFull),
      presignPut(keyThumb(keyFull)),
    ]);

    log.info({ evento: "presign_ok", ms: Date.now() - t0 }, "urls firmadas");
    return json(200, { ok: true, key: keyFull, urlFull, urlThumb });
  } catch (e) {
    reportError("presign_excepcion", {
      requestId,
      tipo: e instanceof Error ? e.name : "desconocido",
    });
    log.error(
      { evento: "excepcion", ms: Date.now() - t0 },
      "excepción no controlada",
    );
    return json(500, { error: "servidor" });
  }
}
