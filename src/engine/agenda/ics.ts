// «Agregar a mi calendario» (S8, maqueta 06): un archivo iCalendar (RFC 5545) que se arma en el navegador,
// así nada de la visita se guarda para producirlo. La hora va en la zona de Bogotá con su VTIMEZONE (UTC−5
// fijo, sin horario de verano): el calendario la muestra bien aunque el teléfono esté en otro país.
// Sin dirección: la da el dueño por WhatsApp.
import { ZONA_BOGOTA } from "./bogota";

export const DURACION_MIN = 60;
const DESFASE_MS = -5 * 60 * 60 * 1000;

export type EventoIcs = {
  /** Identificador estable del evento (el mismo al volver a descargarlo: el calendario lo reemplaza). */
  uid: string;
  inicio: string; // ISO (UTC)
  titulo: string;
  descripcion: string;
  duracionMin?: number;
};

function dos(n: number): string {
  return String(n).padStart(2, "0");
}

/** 20261025T100000 en hora de Bogotá. */
function localBogota(ms: number): string {
  const b = new Date(ms + DESFASE_MS);
  return (
    `${b.getUTCFullYear()}${dos(b.getUTCMonth() + 1)}${dos(b.getUTCDate())}` +
    `T${dos(b.getUTCHours())}${dos(b.getUTCMinutes())}${dos(b.getUTCSeconds())}`
  );
}

/** 20261025T150000Z (UTC). */
function utc(ms: number): string {
  const d = new Date(ms);
  return (
    `${d.getUTCFullYear()}${dos(d.getUTCMonth() + 1)}${dos(d.getUTCDate())}` +
    `T${dos(d.getUTCHours())}${dos(d.getUTCMinutes())}${dos(d.getUTCSeconds())}Z`
  );
}

/** Escapa un TEXT de iCalendar: barra invertida, punto y coma, coma y saltos de línea. */
export function escaparTexto(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Pliega una línea a 75 octetos (RFC 5545 §3.1), sin partir un carácter UTF-8. */
export function plegar(linea: string): string {
  const cod = new TextEncoder();
  const partes: string[] = [];
  let actual = "";
  let octetos = 0;
  for (const ch of linea) {
    const n = cod.encode(ch).length;
    const limite = partes.length === 0 ? 75 : 74; // las continuaciones empiezan con un espacio
    if (octetos + n > limite) {
      partes.push(actual);
      actual = "";
      octetos = 0;
    }
    actual += ch;
    octetos += n;
  }
  partes.push(actual);
  return partes.join("\r\n ");
}

export function generarIcs(evento: EventoIcs, ahora: Date): string {
  const inicio = Date.parse(evento.inicio);
  const fin = inicio + (evento.duracionMin ?? DURACION_MIN) * 60_000;
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Innmobiliaria//Visita//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    `TZID:${ZONA_BOGOTA}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0500",
    "TZNAME:-05",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:${evento.uid}`,
    `DTSTAMP:${utc(ahora.getTime())}`,
    `DTSTART;TZID=${ZONA_BOGOTA}:${localBogota(inicio)}`,
    `DTEND;TZID=${ZONA_BOGOTA}:${localBogota(fin)}`,
    `SUMMARY:${escaparTexto(evento.titulo)}`,
    `DESCRIPTION:${escaparTexto(evento.descripcion)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lineas.map(plegar).join("\r\n") + "\r\n";
}
