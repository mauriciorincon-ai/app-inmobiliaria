import { NextResponse, type NextRequest } from "next/server";
import { construirPayload, registroSchema } from "@/engine/registro/schema";
import {
  CAMPO_HONEYPOT,
  TIEMPO_MINIMO_MS,
  demasiadoRapido,
  esBot,
} from "@/engine/registro/anti-spam";
import { crearClienteAnon } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { reportError } from "@/lib/observability";

// Runtime Node (NO edge): OpenNext/Workers lo ejecuta con nodejs_compat (ADR 001). El guard de
// panel vive en Server Components, no en middleware — así evitamos el "version trap" de Next 16.
export const runtime = "nodejs";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

// IP del cliente (Cloudflare o proxy) hasheada con pepper → minimización Ley 1581 (no guardamos IP cruda).
async function hashIp(req: NextRequest): Promise<string> {
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "desconocida";
  const data = new TextEncoder().encode(
    (process.env.RATE_LIMIT_PEPPER ?? "") + ip,
  );
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const t0 = Date.now();
  const log = logger.child({ requestId, route: "/api/registro" });

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json(400, { error: "payload_invalido" });
    }

    // Anti-spam: honeypot + time-trap. Respuesta "silenciosa" (200 sin insertar) para no darle
    // pistas al bot. Un humano jamás llena el honeypot ni completa el flujo en milisegundos.
    const umbral = Number(
      process.env.REGISTRO_MIN_MS ?? String(TIEMPO_MINIMO_MS),
    );
    if (
      esBot((body as Record<string, unknown>)[CAMPO_HONEYPOT]) ||
      demasiadoRapido(
        Number((body as Record<string, unknown>)._inicio),
        Date.now(),
        umbral,
      )
    ) {
      log.warn(
        { evento: "anti_spam", ms: Date.now() - t0 },
        "envío descartado",
      );
      return json(200, { ok: true });
    }

    // Re-validación server-side (defensa en profundidad: el cliente nunca es la única validación).
    const parsed = registroSchema.safeParse(body);
    if (!parsed.success) {
      log.warn(
        { evento: "validacion", ms: Date.now() - t0 },
        "payload rechazado",
      );
      return json(400, { error: "validacion" });
    }

    const payload = construirPayload(parsed.data);
    // En e2e todos los envíos vienen de localhost (misma IP) → el rate limit por IP los frenaría.
    // Con DISABLE_RATE_LIMIT=1 pasamos ip_hash=null y la RPC salta el rate limit. En prod nunca se activa.
    const ipHash =
      process.env.DISABLE_RATE_LIMIT === "1" ? null : await hashIp(req);
    const supabase = crearClienteAnon();

    const { data, error } = await supabase.rpc("registrar_fundador", {
      p_nombre: payload.nombre,
      p_whatsapp: payload.whatsapp,
      p_email: payload.email,
      p_ciudad: payload.ciudad,
      p_zona: payload.zona,
      p_operacion: payload.operacion,
      p_tipo: payload.tipo,
      p_barrio: payload.barrio,
      p_direccion: payload.direccion,
      p_area: payload.area,
      p_habitaciones: payload.habitaciones,
      p_precio: payload.precio,
      p_consentimiento: payload.consentimiento,
      p_ip_hash: ipHash,
    });

    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("rate_limit")) {
        log.warn(
          { evento: "rate_limit", ms: Date.now() - t0 },
          "límite alcanzado",
        );
        return json(429, { error: "rate_limit" });
      }
      if (msg.includes("consentimiento")) {
        return json(400, { error: "consentimiento" });
      }
      reportError("registro_rpc_error", {
        requestId,
        code: error.code ?? "desconocido",
      });
      log.error(
        { evento: "rpc_error", code: error.code, ms: Date.now() - t0 },
        "fallo la RPC",
      );
      return json(500, { error: "servidor" });
    }

    // registrar_fundador devuelve { id, slug, token }. El token va al cliente EN CLARO una sola
    // vez (nunca se loggea) para armar el magic link; en BD solo vive su hash.
    log.info({ evento: "registro_ok", ms: Date.now() - t0 }, "registro creado");
    return json(200, {
      ok: true,
      id: data?.id,
      slug: data?.slug,
      token: data?.token,
    });
  } catch (e) {
    reportError("registro_excepcion", {
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
