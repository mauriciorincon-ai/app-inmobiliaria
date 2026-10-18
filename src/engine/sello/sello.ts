// Sello del anuncio — un solo sello fuerte (regla 5): ⭐ «Propietario verificado» con la fecha del CTL.
// Tres estados, derivados SIN reloj de la presencia de la fecha:
//   · fundador                  — todavía sin verificar (nivel 1).
//   · verificado                — verificado con la fecha del CTL a la vista.
//   · reverificacion_pendiente  — verificado en la época sin fecha: el comprador no puede saber cuán
//                                 reciente es, así que el sello pide re-verificar (la fecha no se inventa).
// Los 30 días del CTL se exigen AL REGISTRAR la fecha (la RPC `marcar_verificado_ctl` rechaza una más
// vieja), no al mostrar. Lógica pura de fechas 'AAAA-MM-DD'; la fuente de verdad es la BD.

export const CTL_MAX_DIAS = 30;

export type NivelVerificacion = "fundador" | "verificado";

export type EstadoSello =
  "fundador" | "verificado" | "reverificacion_pendiente";

export function estadoSello(
  nivel: NivelVerificacion,
  ctlExpedidoEl: string | null,
): EstadoSello {
  if (nivel !== "verificado") return "fundador";
  return ctlExpedidoEl ? "verificado" : "reverificacion_pendiente";
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MS_DIA = 86_400_000;

function aUtc(fecha: string): number | null {
  if (!FECHA.test(fecha)) return null;
  const t = Date.parse(`${fecha}T00:00:00Z`);
  // Date.parse normaliza «2026-02-31» a marzo: se exige que dé la misma fecha.
  return Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== fecha
    ? null
    : t;
}

// La fecha de hoy en Bogotá (UTC−5, sin horario de verano). Misma convención que la RPC.
export function hoyEnBogota(ahora: Date = new Date()): string {
  return new Date(ahora.getTime() - 5 * 3_600_000).toISOString().slice(0, 10);
}

export type ResultadoCtl =
  | { ok: true; dias: number }
  | { ok: false; motivo: "invalida" | "futura" | "vencida" };

// ¿Sirve esta fecha de expedición del CTL para registrar la verificación? (hoy−30 ≤ fecha ≤ hoy)
export function ctlVigenteParaRegistrar(
  fecha: string,
  hoy: string = hoyEnBogota(),
): ResultadoCtl {
  const f = aUtc(fecha);
  const h = aUtc(hoy);
  if (f === null || h === null) return { ok: false, motivo: "invalida" };
  const dias = Math.round((h - f) / MS_DIA);
  if (dias < 0) return { ok: false, motivo: "futura" };
  if (dias > CTL_MAX_DIAS) return { ok: false, motivo: "vencida" };
  return { ok: true, dias };
}

// Días desde la expedición del CTL (0 si es de hoy); null si la fecha no es válida.
export function diasDesdeCtl(
  fecha: string,
  hoy: string = hoyEnBogota(),
): number | null {
  const f = aUtc(fecha);
  const h = aUtc(hoy);
  if (f === null || h === null) return null;
  return Math.max(0, Math.round((h - f) / MS_DIA));
}
