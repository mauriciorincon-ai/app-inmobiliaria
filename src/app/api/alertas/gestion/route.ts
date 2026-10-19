import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  enlaceBusqueda,
  filtrosDeAlerta,
  resumenCriterios,
} from "@/engine/alertas/criterios";
import { respuestaDeErrorGuardar } from "@/engine/alertas/errores";
import { MAX_ALERTAS_TELEFONO } from "@/engine/alertas/topes";
import { IDIOMAS } from "@/i18n/idiomas";
import type { AlertaMia } from "@/lib/supabase/types";
import { crearClienteAnon } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { cuerpoJson, json, responderError } from "@/lib/visitas-http";

// «Mis alertas» sin cuenta (S9, ADR 017), todo con tokens que viajan en el CUERPO (jamás en la URL):
//   · confirmar: el token que llegó por correo (`/alertas#c=…`);
//   · mias: los tokens de gestionar que guarda este teléfono (máx. 20) → las alertas, sin correo ni tokens,
//     con sus criterios ya escritos en el idioma de quien mira y el enlace a `/buscar` (así el navegador no
//     carga los diccionarios);
//   · gestionar: pausar, reanudar, qué se avisa o borrar, con un token de gestionar.
export const runtime = "nodejs";

const TOKEN = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

const cuerpoSchema = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("confirmar"), token: TOKEN }),
  z.object({
    accion: z.literal("mias"),
    tokens: z.array(TOKEN).max(MAX_ALERTAS_TELEFONO),
    idioma: z.enum(IDIOMAS).default("es"),
  }),
  z.object({
    accion: z.literal("gestionar"),
    token: TOKEN,
    cambio: z.enum([
      "pausar",
      "reanudar",
      "bajas_si",
      "bajas_no",
      "nuevos_si",
      "nuevos_no",
      "borrar",
    ]),
  }),
]);

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, route: "/api/alertas/gestion" });

  const leido = cuerpoSchema.safeParse(await cuerpoJson(req));
  if (!leido.success) return json(400, { error: "validacion" });
  const b = leido.data;
  const supabase = crearClienteAnon();
  const contexto = { requestId, evento: `alerta_${b.accion}_error` };

  if (b.accion === "confirmar") {
    const { data, error } = await supabase.rpc("confirmar_alerta", {
      p_token: b.token,
    });
    if (error || !data) {
      return responderError(
        error ?? {},
        log,
        contexto,
        respuestaDeErrorGuardar,
      );
    }
    log.info({ evento: "alerta_confirmada", estado: data.estado }, "ok");
    return json(200, data);
  }

  if (b.accion === "mias") {
    if (b.tokens.length === 0) return json(200, { alertas: [] });
    const { data, error } = await supabase.rpc("obtener_alertas", {
      p_tokens: b.tokens,
    });
    if (error) {
      return responderError(error, log, contexto, respuestaDeErrorGuardar);
    }
    const alertas: AlertaMia[] = (data ?? []).map((a) => {
      const filtros = filtrosDeAlerta(a);
      return {
        ...a,
        resumen: resumenCriterios(filtros, b.idioma),
        buscar: enlaceBusqueda("", filtros),
      };
    });
    return json(200, { alertas });
  }

  const { data, error } = await supabase.rpc("gestionar_alerta", {
    p_token: b.token,
    p_accion: b.cambio,
  });
  if (error || !data) {
    return responderError(error ?? {}, log, contexto, respuestaDeErrorGuardar);
  }
  log.info({ evento: "alerta_gestionada", cambio: b.cambio }, "ok");
  return json(200, data);
}
