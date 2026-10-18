// La puerta del trabajo diario (S8, ADR 016): `POST /api/cron/diario` con `Authorization: Bearer
// <CRON_SECRET>`. La llaman el Cron Trigger del Worker (su `scheduled` invoca el `fetch` de la propia app) y,
// de respaldo, un workflow de GitHub. Sin secreto configurado —o con uno corto— no abre nunca.
import { igualesEnTiempoConstante } from "@/engine/verificacion/hash";
import { PREFIJO_BEARER } from "./peticion";

export const LARGO_MINIMO_SECRETO = 16;

export function autorizadoCron(
  cabecera: string | null | undefined,
  secreto: string | null | undefined,
): boolean {
  if (!secreto || secreto.length < LARGO_MINIMO_SECRETO || !cabecera)
    return false;
  if (!cabecera.startsWith(PREFIJO_BEARER)) return false;
  return igualesEnTiempoConstante(
    cabecera.slice(PREFIJO_BEARER.length),
    secreto,
  );
}
