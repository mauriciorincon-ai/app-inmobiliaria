// Los correos de la visita (S8, ADR 016), puros y deterministas. Cada uno sale en el idioma de quien lo
// recibe. Lo que escribe una persona (su nombre, el barrio) se ESCAPA antes de entrar al HTML; el asunto es
// texto plano sin saltos de línea. Ningún correo lleva la dirección exacta: los datos que recibe este
// módulo no la traen (la base no la entrega) y un test lo vigila.
import {
  diasHasta,
  formatearHorario,
  ZONA_BOGOTA,
} from "@/engine/agenda/bogota";
import { escaparHtml } from "@/engine/envios/plantillas";
import { localeIntl, type Idioma } from "@/i18n/idiomas";
import { enIdioma, rellenar } from "@/i18n/textos";
import { COMUN } from "@/textos/comun";
import { CORREOS_VISITA } from "@/textos/correos-visita";

export type TipoCorreoVisita = keyof typeof CORREOS_VISITA.correos;
export type TipoCorreoSala = keyof typeof CORREOS_VISITA.sala;

export type DatosCorreo = {
  comprador: string;
  dueno: string;
  tipo: string;
  barrio: string;
  intencion: "vivir" | "invertir";
  horarios: string[];
  inicio: string | null;
  enEspera: boolean;
};

export type CorreoArmado = { asunto: string; html: string };

function tipoEnFrase(tipo: string, idioma: Idioma): string {
  const tipos = COMUN.dominio.tipo as Record<
    string,
    { es: string; en: string }
  >;
  const hoja = tipos[tipo] ?? tipos.inmueble;
  return hoja[idioma].toLocaleLowerCase(idioma);
}

