// La sesión de fotos (S15, «fotos que venden»): qué puede hacer cada parte según el estado, cómo se lee la fecha que escribe el
// operador y a qué frase del diccionario va cada error de la base. Puro: las pantallas solo pintan.
import { validarHorarios } from "@/engine/agenda/horarios";
import { respuestaDeErrorAntifraude } from "@/engine/antifraude/errores";
import type { ErrorRpc } from "@/engine/visita/errores";

export type EstadoSesion = "solicitada" | "agendada" | "hecha" | "cancelada";

/** Una sesión está abierta mientras alguien tiene algo que hacer con ella. Solo hay una abierta por anuncio. */
export function sesionAbierta(
  estado: EstadoSesion | null | undefined,
): boolean {
  return estado === "solicitada" || estado === "agendada";
}

/** El dueño pide una sesión si no tiene una abierta (una hecha o cancelada no impide pedir otra). */
export function puedePedirSesion(
  sesion: { estado: EstadoSesion } | null | undefined,
): boolean {
  return !sesionAbierta(sesion?.estado);
}

export type AccionesDeSesion = {
  agendar: boolean;
  cambiar: boolean;
  hecha: boolean;
  cancelar: boolean;
};

/** Lo que el operador puede hacer: agendar la pedida, cambiar o dar por hecha la agendada, cancelar cualquiera abierta. */
export function accionesDeSesion(estado: EstadoSesion): AccionesDeSesion {
  return {
    agendar: estado === "solicitada",
    cambiar: estado === "agendada",
    hecha: estado === "agendada",
    cancelar: sesionAbierta(estado),
  };
}

export type ProblemaSesion =
  "invalido" | "muy_pronto" | "muy_lejos" | "fuera_de_hora";

/**
 * La fecha y la hora de Bogotá que escribió el operador, como instante ISO. Las mismas reglas de los horarios de una visita
 * (más de una hora en el futuro, hasta 60 días, entre las 6:00 y las 21:00) y la base vuelve a exigir el plazo.
 */
export function horarioDeSesion(
  fecha: string,
  hora: string,
  ahora: Date,
): { ok: true; iso: string } | { ok: false; problema: ProblemaSesion } {
  const v = validarHorarios([{ fecha, hora }], ahora);
  if (v.ok) return { ok: true, iso: v.horarios[0] };
  // Con un solo horario no hay «ninguno», «demasiados» ni «repetidos»: lo que queda es un horario que no se pudo leer.
  const problema: ProblemaSesion =
    v.problema === "muy_pronto" ||
    v.problema === "muy_lejos" ||
    v.problema === "fuera_de_hora"
      ? v.problema
      : "invalido";
  return { ok: false, problema };
}

export type ErrorDeSesion =
  | "ya_solicitada"
  | "demasiadas_sesiones"
  | "no_disponible"
  | "estado_invalido"
  | "servidor";

const CONOCIDOS: readonly ErrorDeSesion[] = [
  "ya_solicitada",
  "demasiadas_sesiones",
  "no_disponible",
  "estado_invalido",
];

/** El error de una RPC de la sesión, como la clave de su frase. Lo que no se reconoce es «servidor»: jamás el texto de la base. */
export function errorDeSesion(error: ErrorRpc): ErrorDeSesion {
  const { codigo } = respuestaDeErrorAntifraude(error);
  return CONOCIDOS.find((c) => c === codigo) ?? "servidor";
}
