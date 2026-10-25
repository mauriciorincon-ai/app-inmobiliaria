// La cola antifraude del operador (S15): qué acciones caben en cada anuncio y con qué datos se escribe cada bandera. Puro: la
// pantalla solo pinta.
import { UMBRALES, type Regla } from "./reglas";

export type BanderaEnCola = {
  regla: Regla;
  evidencia: Record<string, string | number>;
};

export type RevisionEnCola = {
  pausado_at: string | null;
  banderas: readonly unknown[];
  reportes: readonly unknown[];
};

export type AccionesPosibles = {
  pausar: boolean;
  reactivar: boolean;
  pedirCtl: boolean;
  descartar: boolean;
};

/** Pausar o reactivar según el estado; pedir el CTL siempre; descartar solo si hay algo abierto que descartar. */
export function accionesPosibles(r: RevisionEnCola): AccionesPosibles {
  const pausado = r.pausado_at !== null;
  return {
    pausar: !pausado,
    reactivar: pausado,
    pedirCtl: true,
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
