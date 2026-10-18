// Formato y parseo de pesos colombianos (COP). Sin decimales: los precios de vivienda se escriben
// en pesos enteros.

import { localeIntl, type Idioma } from "@/i18n/idiomas";

// La moneda es SIEMPRE pesos colombianos; lo que cambia con el idioma es la forma de escribirlos.
// En español: $420.000.000. En inglés: «COP 420,000,000», porque «$» es ambiguo para quien viene de
// afuera y el código de la moneda no lo es.
const formateadores: Record<Idioma, Intl.NumberFormat> = {
  es: new Intl.NumberFormat(localeIntl("es"), {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }),
  en: new Intl.NumberFormat(localeIntl("en"), {
    style: "currency",
    currency: "COP",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }),
};

/** Formatea un entero de pesos: `$420.000.000` (es) o `COP 420,000,000` (en). No finitos → vacío. */
export function formatearCOP(valor: number, idioma: Idioma = "es"): string {
  if (!Number.isFinite(valor)) return "";
  const texto = formateadores[idioma].format(Math.round(valor));
  // Intl mete un espacio no separable: en español se quita ("$420.000.000"); en inglés se deja uno
  // normal entre el código y la cifra.
  return idioma === "es" ? texto.replace(/\s/g, "") : texto.replace(/\s/g, " ");
}

/**
 * ¿Lo escrito es un número ENTERO? Dígitos con separador de miles opcional (punto, coma o espacio, en
 * grupos de tres) y un «$» o «COP» delante. «85.5» o «420,000,000.00» no lo son: sin esta guarda,
 * `parsearCOP` los leería como 855 y 42.000.000.000 (se vuelve alcanzable cuando quien escribe es de un
 * país donde el punto es el decimal).
 */
export function esEnteroEscrito(texto: string): boolean {
  const limpio = texto.trim().replace(/^(COP|\$)\s*/i, "");
  return /^\d+$/.test(limpio) || /^\d{1,3}([.,\s]\d{3})+$/.test(limpio);
}

/**
 * Convierte lo que el usuario escribe ("420.000.000", "420000000", "$ 420.000.000") a un entero
 * de pesos. Devuelve `null` si no hay dígitos. No valida rango (eso es del esquema zod).
 */
export function parsearCOP(texto: string): number | null {
  if (typeof texto !== "string") return null;
  const digitos = texto.replace(/\D/g, "");
  if (digitos.length === 0) return null;
  const n = Number(digitos);
  return Number.isSafeInteger(n) ? n : null;
}
