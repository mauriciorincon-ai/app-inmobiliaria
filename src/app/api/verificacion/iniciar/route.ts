import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { MINUTOS_CODIGO } from "@/engine/verificacion/codigo";
import { mensajeCodigo } from "@/engine/verificacion/mensajes";
import {
  COOKIE_COMPRADOR,
  esSesionValida,
  generarSesion,
  hashSesion,
  VIGENCIA_SESION_SEGUNDOS,
} from "@/engine/verificacion/sesion";
import { construirWaMe, normalizarWhatsapp } from "@/engine/format/whatsapp";
import { IDIOMAS, IDIOMA_POR_DEFECTO } from "@/i18n/idiomas";
import { hashIp } from "@/lib/ip-hash";
import { crearClienteAnon } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { reportError } from "@/lib/observability";

// Pide un código de verificación (S7, ADR 015). Exige el consentimiento Ley 1581. Crea la sesión del
// comprador (cookie httpOnly; la base guarda solo su hash) y devuelve el código UNA vez, con el enlace
// `wa.me` hacia el número de Innmobiliaria y el código ya escrito. El número vive en una variable del
// Worker leída en tiempo de ejecución (`WHATSAPP_NUMERO`), jamás en el repo ni en el bundle.
export const runtime = "nodejs";

const cuerpoSchema = z.object({
  nombre: z.string().trim().min(2).max(80),
  whatsapp: z.string().max(30),
  consentimiento: z.literal(true),
  idioma: z.enum(IDIOMAS).optional(),
});

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const t0 = Date.now();
  const log = logger.child({ requestId, route: "/api/verificacion/iniciar" });

  const numero = process.env.WHATSAPP_NUMERO;
  if (!numero) {
    log.error({ evento: "sin_numero" }, "WHATSAPP_NUMERO no configurado");
    return json(503, { error: "no_disponible" });
  }

  const leido = cuerpoSchema.safeParse(await req.json().catch(() => null));
  if (!leido.success) return json(400, { error: "validacion" });
  const telefono = normalizarWhatsapp(leido.data.whatsapp);
  if (!telefono) return json(400, { error: "telefono" });
  const idioma = leido.data.idioma ?? IDIOMA_POR_DEFECTO;

  const previa = req.cookies.get(COOKIE_COMPRADOR)?.value;
  const sesion = esSesionValida(previa) ? previa : generarSesion();
  // En e2e todo viene de localhost: con DISABLE_RATE_LIMIT=1 cada pedido cuenta como una IP distinta
  // (el tope por sesión sigue activo). En producción nunca se activa.
  const ipHash =
    process.env.DISABLE_RATE_LIMIT === "1"
      ? `e2e-${crypto.randomUUID()}`
      : await hashIp(req);

  const { data: codigo, error } = await crearClienteAnon().rpc(
    "iniciar_verificacion",
    {
      p_sesion_hash: await hashSesion(sesion),
      p_nombre: leido.data.nombre,
      p_telefono: telefono,
      p_idioma: idioma,
      p_ip_hash: ipHash,
    },
  );
  if (error || !codigo) {
    if (error?.message?.includes("demasiados_intentos")) {
      log.warn({ evento: "tope", ms: Date.now() - t0 }, "demasiados códigos");
      return json(429, { error: "demasiados_intentos" });
    }
    if (error?.code === "23514") return json(400, { error: "validacion" });
    reportError("verificacion_iniciar_error", {
      requestId,
      code: error?.code ?? "sin_codigo",
    });
    log.error({ evento: "rpc_error", code: error?.code }, "falló la RPC");
    return json(500, { error: "servidor" });
  }

  const res = json(200, {
    codigo,
    href: construirWaMe(numero, mensajeCodigo(codigo, idioma)),
    // El número al que el comprador escribe: público por naturaleza (se muestra en la ayuda por si el
    // enlace no abre WhatsApp). Sigue viviendo solo en la variable del Worker.
    numero,
    segundos: MINUTOS_CODIGO * 60,
  });
  res.cookies.set(COOKIE_COMPRADOR, sesion, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: VIGENCIA_SESION_SEGUNDOS,
  });
  log.info({ evento: "codigo_emitido", ms: Date.now() - t0 }, "ok");
  return res;
}
