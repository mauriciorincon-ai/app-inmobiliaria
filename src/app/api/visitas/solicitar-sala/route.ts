import type { NextRequest } from "next/server";
import { z } from "zod";
import { FRANJAS_VISITA } from "@/engine/visita/franjas";
import {
  COOKIE_COMPRADOR,
  esSesionValida,
  hashSesion,
} from "@/engine/verificacion/sesion";
import { crearClienteAnon } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { avisarVisita } from "@/lib/visitas-correo";
import { cuerpoJson, json, responderError } from "@/lib/visitas-http";

// Pedir la visita a la sala de ventas de un proyecto nuevo (S13, maqueta 05). Igual que la de un anuncio: exige el WhatsApp
// verificado (la cookie de la sesión) y un correo, que sirve solo para los avisos de esta visita. El cuerpo NO lleva ingresos,
// presupuesto ni arriendo: la franja, el proyecto y el correo, nada más. La base decide si el proyecto está en la edición
// vigente hoy y devuelve UNA vez el token del enlace del comprador; el primer correo lo lleva.
export const runtime = "nodejs";

const cuerpoSchema = z.object({
  slug: z
    .string()
    .max(100)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  franja: z.enum(FRANJAS_VISITA),
  email: z.string().trim().max(254),
});

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({
    requestId,
    route: "/api/visitas/solicitar-sala",
  });

  const sesion = req.cookies.get(COOKIE_COMPRADOR)?.value;
  if (!esSesionValida(sesion)) return json(403, { error: "no_verificado" });
  const leido = cuerpoSchema.safeParse(await cuerpoJson(req));
  if (!leido.success) return json(400, { error: "validacion" });
  const b = leido.data;

  const { data, error } = await crearClienteAnon().rpc(
    "solicitar_visita_sala",
    {
      p_sesion_hash: await hashSesion(sesion),
      p_slug: b.slug,
      p_franja: b.franja,
      p_email: b.email,
    },
  );
  if (error || !data) {
    return responderError(error ?? {}, log, {
      requestId,
      evento: "visita_sala_solicitar_error",
    });
  }

  const aviso = await avisarVisita("solicitud", data.solicitud_id, {
    tokenComprador: data.token,
  });
  log.info({ evento: "solicitud_sala", estado: data.estado, ...aviso }, "ok");
  return json(200, { token: data.token, estado: data.estado });
}
