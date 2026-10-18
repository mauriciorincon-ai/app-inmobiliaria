// Los números de las alertas (S9, ADR 017), en un solo lugar. La base tiene los mismos por omisión; la ruta
// y el cron le pasan estos.

/** Lo que Brevo gratis permite enviar al día, para TODO (campañas, visitas y alertas). */
export const CUPO_BREVO_DIA = 300;

/**
 * Las alertas (confirmaciones y resúmenes) reservan cupo mientras lo enviado hoy esté por debajo de esto. Los
 * 50 que quedan son para los correos de la visita, que nunca se bloquean.
 */
export const TOPE_CORREOS_ALERTA_DIA = 250;

/** Tokens de «Mis alertas» que un teléfono puede consultar de una vez (la base corta en el mismo número). */
export const MAX_ALERTAS_TELEFONO = 20;

/**
 * El tope del día que usan la ruta y el cron. `ALERTAS_TOPE_DIA` solo se respeta con Brevo en simulacro (CI y
 * pruebas): con el servicio real, jamás se pasa del tope por un error de configuración.
 */
export function topeCorreosAlerta(
  enSimulacro: boolean,
  valor: string | undefined,
): number {
  if (!enSimulacro || valor === undefined) return TOPE_CORREOS_ALERTA_DIA;
  const n = Number(valor);
  return Number.isInteger(n) && n >= 0 ? n : TOPE_CORREOS_ALERTA_DIA;
}
