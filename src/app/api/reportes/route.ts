import type { NextRequest } from "next/server";
import { z } from "zod";
import { respuestaDeErrorAntifraude } from "@/engine/antifraude/errores";
import { MOTIVOS_REPORTE, UMBRALES } from "@/engine/antifraude/reglas";
import {
  COOKIE_COMPRADOR,
  esSesionValida,
  hashSesion,
} from "@/engine/verificacion/sesion";
import { crearClienteAnon } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { cuerpoJson, json, responderError } from "@/lib/visitas-http";

// Reportar un anuncio (S15, maqueta 12). Exige el WhatsApp verificado (la cookie de la sesión): un reporte por anuncio y
// persona, y un tope diario, los cuenta la base. El reporte NO cambia lo que ve nadie: entra a la cola del operador. Al dueño
// jamás le llega quién reportó. El registro no lleva el detalle ni los motivos: solo el resultado.
export const runtime = "nodejs";

const cuerpoSchema = z.object({
  slug: z
    .string()
    .max(120)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  motivos: z.array(z.enum(MOTIVOS_REPORTE)).min(1).max(MOTIVOS_REPORTE.length),
  detalle: z.string().trim().max(UMBRALES.detalleMax).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, route: "/api/reportes" });

  const sesion = req.cookies.get(COOKIE_COMPRADOR)?.value;
  if (!esSesionValida(sesion)) return json(403, { error: "no_verificado" });
  const leido = cuerpoSchema.safeParse(await cuerpoJson(req));
  if (!leido.success) return json(400, { error: "validacion" });
  const b = leido.data;

  const { error } = await crearClienteAnon().rpc("reportar_anuncio", {
    p_sesion_hash: await hashSesion(sesion),
    p_slug: b.slug,
    p_motivos: b.motivos,
    p_detalle: b.detalle || null,
  });
  if (error) {
    return responderError(
      error,
      log,
      { requestId, evento: "reporte_error" },
      respuestaDeErrorAntifraude,
    );
  }
  log.info({ evento: "reporte" }, "ok");
  return json(200, { ok: true });
}
