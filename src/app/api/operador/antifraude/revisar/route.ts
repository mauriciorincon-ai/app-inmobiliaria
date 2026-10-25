import { reportError } from "@/lib/observability";
import { revisarReglas } from "@/lib/antifraude";
import { clienteDelOperador } from "@/lib/operador-sesion";
import { logger } from "@/lib/logger";
import { json } from "@/lib/visitas-http";

// «Revisar reglas ahora» (S15): corre las cuatro reglas con la sesión del operador y devuelve las banderas abiertas por regla.
// El trabajo diario hace lo mismo con la llave del servidor.
export const runtime = "nodejs";

export async function POST() {
  const requestId = crypto.randomUUID();
  const log = logger.child({
    requestId,
    route: "/api/operador/antifraude/revisar",
  });

  const supabase = await clienteDelOperador();
  if (!supabase) return json(401, { error: "no_autorizado" });
  const conteo = await revisarReglas(supabase);
  if (!conteo) {
    reportError("antifraude_revisar_error", { requestId });
    log.error({ evento: "revisar_error" }, "falló la revisión");
    return json(500, { error: "servidor" });
  }
  log.info({ evento: "revisar", ...conteo }, "ok");
  return json(200, conteo);
}
