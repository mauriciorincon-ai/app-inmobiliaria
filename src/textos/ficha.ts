// Ficha pública del inmueble (/i/[slug]). La F2 del S5 completa el resto de la pantalla.
import type { Arbol } from "@/i18n/textos";

export const FICHA = {
  noEncontrada: {
    titulo: {
      es: "No encontramos este inmueble",
      en: "We couldn't find this property",
    },
    detalle: {
      es: "El enlace puede estar mal escrito o el anuncio ya no está disponible.",
      en: "The link may be mistyped, or the listing is no longer available.",
    },
    inicio: { es: "Ir al inicio", en: "Go to the home page" },
  },
} as const satisfies Arbol;
