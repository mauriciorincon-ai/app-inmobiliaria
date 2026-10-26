// Textos compartidos por toda la app. Redactados en cada idioma, no traducidos (S5).
import type { Arbol } from "@/i18n/textos";

export const COMUN = {
  // Metadatos del documento (layout raíz). El inglés va para colombianos que viven afuera y para
  // extranjeros que compran o arriendan en Bogotá.
  meta: {
    titulo: {
      es: "Innmobiliaria — Vende tu casa directo, sin comisión",
      en: "Innmobiliaria — Sell your Bogotá home directly, no commission",
    },
    descripcion: {
      es: "Publica tu inmueble en Bogotá como vendedor fundador: sin comisión, sin intermediarios. Publicar es registrarte, y los compradores que verificaron su WhatsApp te escriben directo.",
      en: "List your property in Bogotá as a founding seller: no commission, no middlemen. Listing is signing up, and buyers who verified their WhatsApp write to you directly.",
    },
  },

  // Cabecera de la portada y enlaces del pie.
  nav: {
    principal: { es: "Principal", en: "Main" },
    comoFunciona: { es: "Cómo funciona", en: "How it works" },
    publicar: { es: "Publicar", en: "List property" },
    buscar: { es: "Buscar", en: "Search" },
    inicio: { es: "Innmobiliaria — inicio", en: "Innmobiliaria — home" },
  },
  pie: {
    lema: {
      es: "La casa de los vendedores directos en Bogotá. Vende sin comisión y sin intermediarios.",
      en: "The home of direct sellers in Bogotá. Sell with no commission and no middlemen.",
    },
    enlaces: { es: "Enlaces del pie", en: "Footer links" },
    publicarInmueble: { es: "Publicar inmueble", en: "List a property" },
    buscarInmuebles: { es: "Buscar inmuebles", en: "Search properties" },
    privacidad: { es: "Política de privacidad", en: "Privacy policy" },
    derechos: {
      es: "© 2026 Innmobiliaria · Hecho en Bogotá para vendedores directos.",
      en: "© 2026 Innmobiliaria · Made in Bogotá for direct sellers.",
    },
  },

  // El corazón de la tarjeta de la búsqueda y de la ficha (S9): guardar el anuncio en este teléfono.
  favorito: {
    guardar: { es: "Guardar en favoritos", en: "Save to favorites" },
    quitar: { es: "Quitar de favoritos", en: "Remove from favorites" },
  },

  // Selector de idioma: solo la etiqueta del grupo; cada idioma se nombra en sí mismo.
  selector: { etiqueta: { es: "Idioma", en: "Language" } },

  // Vocabulario del dominio que se pinta en varias pantallas: la operación y el tipo de inmueble
  // (los valores de las columnas `operacion` y `tipo`). «Apartaestudio» se nombra y se explica para
  // quien lee en inglés.
  dominio: {
    operacion: {
      venta: { es: "Venta", en: "For sale" },
      arriendo: { es: "Arriendo", en: "For rent" },
    },
    tipo: {
      apartamento: { es: "Apartamento", en: "Apartment" },
      casa: { es: "Casa", en: "House" },
      apartaestudio: {
        es: "Apartaestudio",
        en: "Studio apartment (apartaestudio)",
      },
      otro: { es: "Otro", en: "Other" },
      inmueble: { es: "Inmueble", en: "Property" },
    },
  },

  // 404 de toda URL que no existe. Next la sirve fuera del layout de [lang] (su layout raíz vive en
  // un segmento dinámico), así que no sabe el idioma: muestra los dos a la vez.
  noEncontrada: {
    titulo: { es: "Página no encontrada", en: "Page not found" },
    detalle: {
      es: "Este enlace no existe o ya cambió.",
      en: "This link doesn't exist or has changed.",
    },
    volver: { es: "Volver al inicio", en: "Back to the home page" },
  },
} as const satisfies Arbol;
