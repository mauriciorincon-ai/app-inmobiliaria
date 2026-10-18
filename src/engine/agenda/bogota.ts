// La hora de Bogotá (S8). Bogotá es UTC−5 todo el año, sin horario de verano: la base guarda instantes en
// UTC y la app los muestra y los recibe en hora de Bogotá, sin depender de la zona del navegador ni del
// servidor (el Worker corre en UTC; un comprador puede abrir la página desde otro país).
import { localeIntl, type Idioma } from "@/i18n/idiomas";

export const ZONA_BOGOTA = "America/Bogota";
const DESFASE_MS = -5 * 60 * 60 * 1000;
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

function dos(n: number): string {
  return String(n).padStart(2, "0");
}

/** La fecha (YYYY-MM-DD) y la hora (HH:MM) de Bogotá de un instante. */
export function partesBogota(instante: Date): { fecha: string; hora: string } {
  const b = new Date(instante.getTime() + DESFASE_MS);
  return {
    fecha: `${b.getUTCFullYear()}-${dos(b.getUTCMonth() + 1)}-${dos(b.getUTCDate())}`,
    hora: `${dos(b.getUTCHours())}:${dos(b.getUTCMinutes())}`,
  };
}

/** Hoy en Bogotá (YYYY-MM-DD). */
export function hoyBogota(ahora: Date): string {
  return partesBogota(ahora).fecha;
}

/** El instante de una fecha y una hora de Bogotá, o null si no son válidas. */
export function instanteDeBogota(fecha: string, hora: string): Date | null {
  if (!REGEX_FECHA.test(fecha) || !REGEX_HORA.test(hora)) return null;
  const d = new Date(`${fecha}T${hora}:00-05:00`);
  if (Number.isNaN(d.getTime())) return null;
  // `new Date` acepta el 31 de febrero y lo corre al 3 de marzo: se exige la misma fecha de vuelta.
  return partesBogota(d).fecha === fecha ? d : null;
}

/** Minutos desde la medianoche de Bogotá. */
export function minutoDelDia(instante: Date): number {
  const { hora } = partesBogota(instante);
  return Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3));
}

/** Días de calendario de Bogotá entre hoy y la fecha del instante (0 = hoy, 1 = mañana). */
export function diasHasta(instante: Date, ahora: Date): number {
  const a = Date.parse(`${hoyBogota(ahora)}T00:00:00Z`);
  const b = Date.parse(`${partesBogota(instante).fecha}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** «sábado, 25 de octubre, 10:00 a. m.» / «Saturday, October 25, 10:00 AM», siempre en hora de Bogotá. */
export function formatearHorario(iso: string, idioma: Idioma): string {
  return new Intl.DateTimeFormat(localeIntl(idioma), {
    timeZone: ZONA_BOGOTA,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** El día de la semana del día ANTES de la visita, en hora de Bogotá («viernes» / «Friday»): cuándo llega el recordatorio. */
export function diaAntes(iso: string, idioma: Idioma): string {
  return new Intl.DateTimeFormat(localeIntl(idioma), {
    timeZone: ZONA_BOGOTA,
    weekday: "long",
  }).format(new Date(Date.parse(iso) - 86_400_000));
}

/** Solo la fecha larga de la visita («sábado, 24 de octubre»), sin la hora. */
export function formatearDia(iso: string, idioma: Idioma): string {
  return new Intl.DateTimeFormat(localeIntl(idioma), {
    timeZone: ZONA_BOGOTA,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}
