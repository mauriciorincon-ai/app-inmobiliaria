import type { NextRequest } from "next/server";
import { hoyBogota } from "@/engine/agenda/bogota";
import { validarDatosIdentidad } from "@/engine/identidad/datos";
import {
  COOKIE_COMPRADOR,
  esSesionValida,
  hashSesion,
} from "@/engine/verificacion/sesion";
import { identificarComprador } from "@/lib/identidad";
import { logger } from "@/lib/logger";
import { reportError } from "@/lib/observability";
import { cuerpoJson, json } from "@/lib/visitas-http";

// Identificarse con la cédula (S8, ADR 016). Exige una sesión de comprador con el WhatsApp verificado y el
// consentimiento. La cédula, la fecha de expedición y el nombre se validan, viajan al proveedor (o al
// simulador) y se DESCARTAN: ni la base ni los registros los ven. La base reserva la consulta ANTES de
// llamar al proveedor: sin cupo, no hay llamada. Responde siempre 200 con el resultado que la página pinta.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const t0 = Date.now();
  const log = logger.child({ requestId, route: "/api/identidad" });

  const sesion = req.cookies.get(COOKIE_COMPRADOR)?.value;
  if (!esSesionValida(sesion)) return json(403, { error: "no_verificado" });

  const validado = validarDatosIdentidad(
    await cuerpoJson(req),
    hoyBogota(new Date()),
  );
  if (!validado.ok)
    return json(400, { error: "validacion", campo: validado.campo });

  try {
    const resultado = await identificarComprador(
      await hashSesion(sesion),
      validado.datos,
    );
    log.info({ evento: "identidad", resultado, ms: Date.now() - t0 }, "ok");
    return json(200, { resultado });
  } catch (e) {
    reportError("identidad_error", {
      requestId,
      code: e instanceof Error ? e.message.slice(0, 40) : "desconocido",
    });
    log.error(
      { evento: "error", ms: Date.now() - t0 },
      "falló la identificación",
    );
    return json(200, { resultado: "no_disponible" });
  }
}
