// Los horarios que propone el dueño (S8, maqueta 06): de 1 a 3, distintos, en el futuro (a más de una
// hora), a no más de 60 días y en horas razonables de Bogotá. La base vuelve a exigir lo mismo salvo la
// franja horaria (es una regla de la app, no de los datos).
import { instanteDeBogota, minutoDelDia } from "./bogota";

export const MAX_HORARIOS = 3;
export const ANTICIPACION_MS = 60 * 60 * 1000;
export const HORIZONTE_DIAS = 60;
// De 6:00 a 21:00 de Bogotá: nadie visita un inmueble de madrugada.
export const PRIMERA_HORA = 6 * 60;
export const ULTIMA_HORA = 21 * 60;

export type HorarioPedido = { fecha: string; hora: string };

export type ProblemaHorarios =
  | "ninguno"
  | "demasiados"
  | "invalido"
  | "repetidos"
  | "muy_pronto"
  | "muy_lejos"
  | "fuera_de_hora";

export type Validacion =
  { ok: true; horarios: string[] } | { ok: false; problema: ProblemaHorarios };

/** Valida las fechas y horas de Bogotá que escribió el dueño. Devuelve los instantes en ISO (UTC), en orden. */
export function validarHorarios(
  pedidos: HorarioPedido[],
  ahora: Date,
): Validacion {
  if (pedidos.length === 0) return { ok: false, problema: "ninguno" };
  if (pedidos.length > MAX_HORARIOS)
    return { ok: false, problema: "demasiados" };
  const instantes: Date[] = [];
  for (const p of pedidos) {
    const d = instanteDeBogota(p.fecha, p.hora);
    if (!d) return { ok: false, problema: "invalido" };
    instantes.push(d);
  }
  const unicos = new Set(instantes.map((d) => d.getTime()));
  if (unicos.size !== instantes.length)
    return { ok: false, problema: "repetidos" };
  for (const d of instantes) {
    if (d.getTime() <= ahora.getTime() + ANTICIPACION_MS) {
      return { ok: false, problema: "muy_pronto" };
    }
    if (d.getTime() > ahora.getTime() + HORIZONTE_DIAS * 86_400_000) {
      return { ok: false, problema: "muy_lejos" };
    }
    const m = minutoDelDia(d);
    if (m < PRIMERA_HORA || m > ULTIMA_HORA) {
      return { ok: false, problema: "fuera_de_hora" };
    }
  }
  return {
    ok: true,
    horarios: instantes
      .sort((a, b) => a.getTime() - b.getTime())
      .map((d) => d.toISOString()),
  };
}
