// Las horas que se pueden proponer para una visita: de 6:00 a 21:00 cada media hora, en hora de Bogotá (la misma franja que
// exige `validarHorarios`). La usan el dueño de un anuncio y el operador de las salas de ventas.
import { PRIMERA_HORA, ULTIMA_HORA } from "./horarios";
import { localeIntl, type Idioma } from "@/i18n/idiomas";

export const HORAS_PROPUESTAS: string[] = [];
for (let m = PRIMERA_HORA; m <= ULTIMA_HORA; m += 30) {
  HORAS_PROPUESTAS.push(
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
  );
}

/** «10:00 a. m.» · «10:00 AM» de una hora `HH:MM`. */
export function etiquetaHora(hora: string, lang: Idioma): string {
  return new Intl.DateTimeFormat(localeIntl(lang), {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(`2000-01-01T${hora}:00Z`));
}
