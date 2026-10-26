import { NextResponse, type NextRequest } from "next/server";
import { extraerCodigo, hashCodigo } from "@/engine/verificacion/codigo";
import {
  CABECERA_FIRMA,
  firmaValida,
  tokenSuscripcionValido,
} from "@/engine/verificacion/firma";
import { extraerMensajes } from "@/engine/verificacion/webhook";
import { leerConTope } from "@/lib/cuerpo-con-tope";
import { crearClienteServicio } from "@/lib/supabase/servicio";
import type { ResultadoCanje } from "@/lib/supabase/types";
import { logger } from "@/lib/logger";
import { reportError } from "@/lib/observability";

// Webhook de WhatsApp (S7, ADR 015). Innmobiliaria SOLO RECIBE: aquí no se envía ningún mensaje.
//   GET  — saludo de suscripción de Meta (`hub.verify_token`) → devuelve `hub.challenge`.
//   POST — mensajes entrantes. La firma `X-Hub-Signature-256` (HMAC del cuerpo crudo con el secreto de
//          la app) se valida ANTES de interpretar el cuerpo. Un texto con un código vigente, enviado
//          desde el número que el comprador declaró, verifica su sesión. Los logs llevan conteos, jamás
//          números ni textos; la respuesta no dice qué pasó con cada mensaje.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Meta manda entregas pequeñas; un cuerpo más grande que esto no es suyo.
const LIMITE_CUERPO = 256 * 1024;

function vacio(status: number) {
  return new NextResponse(null, { status });
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (
    p.get("hub.mode") === "subscribe" &&
    tokenSuscripcionValido(
      p.get("hub.verify_token"),
      process.env.WHATSAPP_VERIFY_TOKEN,
    )
  ) {
    return new NextResponse(p.get("hub.challenge") ?? "", {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-content-type-options": "nosniff",
      },
    });
  }
  return vacio(403);
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const t0 = Date.now();
  const log = logger.child({ requestId, route: "/api/whatsapp/webhook" });

  const secreto = process.env.WHATSAPP_APP_SECRET;
  if (!secreto) {
    log.error({ evento: "sin_secreto" }, "WHATSAPP_APP_SECRET no configurado");
    return vacio(503);
  }
  const cuerpo = await leerConTope(req, LIMITE_CUERPO);
  if (cuerpo === null) return vacio(413);

  // 1. Firma sobre el cuerpo crudo. Sin firma válida, el cuerpo no se interpreta.
  if (!(await firmaValida(req.headers.get(CABECERA_FIRMA), secreto, cuerpo))) {
    log.warn({ evento: "firma_invalida", ms: Date.now() - t0 }, "rechazado");
    return vacio(401);
  }

  // 2. Solo ahora se lee: mensajes de texto con un código.
  let carga: unknown;
  try {
    carga = JSON.parse(cuerpo);
  } catch {
    return NextResponse.json({ ok: true });
  }
  const mensajes = extraerMensajes(carga);
  const conCodigo = mensajes.flatMap((m) => {
    const codigo = extraerCodigo(m.texto);
    return codigo ? [{ remitente: m.remitente, codigo }] : [];
  });
  if (conCodigo.length === 0) {
    log.info(
      { evento: "sin_codigos", mensajes: mensajes.length },
      "nada que canjear",
    );
    return NextResponse.json({ ok: true });
  }

  const supabase = crearClienteServicio();
  if (!supabase) {
    reportError("webhook_sin_llave_servidor", { requestId });
    log.error(
      { evento: "sin_llave" },
      "SUPABASE_SERVICE_ROLE_KEY no configurada",
    );
    return vacio(503);
  }

  // 3. Canje: un solo uso, del número declarado. La base decide; aquí solo se cuenta.
  const conteo: Record<ResultadoCanje, number> = {
    ok: 0,
    otro_numero: 0,
    nada: 0,
  };
  for (const m of conCodigo) {
    const { data, error } = await supabase.rpc("canjear_codigo_whatsapp", {
      p_codigo_hash: await hashCodigo(m.codigo),
      p_telefono: m.remitente,
    });
    if (error) {
      reportError("webhook_canje_error", {
        requestId,
        code: error.code ?? "desconocido",
      });
      log.error({ evento: "rpc_error", code: error.code }, "falló el canje");
      // 500: Meta reintenta la entrega más tarde.
      return vacio(500);
    }
    if (data && data in conteo) conteo[data] += 1;
  }
  log.info({ evento: "canje", ...conteo, ms: Date.now() - t0 }, "procesado");
  return NextResponse.json({ ok: true });
}
