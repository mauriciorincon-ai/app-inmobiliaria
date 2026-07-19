// Vigencia del anuncio — anti-zombie B3 (ADR-009). Cada inmueble tiene `vigente_hasta`; el vendedor
// la renueva con un clic (POST) desde su magic link y extiende +60 días. La ficha pública DERIVA la
// vigencia en vivo (`vigente_hasta > now()`, no espera al cron); un cron semanal marca los vencidos
// para el panel, los lotes y las métricas. Este módulo es lógica pura de fechas (sin side-effects);
// la fuente de verdad es la BD. La promesa "todo lo publicado está vivo" se cumple por construcción.

export const VIGENCIA_DIAS = 60;
// Umbral del filtro "por vencer" del panel y del aviso de renovación.
export const POR_VENCER_DIAS = 14;

const MS_DIA = 86_400_000;

function aFecha(v: string | Date): Date | null {
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ¿El anuncio sigue vigente? (fecha de corte en el futuro). Fecha inválida ⇒ no vigente (fail-safe).
export function estaVigente(
  vigenteHasta: string | Date,
  ahora: Date = new Date(),
): boolean {
  const hasta = aFecha(vigenteHasta);
  return hasta !== null && hasta.getTime() > ahora.getTime();
}

// Días COMPLETOS que faltan para vencer (0 si ya venció). Para el copy "sigue vivo hasta —".
export function diasRestantes(
  vigenteHasta: string | Date,
  ahora: Date = new Date(),
): number {
  const hasta = aFecha(vigenteHasta);
  if (hasta === null) return 0;
  const ms = hasta.getTime() - ahora.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / MS_DIA);
}

// ¿Está por vencer? (vigente pero dentro del umbral). Alimenta el filtro de lote "por vencer".
export function estaPorVencer(
  vigenteHasta: string | Date,
  ahora: Date = new Date(),
): boolean {
  const d = diasRestantes(vigenteHasta, ahora);
  return d > 0 && d <= POR_VENCER_DIAS;
}

// Nueva fecha de corte tras renovar (para mostrar; la BD la fija con now() + interval en la RPC).
export function nuevaVigencia(desde: Date = new Date()): Date {
  return new Date(desde.getTime() + VIGENCIA_DIAS * MS_DIA);
}