// Texto plano para el asunto: sin saltos de línea ni espacios repetidos.
function plano(texto: string): string {
  return texto
    .replace(/[\r\n\t]+/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}

/** Arma un correo. `enlace` es el botón (ya absoluto); `ahora` decide «hoy» o «mañana» del recordatorio. */
export function armarCorreo(
  tipo: TipoCorreoVisita,
  datos: DatosCorreo,
  idioma: Idioma,
  enlace: string,
  ahora: Date,
): CorreoArmado {
  const t = enIdioma(CORREOS_VISITA, idioma);
  const c = t.correos;
  const inicio = datos.inicio;
  const horario = inicio ? formatearHorario(inicio, idioma) : "";
  const hora = inicio
    ? new Intl.DateTimeFormat(localeIntl(idioma), {
        timeZone: ZONA_BOGOTA,
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(inicio))
    : "";
  const cuando =
    inicio && diasHasta(new Date(inicio), ahora) <= 0
      ? t.cuando.hoy
      : t.cuando.manana;

  // Valores en texto plano (para el asunto) y escapados (para el HTML).
  const valores = {
    comprador: plano(datos.comprador),
    dueno: plano(datos.dueno),
    inmueble: rellenar(t.inmueble, {
      tipo: tipoEnFrase(datos.tipo, idioma),
      barrio: plano(datos.barrio),
    }),
    intencion: t.intencion[datos.intencion],
    horario,
    hora,
    cuando,
    zona: t.zonaHoraria,
  };
  const escapados = Object.fromEntries(
    Object.entries(valores).map(([k, v]) => [k, escaparHtml(v)]),
  );

  const partes: string[] = [];
  let asunto = "";
  let cta = "";
  switch (tipo) {
    case "solicitudDueno":
    case "solicitudComprador": {
      const p = c[tipo];
      asunto = p.asunto;
      partes.push(p.cuerpo);
      if (datos.enEspera) partes.push(p.enEspera);
      cta = p.cta;
      break;
    }
    case "horarios": {
      asunto = c.horarios.asunto;
      const lista = datos.horarios
        .map((h) => `<li>${escaparHtml(formatearHorario(h, idioma))}</li>`)
        .join("");
      partes.push(c.horarios.cuerpo, `<ul>${lista}</ul>`, c.horarios.cierre);
      cta = c.horarios.cta;
      break;
    }
    case "canceladaParaDueno": {
      asunto = c.canceladaParaDueno.asunto;
      partes.push(
        inicio
          ? c.canceladaParaDueno.conHorario
          : c.canceladaParaDueno.sinHorario,
      );
      cta = c.canceladaParaDueno.cta;
      break;
    }
    default: {
      const p = c[tipo];
      asunto = p.asunto;
      partes.push(p.cuerpo);
      cta = p.cta;
    }
  }

  const destinatario =
    tipo === "solicitudDueno" ||
    tipo === "ninguno" ||
    tipo === "confirmadaDueno" ||
    tipo === "canceladaParaDueno" ||
    tipo === "recordatorioDueno"
      ? escapados.dueno
      : escapados.comprador;
  const html =
    `<p>${rellenar(t.saludo, { nombre: destinatario })},</p>` +
    partes.map((p) => rellenar(p, escapados)).join("") +
    `<p><a href="${escaparHtml(enlace)}" style="color:#7B5DD6;font-weight:bold">${cta}</a></p>` +
    `<p style="color:#6b7280;font-size:12px">${t.pie}</p>`;
  return { asunto: plano(rellenar(asunto, valores)), html };
}

export type DatosCorreoSala = {
  comprador: string;
  /** El nombre del proyecto, tal como lo imprime la revista. */
  proyecto: string;
  franja: string;
  horarios: string[];
  inicio: string | null;
};

/**
 * Un correo de la visita a la sala de ventas de un proyecto nuevo (S13): solo el comprador lo recibe. Misma forma que
 * `armarCorreo`: lo que viene de afuera (el nombre) se ESCAPA antes de entrar al HTML y el asunto es texto plano. Ninguno lleva
 * la dirección ni el teléfono de la sala: los datos que recibe este módulo no los traen.
 */
/** El aviso al operador de una solicitud nueva a una sala (S16). Solo el proyecto y la franja: nada del comprador. */
export function armarAvisoOperadorSala(
  datos: Pick<DatosCorreoSala, "proyecto" | "franja">,
  idioma: Idioma,
  enlacePanel: string,
): CorreoArmado {
  const t = enIdioma(CORREOS_VISITA, idioma);
  const c = t.operadorSala;
  const franjas: Record<string, string> = t.franja;
  const valores = {
    proyecto: plano(datos.proyecto),
    franja: franjas[datos.franja] ?? "",
  };
  const escapados = Object.fromEntries(
    Object.entries(valores).map(([k, v]) => [k, escaparHtml(v)]),
  );
  const html =
    rellenar(c.cuerpo, escapados) +
    `<p><a href="${escaparHtml(enlacePanel)}" style="color:#7B5DD6;font-weight:bold">${c.cta}</a></p>`;
  return { asunto: plano(rellenar(c.asunto, valores)), html };
}

export function armarCorreoSala(
  tipo: TipoCorreoSala,
  datos: DatosCorreoSala,
  idioma: Idioma,
  enlace: string,
  ahora: Date,
): CorreoArmado {
  const t = enIdioma(CORREOS_VISITA, idioma);
  const c = t.sala[tipo];
  const inicio = datos.inicio;
  const horario = inicio ? formatearHorario(inicio, idioma) : "";
  const hora = inicio
    ? new Intl.DateTimeFormat(localeIntl(idioma), {
        timeZone: ZONA_BOGOTA,
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(inicio))
    : "";
  const franjas: Record<string, string> = t.franja;
  const valores = {
    comprador: plano(datos.comprador),
    proyecto: plano(datos.proyecto),
    franja: franjas[datos.franja] ?? "",
    horario,
    hora,
    cuando:
      inicio && diasHasta(new Date(inicio), ahora) <= 0
        ? t.cuando.hoy
        : t.cuando.manana,
    zona: t.zonaHoraria,
  };
  const escapados = Object.fromEntries(
    Object.entries(valores).map(([k, v]) => [k, escaparHtml(v)]),
  );

  const partes: string[] = [c.cuerpo];
  if (tipo === "horarios") {
    const lista = datos.horarios
      .map((h) => `<li>${escaparHtml(formatearHorario(h, idioma))}</li>`)
      .join("");
    partes.push(`<ul>${lista}</ul>`, t.sala.horarios.cierre);
  }
  const html =
    `<p>${rellenar(t.saludo, { nombre: escapados.comprador })},</p>` +
    partes.map((p) => rellenar(p, escapados)).join("") +
    `<p><a href="${escaparHtml(enlace)}" style="color:#7B5DD6;font-weight:bold">${c.cta}</a></p>` +
    `<p style="color:#6b7280;font-size:12px">${t.pie}</p>`;
  return { asunto: plano(rellenar(c.asunto, valores)), html };
}
