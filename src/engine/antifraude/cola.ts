// La cola antifraude del operador (S15): qué acciones caben en cada anuncio y con qué datos se escribe cada bandera. Puro: la
// pantalla solo pinta.
import { UMBRALES, type Regla } from "./reglas";

export type BanderaEnCola = {
  regla: Regla;
  evidencia: Record<string, string | number>;
};

export type RevisionEnCola = {
  pausado_at: string | null;
  ctl_pedido_at?: string | null;
  banderas: readonly unknown[];
  reportes: readonly unknown[];
};

export type AccionesPosibles = {
  pausar: boolean;
  reactivar: boolean;
  pedirCtl: boolean;
  /** S16: el CTL pedido que no llegó se cierra (sale de la cola). */
  cerrarCtl: boolean;
  descartar: boolean;
};

/** Pausar o reactivar según el estado; pedir el CTL o, si ya se pidió, cerrarlo; descartar solo si hay algo abierto. */
export function accionesPosibles(r: RevisionEnCola): AccionesPosibles {
  const pausado = r.pausado_at !== null;
  return {
    pausar: !pausado,
    reactivar: pausado,
    // Pedido y sin llegar: se puede cerrar en vez de volver a pedirlo.
    pedirCtl: !r.ctl_pedido_at,
    cerrarCtl: !!r.ctl_pedido_at,
    descartar: r.banderas.length + r.reportes.length > 0,
  };
}

/** Los valores con que se rellena la frase de una bandera: su evidencia y, para el precio, el umbral de la regla. */
export function valoresDeBandera(
  b: BanderaEnCola,
): Record<string, string | number> {
  return b.regla === "precio"
    ? { ...b.evidencia, umbral: UMBRALES.precioPorcentaje }
    : { ...b.evidencia };
}
