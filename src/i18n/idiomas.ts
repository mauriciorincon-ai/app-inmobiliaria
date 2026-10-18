// Idiomas de la app. La URL pública NO lleva el idioma: `next.config.ts` reescribe cada petición a
// un segmento interno `/es/...` o `/en/...` según la cookie `idioma` y la cabecera
// `Accept-Language` (ADR 013). Este módulo es la única lista de idiomas válidos.

export const IDIOMAS = ["es", "en"] as const;
export type Idioma = (typeof IDIOMAS)[number];

export const IDIOMA_POR_DEFECTO: Idioma = "es";

// Cookie que recuerda la elección del selector (1 año, SameSite=Lax).
export const COOKIE_IDIOMA = "idioma";
export const VIGENCIA_COOKIE_SEGUNDOS = 60 * 60 * 24 * 365;

// Cada idioma se nombra en sí mismo («autónimo»): no se traduce, el selector debe ser reconocible
// por quien no lee el idioma actual de la página.
export const NOMBRE_PROPIO: Record<
  Idioma,
  { corto: string; completo: string }
> = {
  es: { corto: "ES", completo: "Español" },
  en: { corto: "EN", completo: "English" },
};

export function esIdioma(valor: string | undefined | null): valor is Idioma {
  return valor === "es" || valor === "en";
}

// Valor del atributo `lang` del documento: el español es el de Colombia.
export function langHtml(idioma: Idioma): string {
  return idioma === "es" ? "es-CO" : "en";
}

// Código regional para `Intl`: pesos y fechas. La moneda no cambia con el idioma (siempre COP).
export function localeIntl(idioma: Idioma): string {
  return idioma === "es" ? "es-CO" : "en-US";
}

// Texto de la cookie `idioma` para `document.cookie = …`. Función pura: se prueba sin navegador.
export function cookieDeIdioma(idioma: Idioma, seguro = false): string {
  const base = `${COOKIE_IDIOMA}=${idioma}; Path=/; Max-Age=${VIGENCIA_COOKIE_SEGUNDOS}; SameSite=Lax`;
  return seguro ? `${base}; Secure` : base;
}

// Recuerda la elección en el navegador. Vive aquí y no en el componente porque asignar a
// `document.cookie` dentro de un componente lo rechaza la regla react-hooks/immutability.
export function recordarIdioma(idioma: Idioma): void {
  // Bajo HTTPS la cookie viaja solo cifrada; en http://localhost (desarrollo y e2e) no se puede.
  document.cookie = cookieDeIdioma(
    idioma,
    window.location.protocol === "https:",
  );
}
