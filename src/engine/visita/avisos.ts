// Quién recibe qué correo en cada momento de la visita (S8). Puro: recibe lo que entrega la base
// (`datos_correo_visita`) y los enlaces, y devuelve la lista de correos listos para enviar. Quien no dejó
// correo no recibe nada (el dueño puede no haberlo dejado al publicar); nadie recibe el correo del otro.
import { esIdioma, IDIOMA_POR_DEFECTO, type Idioma } from "@/i18n/idiomas";
import { armarCorreo, type TipoCorreoVisita } from "./correos";

export type EventoVisita =
  | "solicitud"
  | "horarios"
  | "ninguno"
  | "confirmada"
  | "cancelada_por_comprador"
  | "cancelada_por_dueno"
  | "rechazada"
  | "recordatorio";

export const EVENTOS_VISITA: readonly EventoVisita[] = [
  "solicitud",
  "horarios",
  "ninguno",
  "confirmada",
  "cancelada_por_comprador",
  "cancelada_por_dueno",
  "rechazada",
  "recordatorio",
];

type Persona = { nombre: string; email: string | null; idioma: string };

// La forma de `datos_correo_visita` (migración 10). Sin dirección y sin teléfonos.
export type DatosSolicitud = {
  estado: string;
  intencion: "vivir" | "invertir";
  comprador: Persona;
  dueno: Persona;
  inmueble: { slug: string; operacion: string; tipo: string; barrio: string };
  horarios: string[];
  visita: { inicio: string; cancelada_por: string | null } | null;
};

export type Enlaces = {
  /** La solicitud del comprador (`/visita#t=…`), o la ficha si no hay token a mano. */
  comprador: string;
  /** «Mi anuncio» del dueño (sin token: lo abre con su enlace privado). */
  dueno: string;
  /** La ficha del anuncio. */
  ficha: string;
  /** La búsqueda. */
  buscar: string;
};

export type CorreoSaliente = {
  para: { email: string; nombre: string };
  asunto: string;
  html: string;
};

type Rol = "comprador" | "dueno";

const PLAN: Record<EventoVisita, Array<[Rol, TipoCorreoVisita]>> = {
  solicitud: [
    ["dueno", "solicitudDueno"],
    ["comprador", "solicitudComprador"],
  ],
  horarios: [["comprador", "horarios"]],
  ninguno: [["dueno", "ninguno"]],
  confirmada: [
    ["comprador", "confirmadaComprador"],
    ["dueno", "confirmadaDueno"],
  ],
  cancelada_por_comprador: [["dueno", "canceladaParaDueno"]],
  cancelada_por_dueno: [["comprador", "canceladaParaComprador"]],
  rechazada: [["comprador", "rechazada"]],
  recordatorio: [
    ["comprador", "recordatorioComprador"],
    ["dueno", "recordatorioDueno"],
  ],
};

function idiomaDe(p: Persona): Idioma {
  return esIdioma(p.idioma) ? p.idioma : IDIOMA_POR_DEFECTO;
}

function enlaceDe(tipo: TipoCorreoVisita, rol: Rol, e: Enlaces): string {
  if (tipo === "rechazada") return e.buscar;
  if (tipo === "canceladaParaComprador") return e.ficha;
  return rol === "dueno" ? e.dueno : e.comprador;
}

export function planearCorreos(
  evento: EventoVisita,
  datos: DatosSolicitud,
  enlaces: Enlaces,
  ahora: Date,
): CorreoSaliente[] {
  // Entre el reclamo y el envío la visita pudo cancelarse: un recordatorio jamás sale a una cancelada.
  if (
    evento === "recordatorio" &&
    (datos.estado !== "confirmada" ||
      !datos.visita ||
      datos.visita.cancelada_por !== null)
  ) {
    return [];
  }
  const base = {
    comprador: datos.comprador.nombre,
    dueno: datos.dueno.nombre,
    tipo: datos.inmueble.tipo,
    barrio: datos.inmueble.barrio,
    intencion: datos.intencion,
    horarios: datos.horarios,
    inicio: datos.visita?.inicio ?? null,
    enEspera: datos.estado === "en_espera",
  };
  const salida: CorreoSaliente[] = [];
  for (const [rol, tipo] of PLAN[evento]) {
    const persona = rol === "dueno" ? datos.dueno : datos.comprador;
    if (!persona.email) continue;
    const { asunto, html } = armarCorreo(
      tipo,
      base,
      idiomaDe(persona),
      enlaceDe(tipo, rol, enlaces),
      ahora,
    );
    salida.push({
      para: { email: persona.email, nombre: persona.nombre },
      asunto,
      html,
    });
  }
  return salida;
}

/**
 * ¿Algún correo de este evento lleva al comprador a SU solicitud? Solo entonces hace falta un enlace con
 * token (los de cancelación y rechazo lo mandan a la ficha o a la búsqueda).
 */
export function necesitaEnlaceComprador(evento: EventoVisita): boolean {
  return PLAN[evento].some(
    ([rol, tipo]) =>
      rol === "comprador" &&
      enlaceDe(tipo, rol, ENLACES_SONDA) === ENLACES_SONDA.comprador,
  );
}

const ENLACES_SONDA: Enlaces = {
  comprador: "c",
  dueno: "d",
  ficha: "f",
  buscar: "b",
};
