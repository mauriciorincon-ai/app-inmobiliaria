// Fechas de prueba. El CTL se expide en Bogotá (UTC−5, sin horario de verano): «hace N días» se calcula
// con ese huso para que el día no se corra cerca de la medianoche.
export function fechaBogota(diasAtras = 0): string {
  return new Date(Date.now() - 5 * 3_600_000 - diasAtras * 86_400_000)
    .toISOString()
    .slice(0, 10);
}
