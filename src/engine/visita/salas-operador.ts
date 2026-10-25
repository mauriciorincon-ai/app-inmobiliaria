// La cola de visitas a salas de ventas que ve el operador (S13) y los enlaces de WhatsApp que arma. Puro. Nada sale solo: el
// operador abre WhatsApp con el mensaje YA escrito y lo envía desde su teléfono. El mensaje a la sala NO lleva datos del
// comprador (ni nombre ni número): «ninguno de tus datos va a la constructora sin que lo aceptes». El mensaje al comprador
// lleva la dirección que el operador guardó, y solo existe con la visita confirmada.
import { formatearHorario } from "@/engine/agenda/bogota";
import { venceSala } from "@/engine/agenda/plazo-salas";
import { normalizarWhatsapp } from "@/engine/format/whatsapp";
import type { Idioma } from "@/i18n/idiomas";
import type { SolicitudSala } from "@/lib/supabase/types";

/**
 * `https://wa.me/<dígitos>?text=…`, o null si el teléfono no sirve. Un celular colombiano de 10 dígitos recibe el 57; cualquier
 * otro número vale si tiene de 7 a 15 dígitos (el mismo CHECK de la base: una sala puede tener un fijo o una línea de otro país).
 */
export function enlaceWhatsApp(
  telefono: string | null,
  mensaje: string,
): string | null {
  if (telefono === null) return null;
  const digitos = (normalizarWhatsapp(telefono) ?? telefono).replace(/\D/g, "");
  if (!/^[0-9]{7,15}$/.test(digitos)) return null;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`;
}

export const GRUPOS_SALAS = [
  "por_atender",
  "con_horarios",
  "confirmadas",
  "cerradas",
] as const;
export type GrupoSala = (typeof GRUPOS_SALAS)[number];

/** El grupo de la cola donde está una solicitud: lo que pide una acción del equipo va arriba. */
export function grupoDe(
  s: Pick<SolicitudSala, "estado" | "ninguno">,
): GrupoSala {
  switch (s.estado) {
    case "pendiente":
      return "por_atender";
    case "propuesta":
      // «Ninguno me sirve»: el comprador pide otros horarios, así que el siguiente paso es del equipo.
      return s.ninguno ? "por_atender" : "con_horarios";
    case "confirmada":
      return "confirmadas";
    default:
      return "cerradas";
  }
}

/** Los grupos con sus filas, sin vacíos, conservando el orden de la base (la más reciente primero). */
export function agruparSalas(
  filas: readonly SolicitudSala[],
): Array<{ grupo: GrupoSala; filas: SolicitudSala[] }> {
  return GRUPOS_SALAS.map((grupo) => ({
    grupo,
    filas: filas.filter((s) => grupoDe(s) === grupo),
  })).filter((g) => g.filas.length > 0);
}

/** Cuándo vence el plazo de respuesta de la sala (dos días hábiles desde que se pidió); solo mientras esté `pendiente`. */
export function venceDe(
  s: Pick<SolicitudSala, "estado" | "fecha" | "ninguno">,
): Date | null {
  return s.estado === "pendiente" && !s.ninguno
    ? venceSala(new Date(s.fecha))
    : null;
}

type PlantillaMensaje = { es: string; en: string };

/** El mensaje a la sala. Siempre en español (la sala está en Bogotá) y sin ningún dato del comprador. */
export function mensajeParaSala(
  plantilla: PlantillaMensaje,
  datos: { proyecto: string; franja: string },
): string {
  return plantilla.es
    .replace("{proyecto}", () => datos.proyecto)
    .replace("{franja}", () => datos.franja);
}

/** El mensaje al comprador con la dirección de la sala, en SU idioma. Null si la dirección no está guardada. */
export function mensajeParaComprador(
  plantilla: PlantillaMensaje,
  datos: {
    nombre: string;
    proyecto: string;
    inicio: string;
    direccion: string | null;
    idioma: Idioma;
  },
): string | null {
  const direccion = datos.direccion;
  if (direccion === null) return null;
  return plantilla[datos.idioma]
    .replace("{nombre}", () => datos.nombre)
    .replace("{proyecto}", () => datos.proyecto)
    .replace("{horario}", () => formatearHorario(datos.inicio, datos.idioma))
    .replace("{direccion}", () => direccion);
}
