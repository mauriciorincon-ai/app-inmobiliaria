// Fechas legibles sin horas: «3 oct 2026» (es) · «Oct 3, 2026» (en). La fecha del CTL es un DÍA, no un
// instante: se interpreta y se escribe en UTC para que el día nunca se corra por la zona horaria.

import { localeIntl, type Idioma } from "@/i18n/idiomas";

const formateadores: Record<Idioma, Intl.DateTimeFormat> = {
  es: new Intl.DateTimeFormat(localeIntl("es"), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }),
  en: new Intl.DateTimeFormat(localeIntl("en"), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }),
};

/** «AAAA-MM-DD» (o un ISO completo) → fecha corta en el idioma pedido; fecha inválida → vacío. */
export function formatearFecha(fecha: string, idioma: Idioma = "es"): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ? new Date(`${fecha}T00:00:00Z`)
    : new Date(fecha);
  if (Number.isNaN(d.getTime())) return "";
  if (idioma === "en") return formateadores.en.format(d);
  // En español de Colombia Intl escribe «3 de oct de 2026»: se deja «3 oct 2026», como en la maqueta.
  const partes = formateadores.es.formatToParts(d);
  const de = (tipo: string) =>
    (partes.find((p) => p.type === tipo)?.value ?? "").replace(/\./g, "");
  return `${de("day")} ${de("month")} ${de("year")}`;
}
