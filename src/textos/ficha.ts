// Ficha pública del inmueble (/i/[slug]). Redactada en cada idioma, no traducida (S5). Los avisos de
// la ficha se leen en el idioma de quien la visita, no en el del vendedor.
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

  // Metadatos del documento (título, descripción, tarjeta al compartir). `{tipo}` sale de
  // COMUN.dominio.tipo.
  meta: {
    noEncontrada: {
      es: "Inmueble no encontrado — Innmobiliaria",
      en: "Property not found — Innmobiliaria",
    },
    tituloCompartido: {
      es: "{tipo} en {barrio} — {precio}",
      en: "{tipo} in {barrio} — {precio}",
    },
    titulo: {
      es: "{tipo} en {barrio} — {precio} | Innmobiliaria",
      en: "{tipo} in {barrio} — {precio} | Innmobiliaria",
    },
    descripcion: {
      es: "{tipo} en {barrio}, {ciudad}.",
      en: "{tipo} in {barrio}, {ciudad}.",
    },
  },

  encabezado: {
    titulo: { es: "{tipo} en {barrio}", en: "{tipo} in {barrio}" },
    medidas: {
      es: "{ciudad} · {area} m² · {habitaciones} habitaciones",
      en: "{ciudad} · {area} m² · {habitaciones} bedrooms",
    },
  },

  publicadoPor: { es: "Publicado por", en: "Listed by" },
  sinContacto: {
    es: "Este vendedor aún no habilitó el contacto directo.",
    en: "This seller hasn't enabled direct contact yet.",
  },

  contacto: {
    boton: { es: "Escribir por WhatsApp", en: "Message on WhatsApp" },
    // Mensaje que se precarga en WhatsApp; `{inmueble}` es «apartamento en Cedritos» en minúscula.
    mensaje: {
      es: "Hola, vi tu {inmueble} en Innmobiliaria y me interesa. ¿Sigue disponible?",
      en: "Hi, I saw your {inmueble} on Innmobiliaria and I'm interested. Is it still available?",
    },
  },

  compartir: {
    boton: { es: "Compartir este inmueble", en: "Share this property" },
    copiado: { es: "Enlace copiado ✓", en: "Link copied ✓" },
  },

  galeria: {
    principal: {
      es: "Foto principal del inmueble",
      en: "Main photo of the property",
    },
    otra: { es: "Foto {n} del inmueble", en: "Photo {n} of the property" },
    sinFotos: {
      es: "Este inmueble aún no tiene fotos",
      en: "This property doesn't have photos yet",
    },
  },

  sello: {
    verificado: { es: "⭐ Propietario verificado", en: "⭐ Verified owner" },
    fundador: { es: "Fundador", en: "Founding seller" },
  },
} as const satisfies Arbol;
