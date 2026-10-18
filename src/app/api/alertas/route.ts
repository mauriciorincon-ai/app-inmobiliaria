import type { NextRequest } from "next/server";
import { z } from "zod";
import { NOMBRE_MAX, filtrosDeConsulta } from "@/engine/alertas/criterios";
import { respuestaDeErrorGuardar } from "@/engine/alertas/errores";
import {
  CAMPO_HONEYPOT,
  TIEMPO_MINIMO_MS,
  demasiadoRapido,
  esBot,
} from "@/engine/registro/anti-spam";
import { IDIOMAS } from "@/i18n/idiomas";
import { crearAlertaYConfirmar } from "@/lib/alertas-correo";
import { hashIp } from "@/lib/ip-hash";
import { logger } from "@/lib/logger";
import { cuerpoJson, json, responderError } from "@/lib/visitas-http";

// Crear una alerta por correo (S9, ADR 017). No pide cuenta ni sesión (maqueta, decisión 2), pero NADA se
// avisa hasta confirmar el correo: aquí nace sin confirmar y sale solo el correo de confirmación. Al
// navegador vuelve únicamente el token de gestionar (para «Mis alertas» en este teléfono); el de confirmar
// viaja solo por correo. Los criterios son los de `/buscar`: llegan como su consulta («op=venta&max=…»).
export const runtime = "nodejs";

const cuerpoSchema = z.object({
  consulta: z.string().max(6000),
  nombre: z.string().trim().min(1).max(NOMBRE_MAX),
  email: z.string().trim().max(254),
  nuevos: z.boolean(),
  bajas: z.boolean(),
  consentimiento: z.boolean(),
  idioma: z.enum(IDIOMAS),
  _inicio: z.number().optional(),
  [CAMPO_HONEYPOT]: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, route: "/api/alertas" });

  const leido = cuerpoSchema.safeParse(await cuerpoJson(req));
  if (!leido.success) return json(400, { error: "validacion" });
  const b = leido.data;

  // Anti-spam del registro (S1): honeypot y tiempo mínimo. Respuesta silenciosa: no se le dan pistas al bot.
  const umbral = Number(
    process.env.REGISTRO_MIN_MS ?? String(TIEMPO_MINIMO_MS),
  );
  if (
    esBot(b[CAMPO_HONEYPOT]) ||
    demasiadoRapido(Number(b._inicio), Date.now(), umbral)
  ) {
    log.warn({ evento: "anti_spam" }, "envío descartado");
    return json(200, { ok: true });
  }

  const filtros = filtrosDeConsulta(b.consulta);
  if (!filtros) return json(400, { error: "sin_criterios" });

  const r = await crearAlertaYConfirmar({
    email: b.email,
    idioma: b.idioma,
    nombre: b.nombre,
    filtros,
    nuevos: b.nuevos,
    bajas: b.bajas,
    consentimiento: b.consentimiento,
    ipHash: await hashIp(req),
  });
  if (!r.ok) {
    if (!r.error) {
      log.error({ evento: "sin_llave" }, "llave del servidor no configurada");
      return json(503, { error: "no_configurado" });
    }
    return responderError(
      r.error,
      log,
      { requestId, evento: "alerta_crear_error" },
      respuestaDeErrorGuardar,
    );
  }
  log.info({ evento: "alerta_creada", enviado: r.enviado }, "ok");
  // Creada pero sin correo de confirmación: no se le dice «revisa tu correo» a quien no va a recibir nada.
  if (!r.enviado) return json(502, { error: "correo_no_enviado" });
  return json(200, { ok: true, gestionar: r.gestionar });
}
