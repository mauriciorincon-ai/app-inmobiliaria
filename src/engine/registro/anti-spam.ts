// Anti-spam determinista (código primero, sin IA). Dos señales puras que el endpoint evalúa antes
// de tocar la BD; complementan el rate limit por IP de la RPC.

/** Nombre del campo honeypot: invisible para humanos, tentador para bots que rellenan todo. */
export const CAMPO_HONEYPOT = "sitio_web";

/** Tiempo mínimo plausible para que un humano complete el flujo. Menos = probable bot. */
export const TIEMPO_MINIMO_MS = 5000;

/** `true` si el honeypot vino con contenido (un humano jamás lo ve, luego jamás lo llena). */
export function esBot(valorHoneypot: unknown): boolean {
  return typeof valorHoneypot === "string" && valorHoneypot.trim().length > 0;
}

/**
 * `true` si el formulario se completó sospechosamente rápido.
 * @param inicioMs  epoch ms en que se montó el flujo (lo pone el cliente).
 * @param ahoraMs   epoch ms de la recepción en el servidor.
 * @param umbralMs  umbral mínimo; el endpoint lo puede bajar por env (p. ej. 0 en e2e).
 */
export function demasiadoRapido(
  inicioMs: number,
  ahoraMs: number,
  umbralMs: number = TIEMPO_MINIMO_MS,
): boolean {
  if (!Number.isFinite(inicioMs) || !Number.isFinite(ahoraMs)) return true;
  return ahoraMs - inicioMs < umbralMs;
}
