// La petición que el `scheduled` del Worker le hace al `fetch` de la propia app (S8, ADR 016). Sin imports:
// `custom-worker.ts` lo empaqueta wrangler fuera de Next.
export const RUTA_CRON = "/api/cron/diario";
export const PREFIJO_BEARER = "Bearer ";

export function peticionCron(secreto: string, base: string): Request {
  return new Request(new URL(RUTA_CRON, base), {
    method: "POST",
    headers: { authorization: `${PREFIJO_BEARER}${secreto}` },
  });
}
