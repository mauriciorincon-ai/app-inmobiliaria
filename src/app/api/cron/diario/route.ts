import type { NextRequest } from "next/server";
import { autorizadoCron } from "@/engine/cron/autorizacion";
import { crearClienteServicio } from "@/lib/supabase/servicio";
import { logger } from "@/lib/logger";
import { reportError } from "@/lib/observability";
import { enviarResumenes, topeHoy } from "@/lib/alertas-correo";
import { avisarVisita } from "@/lib/visitas-correo";
import { json } from "@/lib/visitas-http";

// El trabajo diario (S8, ADR 016): a las 8:00 de Bogotá lo dispara el Cron Trigger del Worker (su
// `scheduled` llama a este mismo `fetch`) y, de respaldo, un workflow de GitHub. Protegido con
// `Authorization: Bearer <CRON_SECRET>`, comparado en tiempo constante.
//   1. Recordatorios: la base RECLAMA las visitas de mañana (y las de hoy que no han empezado) de forma
//      atómica, a lo sumo una vez cada una y nunca una cancelada; a cada una le llegan dos correos.
//   2. Resúmenes de las alertas (S9, ADR 017): DESPUÉS de los recordatorios, para que la visita nunca ceda su
//      sitio en el cupo diario de correos. La base reclama a lo sumo un resumen por alerta y día.
//   3. Purga Ley 1581: compradores sin verificar de 30 días y códigos vencidos de 7; alertas sin confirmar de 7
//      y dadas de baja de 30; enlaces, historial de precios y cupos viejos.
// Correr dos veces el mismo día no repite nada. Responde los conteos, sin datos de nadie. Con Brevo en
// simulacro (CI y pruebas), la cabecera `x-alertas-tope` cambia el tope del día para ESTA corrida.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const t0 = Date.now();
  const log = logger.child({ requestId, route: "/api/cron/diario" });

  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    log.error({ evento: "sin_secreto" }, "CRON_SECRET no configurado");
    return json(503, { error: "no_configurado" });
  }
  if (!autorizadoCron(req.headers.get("authorization"), secreto)) {
    log.warn({ evento: "no_autorizado" }, "rechazado");
    return json(401, { error: "no_autorizado" });
  }
  const supabase = crearClienteServicio();
  if (!supabase) {
    log.error(
      { evento: "sin_llave" },
      "SUPABASE_SERVICE_ROLE_KEY no configurada",
    );
    return json(503, { error: "no_configurado" });
  }

  const { data: ids, error } = await supabase.rpc("reclamar_recordatorios");
  if (error) {
    reportError("cron_recordatorios_error", {
      requestId,
      code: error.code ?? "desconocido",
    });
    log.error({ evento: "rpc_error", code: error.code }, "falló el reclamo");
    return json(500, { error: "servidor" });
  }
  let enviados = 0;
  let fallidos = 0;
  for (const id of ids ?? []) {
    const r = await avisarVisita("recordatorio", id);
    enviados += r.enviados;
    fallidos += r.fallidos;
  }

  const resumenes = await enviarResumenes(
    topeHoy(req.headers.get("x-alertas-tope")),
  );

  const { data: purga, error: errorPurga } =
    await supabase.rpc("purgar_vencidos");
  if (errorPurga) {
    reportError("cron_purga_error", {
      requestId,
      code: errorPurga.code ?? "desconocido",
    });
  }

  const salida = {
    recordatorios: (ids ?? []).length,
    correos: { enviados, fallidos },
    resumenes,
    purga: purga ?? null,
  };
  log.info(
    {
      evento: "cron",
      ...salida.correos,
      recordatorios: salida.recordatorios,
      resumenes,
      ms: Date.now() - t0,
    },
    "ok",
  );
  return json(errorPurga || !resumenes ? 500 : 200, salida);
}
