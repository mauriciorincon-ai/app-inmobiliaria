import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { crearClienteServidor } from "@/lib/supabase/server";
import { plantillaPorId } from "@/engine/envios/plantillas";
import { enviarLote, type Destinatario } from "@/lib/brevo";
import { logger } from "@/lib/logger";
import { reportError } from "@/lib/observability";

// Envío de un lote de campaña. SOLO el operador (allowlist server-side sobre la sesión). Resuelve
// los destinatarios por RPC (obtener_lote), envía por Brevo (mock en CI/dev) y registra el lote.
export const runtime = "nodejs";

// Brevo free: 300/día. El operador envía por tandas; el panel muestra "quedan N hoy".
const TANDA_MAX = 300;

const bodySchema = z.object({
  plantilla: z.string(),
  filtro: z.enum(["sin-fotos", "sin-sello", "por-vencer"]),
});

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const t0 = Date.now();
  const log = logger.child({ requestId, route: "/api/envios" });

  try {
    const supabase = await crearClienteServidor();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const permitido =
      !!user?.email &&
      !!process.env.OPERADOR_EMAIL &&
      user.email.toLowerCase() === process.env.OPERADOR_EMAIL.toLowerCase();
    if (!permitido) {
      return json(401, { error: "no_autorizado" });
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json(400, { error: "validacion" });
    }
    const plantilla = plantillaPorId(parsed.data.plantilla);
    if (!plantilla) {
      return json(400, { error: "plantilla_invalida" });
    }

    const { data: lote, error: errLote } = await supabase.rpc("obtener_lote", {
      p_filtro: parsed.data.filtro,
    });
    if (errLote) {
      reportError("envios_lote_error", {
        requestId,
        code: errLote.code ?? "desconocido",
      });
      return json(500, { error: "servidor" });
    }

    const destinatarios: Destinatario[] = (lote ?? []).map((d) => ({
      email: d.email,
      nombre: d.nombre,
    }));
    const tanda = destinatarios.slice(0, TANDA_MAX);

    const urlApp = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const { enviados, mock } = await enviarLote(plantilla, tanda, urlApp);

    await supabase.rpc("registrar_envio", {
      p_plantilla: plantilla.id,
      p_filtro: parsed.data.filtro,
      p_destinatarios: tanda.length,
      p_enviados: enviados,
      p_estado: mock ? "mock" : "enviado",
    });

    log.info(
      {
        evento: "envio_ok",
        tanda: tanda.length,
        enviados,
        mock,
        ms: Date.now() - t0,
      },
      "lote enviado",
    );
    return json(200, {
      ok: true,
      total: destinatarios.length,
      tanda: tanda.length,
      enviados,
      mock,
      quedanHoy: Math.max(0, TANDA_MAX - tanda.length),
    });
  } catch (e) {
    reportError("envios_excepcion", {
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
