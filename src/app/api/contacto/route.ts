import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { mensajeContacto } from "@/engine/verificacion/mensajes";
import {
  COOKIE_COMPRADOR,
  esSesionValida,
  hashSesion,
} from "@/engine/verificacion/sesion";
import { construirWaMe } from "@/engine/format/whatsapp";
import { IDIOMAS, IDIOMA_POR_DEFECTO } from "@/i18n/idiomas";
import { crearClienteAnon } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { reportError } from "@/lib/observability";

// Contactar a un dueño con un toque (S7, G-Plan 3a). El WhatsApp del dueño SOLO sale hacia una sesión
// de comprador verificada, y cada contacto queda registrado (lo ve el dueño en «Mi anuncio»). Devuelve
// el enlace `wa.me` con el mensaje precargado en el idioma de quien visita.
export const runtime = "nodejs";

const cuerpoSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,120}$/),
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
  const log = logger.child({ requestId, route: "/api/contacto" });

  const leido = cuerpoSchema.safeParse(await req.json().catch(() => null));
  if (!leido.success) return json(400, { error: "validacion" });
  const { slug } = leido.data;
  const idioma = leido.data.idioma ?? IDIOMA_POR_DEFECTO;

  const sesion = req.cookies.get(COOKIE_COMPRADOR)?.value;
  if (!esSesionValida(sesion)) return json(403, { error: "no_verificado" });
  const sesionHash = await hashSesion(sesion);
  const supabase = crearClienteAnon();

  const { data, error } = await supabase.rpc("registrar_contacto", {
    p_sesion_hash: sesionHash,
    p_slug: slug,
  });
  if (error) {
    reportError("contacto_error", {
      requestId,
      code: error.code ?? "desconocido",
    });
    log.error({ evento: "rpc_error", code: error.code }, "falló la RPC");
    return json(500, { error: "servidor" });
  }
  if (!data) {
    // Sin número: o la sesión no está verificada, o el anuncio ya no recibe contactos.
    const { data: estado } = await supabase.rpc("estado_verificacion", {
      p_sesion_hash: sesionHash,
    });
    return estado?.estado === "verificado"
      ? json(404, { error: "no_disponible" })
      : json(403, { error: "no_verificado" });
  }

  const { data: ficha } = await supabase.rpc("obtener_ficha", { p_slug: slug });
  const mensaje = mensajeContacto(
    ficha?.tipo ?? "inmueble",
    ficha?.barrio ?? "Bogotá",
    idioma,
  );
  log.info({ evento: "contacto" }, "registrado");
  return json(200, { href: construirWaMe(data.whatsapp, mensaje) });
}
