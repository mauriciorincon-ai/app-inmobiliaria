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
    habitacionesUna: { es: "1 habitación", en: "1 bedroom" },
    habitacionesVarias: { es: "{n} habitaciones", en: "{n} bedrooms" },
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

  // Un solo sello fuerte (regla 5), en tres estados que salen de la presencia de la fecha del CTL.
  sello: {
    verificado: { es: "⭐ Propietario verificado", en: "⭐ Verified owner" },
    fundador: { es: "Fundador", en: "Founding seller" },
    reverificacion: {
      es: "Re-verificación pendiente",
      en: "Re-check pending",
    },
    // Chip corto con la fecha (tarjetas y panel). CTL = Certificado de Tradición y Libertad.
    ctlDel: { es: "CTL del {fecha}", en: "CTL, {fecha}" },
  },

  // «Vivo hace N días»: la promesa anti-zombie, visible. N sale de la última confirmación del dueño.
  vivo: {
    hoy: {
      es: "Vivo: el dueño lo confirmó hoy",
      en: "Live: the owner confirmed it today",
    },
    haceUno: {
      es: "Vivo: el dueño confirmó hace 1 día que sigue disponible",
      en: "Live: the owner confirmed 1 day ago that it's still available",
    },
    haceVarios: {
      es: "Vivo: el dueño confirmó hace {n} días que sigue disponible",
      en: "Live: the owner confirmed {n} days ago that it's still available",
    },
    nota: {
      es: "Un anuncio que su dueño no confirma en 60 días desaparece solo. Aquí no hay anuncios zombie.",
      en: "A listing its owner doesn't confirm within 60 days disappears on its own. No zombie listings here.",
    },
    // Versión corta para las tarjetas de la búsqueda.
    cortoHoy: { es: "Vivo hoy", en: "Confirmed today" },
    cortoUno: { es: "Vivo hace 1 día", en: "Confirmed 1 day ago" },
    cortoVarios: { es: "Vivo hace {n} días", en: "Confirmed {n} days ago" },
  },

  // El sello explicado, según su estado.
  selloExplicado: {
    verificado: {
      titulo: { es: "⭐ Propietario verificado", en: "⭐ Verified owner" },
      detalle: {
        es: "Vimos el Certificado de Tradición y Libertad (CTL) de este inmueble, expedido el {fecha}, y quien lo publica es la misma persona que figura como dueña. El documento solo se vio: no lo guardamos.",
        en: "We saw this property's Certificado de Tradición y Libertad (CTL, the official record of who owns a property in Colombia), issued on {fecha}, and the person who listed it is the owner named on it. We only looked at the document: we don't keep it.",
      },
      queRevisamos: { es: "¿Qué revisamos?", en: "What do we check?" },
      pasos: [
        {
          es: "El CTL es reciente: de máximo 30 días cuando lo vimos.",
          en: "The title record is recent: at most 30 days old when we saw it.",
        },
        {
          es: "El titular del CTL coincide con quien publica.",
          en: "The owner on the title record matches the person who listed.",
        },
        {
          es: "Guardamos solo la matrícula (que nunca es pública), la fecha del CTL y el resultado.",
          en: "We keep only the registry number (never public), the record's date and the result.",
        },
      ],
    },
    reverificacion: {
      titulo: {
        es: "Este dueño ya fue verificado; estamos renovando la prueba",
        en: "This owner was verified; we're renewing the proof",
      },
      detalle: {
        es: "Al abrir la búsqueda a compradores pedimos a cada propietario verificado un CTL nuevo, de máximo 30 días, para confirmar que sigue siendo el dueño. Mientras llega, el sello lo dice.",
        en: "When we opened search to buyers we asked every verified owner for a new title record, at most 30 days old, to confirm they still own the property. Until it arrives, the seal says so.",
      },
    },
    fundador: {
      titulo: {
        es: "Fundador: aún sin CTL verificado",
        en: "Founding seller: title record not checked yet",
      },
      detalle: {
        es: "Es un dueño directo que publicó sin papeles. Antes de pagar nada, pídele el CTL.",
        en: "A direct owner who listed without paperwork. Before you pay anything, ask for the title record (CTL).",
      },
    },
  },

  ubicacion: {
    titulo: { es: "Dónde queda", en: "Where it is" },
    detalle: {
      es: "{barrio}, {localidad}. Mostramos el área del barrio, nunca el punto exacto: la dirección exacta no se muestra.",
      en: "{barrio}, {localidad}. We show the neighborhood's area, never the exact point: the exact address isn't shown.",
    },
    detalleSinLocalidad: {
      es: "{barrio}. Mostramos el barrio, nunca el punto exacto: la dirección exacta no se muestra.",
      en: "{barrio}. We show the neighborhood, never the exact point: the exact address isn't shown.",
    },
  },
} as const satisfies Arbol;
