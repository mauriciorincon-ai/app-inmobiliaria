import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  COOKIE_COMPRADOR,
  esSesionValida,
  hashSesion,
} from "@/engine/verificacion/sesion";
import { crearClienteAnon } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { avisarVisita } from "@/lib/visitas-correo";
import { cuerpoJson, json, responderError } from "@/lib/visitas-http";

// Pedir una visita (S8). Exige el WhatsApp verificado (la cookie de la sesión) y un correo, que sirve solo
// para los avisos de esta visita (G-Plan 2a). La base decide si la solicitud queda pendiente o en espera
// («solo identificados») y devuelve UNA vez el token del enlace del comprador; el primer correo lo lleva.
export const runtime = "nodejs";

const PESOS_MAX = 900_000_000_000;

const cuerpoSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,120}$/),
  intencion: z.enum(["vivir", "invertir"]),
  presupuestoMin: z.number().int().min(0).max(PESOS_MAX).nullish(),
  presupuestoMax: z.number().int().min(0).max(PESOS_MAX).nullish(),
  formaPago: z
    .array(z.enum(["hipotecario", "ahorros", "venta_inmueble", "otro"]))
    .max(4)
    .default([]),
  mensaje: z.string().max(300).nullish(),
  email: z.string().trim().max(254),
});

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, route: "/api/visitas/solicitar" });

  const sesion = req.cookies.get(COOKIE_COMPRADOR)?.value;
  if (!esSesionValida(sesion)) return json(403, { error: "no_verificado" });
  const leido = cuerpoSchema.safeParse(await cuerpoJson(req));
  if (!leido.success) return json(400, { error: "validacion" });
  const b = leido.data;

  const { data, error } = await crearClienteAnon().rpc("solicitar_visita", {
    p_sesion_hash: await hashSesion(sesion),
    p_slug: b.slug,
    p_intencion: b.intencion,
    p_presupuesto_min: b.presupuestoMin ?? null,
    p_presupuesto_max: b.presupuestoMax ?? null,
    p_forma_pago: b.formaPago,
    p_mensaje: b.mensaje ?? null,
    p_email: b.email,
  });
  if (error || !data) {
    return responderError(error ?? {}, log, {
      requestId,
      evento: "visita_solicitar_error",
    });
  }

  const aviso = await avisarVisita("solicitud", data.solicitud_id, {
    tokenComprador: data.token,
  });
  log.info({ evento: "solicitud", estado: data.estado, ...aviso }, "ok");
  return json(200, { token: data.token, estado: data.estado });
}
