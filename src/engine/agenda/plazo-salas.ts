// El plazo de respuesta de una sala de ventas (S13, F2). Puro: la fecha es un PARÁMETRO (regla 23), nunca el reloj.
//
// La maqueta promete «si en dos días hábiles no responden, te lo decimos». «Dos días hábiles» = 48 horas de lunes a
// viernes en hora de Bogotá (UTC−5 todo el año): el sábado y el domingo no corren. Una solicitud del viernes a las 3 p. m.
// vence el martes a las 3 p. m.; una del sábado, el miércoles a la medianoche. Los festivos NO se descuentan (el aviso puede
// llegar un día antes de lo debido) y el aviso sale con el trabajo diario de las 8:00 de Bogotá, así que también puede llegar
// hasta un día DESPUÉS del vencimiento (S16: el comentario y el manual decían «nunca después»).
//
// La base reclama las solicitudes vencidas con `reclamar_sin_respuesta_salas(p_antes_de)`: entra toda solicitud cuya espera
// empezó en o antes de ese instante. `corteSinRespuesta` es ese instante; `venceSala` es su inversa, para que el panel diga
// cuándo vence cada una.

export const DIAS_HABILES_SALA = 2;

const DIA_MS = 86_400_000;
// Bogotá es UTC−5 sin horario de verano: se trabaja en «hora local como si fuera UTC» y se vuelve al final.
const DESFASE_MS = 5 * 60 * 60 * 1000;

/** Lunes a viernes, para un instante en hora local de Bogotá (expresado como si fuera UTC). */
function esHabil(local: number): boolean {
  const dia = new Date(local).getUTCDay();
  return dia >= 1 && dia <= 5;
}

/** El instante en que vence una espera que empezó en `desde`: `dias` días hábiles después. */
export function venceSala(desde: Date, dias = DIAS_HABILES_SALA): Date {
  let local = desde.getTime() - DESFASE_MS;
  let resto = dias * DIA_MS;
  while (resto > 0) {
    const finDelDia = Math.floor(local / DIA_MS) * DIA_MS + DIA_MS;
    if (esHabil(local)) {
      const tramo = Math.min(finDelDia - local, resto);
      local += tramo;
      resto -= tramo;
    } else {
      local = finDelDia;
    }
  }
  return new Date(local + DESFASE_MS);
}

/**
 * El corte para `reclamar_sin_respuesta_salas`: toda espera que empezó en o antes de este instante ya cumplió `dias` días
 * hábiles a `ahora`. Es el mayor `desde` con `venceSala(desde) <= ahora`.
 */
export function corteSinRespuesta(ahora: Date, dias = DIAS_HABILES_SALA): Date {
  let local = ahora.getTime() - DESFASE_MS;
  let resto = dias * DIA_MS;
  while (resto > 0) {
    // El día que contiene el instante JUSTO antes de `local` (a la medianoche exacta, el día anterior).
    const inicioDelDia = Math.floor((local - 1) / DIA_MS) * DIA_MS;
    if (esHabil(inicioDelDia)) {
      const tramo = Math.min(local - inicioDelDia, resto);
      local -= tramo;
      resto -= tramo;
    } else {
      local = inicioDelDia;
    }
  }
  return new Date(local + DESFASE_MS);
}
