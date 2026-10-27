// Landing de expectativa seller-first. Redactada en cada idioma, no traducida (S5): el inglés es para
// colombianos que viven afuera y extranjeros que compran o arriendan en Bogotá, así que los términos
// locales se nombran y se explican en una línea. Solo cifras citables (design-system.md): comisión 3 %
// urbano y 7–7,5 meses de venta.
import type { Arbol } from "@/i18n/textos";

export const LANDING = {
  hero: {
    etiqueta: {
      es: "Para vendedores directos en Bogotá",
      en: "For owners selling direct in Bogotá",
    },
    // El titular se parte en tres para resaltar una palabra con el recurso gráfico de la marca.
    titulo: {
      antes: { es: "Vende tu casa ", en: "Sell your home " },
      resaltado: { es: "directo", en: "direct" },
      // U+2060 (unión de palabras) pega la coma al resaltado: sin él, en pantallas angostas la coma
      // quedaba sola al inicio de la línea siguiente («direct» / «, with no commission»).
      despues: {
        es: "\u2060, sin pagar comisión",
        en: "\u2060, with no commission",
      },
    },
    subtitulo: {
      antes: {
        es: "Publícala hoy como fundador —verificada y bien presentada— para que los compradores la encuentren y te escriban directo. Publicar tu inmueble ",
        en: "List it today as a founding seller — verified and well presented — so buyers find it and write to you directly. Listing your property ",
      },
      resaltado: { es: "es", en: "is" },
      despues: { es: " tu registro.", en: " your sign-up." },
    },
    cta: {
      es: "Publica tu inmueble como fundador",
      en: "List your property as a founding seller",
    },
    comoFunciona: { es: "¿Cómo funciona? →", en: "How does it work? →" },
    garantias: {
      es: "Gratis para fundadores · Sin intermediarios · Tus datos protegidos (Ley 1581)",
      en: "Free for founding sellers · No middlemen · Your data protected (Colombia's Ley 1581)",
    },
    ilustracion: {
      es: "Ilustración de una casa",
      en: "Illustration of a house",
    },
    comision: { es: "Comisión", en: "Commission" },
    // Cero pesos con la moneda como la escribe el resto de la app en cada idioma («$» en español, «COP» en inglés).
    cero: { es: "$0", en: "COP 0" },
    paraTi: { es: "para ti", en: "for you" },
  },

  cupos: {
    etiqueta: {
      es: "Cupos de fundador por zona",
      en: "Founding-seller spots by area",
    },
    completos: {
      es: "Cupos de fundador completos en {zona}",
      en: "Founding-seller spots in {zona} are full",
    },
    uno: {
      es: "Queda 1 cupo de fundador en {zona}",
      en: "1 founding-seller spot left in {zona}",
    },
    varios: {
      es: "Quedan {n} cupos de fundador en {zona}",
      en: "{n} founding-seller spots left in {zona}",
    },
    asegura: { es: "Asegura tu cupo", en: "Claim your spot" },
  },

  dolores: {
    titulo: {
      antes: { es: "Vender directo ", en: "Selling direct " },
      resaltado: { es: "tiene sentido", en: "makes sense" },
    },
    subtitulo: {
      es: "No es una corazonada: son los números del mercado colombiano.",
      en: "It's not a hunch: these are the numbers from the Colombian market.",
    },
    tarjetas: [
      {
        cifra: { es: "≈$12M", en: "≈COP 12M" },
        titulo: {
          es: "La comisión que te ahorras",
          en: "The commission you save",
        },
        texto: {
          es: "El 3% de comisión urbana sobre una vivienda de $400 millones son unos $12 millones. Vendiendo directo, ese dinero se queda contigo.",
          en: "The usual 3% brokerage commission in Colombian cities, on a home worth COP 400 million, comes to about COP 12 million. Sell direct and that money stays with you.",
        },
      },
      {
        cifra: { es: "7–7,5 meses", en: "7–7.5 months" },
        titulo: {
          es: "Lo que tarda una venta",
          en: "How long a sale takes",
        },
        texto: {
          es: "Es el promedio en Bogotá. Empezar con tiempo y una buena presentación juega a tu favor, no en tu contra.",
          en: "That's the average in Bogotá. Starting early and presenting your home well works in your favor, not against you.",
        },
      },
      {
        // Sin cifra: la de las denuncias de estafa era de evidencia débil (regla de producto 4). En
        // su lugar va el sello, que es lo que la tarjeta defiende.
        cifra: { es: "⭐ Verificado", en: "⭐ Verified" },
        titulo: {
          es: "La confianza se demuestra",
          en: "Trust you can show",
        },
        texto: {
          es: "Un anuncio verificado da más confianza que uno que nadie puede comprobar. Por eso la verificación es el corazón de Innmobiliaria.",
          en: "A verified listing earns more trust than one nobody can check. That's why verification is at the heart of Innmobiliaria.",
        },
      },
    ],
  },

  comoFunciona: {
    titulo: {
      antes: { es: "Publicar tu inmueble ", en: "Listing your property " },
      resaltado: { es: "es", en: "is" },
      despues: { es: " tu registro", en: " your sign-up" },
    },
    subtitulo: {
      es: "No te pedimos un correo para una lista de espera. Te pedimos tu inmueble. Así de directo.",
      en: "We don't ask for an email for a waiting list. We ask for your property. It's that direct.",
    },
    pasos: [
      {
        titulo: { es: "Cuéntanos quién eres", en: "Tell us who you are" },
        texto: {
          es: "Tu nombre y tu WhatsApp. Nada de papeles ni documentos: empezar toma menos de un minuto.",
          en: "Your name and your WhatsApp number. No paperwork, no documents: getting started takes under a minute.",
        },
      },
      {
        titulo: {
          es: "Describe tu inmueble",
          en: "Describe your property",
        },
        texto: {
          es: "Lo esencial: dónde queda, cuánto mide y cuánto esperas por él. Las fotos las subes al terminar, desde tu teléfono.",
          en: "The essentials: where it is, how big it is and what you expect for it. You add photos right after, from your phone.",
        },
      },
      {
        titulo: {
          es: "Listo: quedas registrado",
          en: "Done: you're registered",
        },
        texto: {
          es: "Tu inmueble queda publicado como fundador y los compradores lo encuentran en la búsqueda.",
          en: "Your property is listed as a founding listing, and buyers find it in the search.",
        },
      },
    ],
  },

  queViene: {
    titulo: {
      es: "Lo que ya funciona",
      en: "What already works",
    },
    subtitulo: {
      es: "Del lado de quien compra ya hay búsqueda, verificación y visitas, y tú puedes pedir una sesión de fotos desde tu anuncio.",
      en: "On the buyer's side there is already search, verification and visits, and you can ask for a photo session from your listing.",
    },
    ya: { es: "Ya disponible", en: "Available now" },
    // Cada tarjeta dice la verdad de HOY. Cualitativo y sin cifras (las de fotos están prohibidas por
    // evidencia débil — design-system.md). La estrella y «Ya disponible» los pone el componente.
    tarjetas: [
      {
        titulo: {
          es: "Compradores verificados",
          en: "Verified buyers",
        },
        texto: {
          es: "Quien quiere contactarte verifica antes su WhatsApp: menos curiosos y menos riesgos. Si lo prefieres, solo te escriben quienes se identifican con su cédula.",
          en: "Anyone who wants to contact you verifies their WhatsApp first: fewer window-shoppers and fewer risks. If you prefer, only people who identify themselves with their ID can write to you.",
        },
      },
      {
        titulo: {
          es: "Visitas sin vueltas",
          en: "Visits without the back-and-forth",
        },
        texto: {
          es: "Tú propones hasta tres horarios y el comprador elige uno. A los dos les llega un recordatorio por correo el día antes.",
          en: "You offer up to three times and the buyer picks one. Both of you get an email reminder the day before.",
        },
      },
      {
        titulo: { es: "Fotos que venden", en: "Photos that sell" },
        texto: {
          es: "Pide una sesión de fotos desde «Mi anuncio»: el equipo la agenda contigo por WhatsApp. Una buena foto es lo que más mira quien compra.",
          en: "Ask for a photo session from My listing: the team schedules it with you on WhatsApp. A good photo is the first thing buyers look at.",
        },
      },
    ],
  },

  faq: {
    titulo: {
      antes: { es: "Preguntas ", en: "Frequently asked " },
      resaltado: { es: "frecuentes", en: "questions" },
    },
    preguntas: [
      {
        q: {
          es: "¿Cuánto cuesta publicar?",
          en: "How much does it cost to list?",
        },
        a: {
          es: "Nada. Publicar como fundador es gratis. Y cuando vendas directo por Innmobiliaria, no pagas comisión.",
          en: "Nothing. Listing as a founding seller is free. And when you sell direct through Innmobiliaria, you pay no commission.",
        },
      },
      {
        q: {
          es: "¿Me piden papeles o el Certificado de Tradición y Libertad?",
          en: "Do you ask for paperwork or the Certificado de Tradición y Libertad (CTL, the official record of a property's ownership history)?",
        },
        a: {
          es: "No. Para registrar tu inmueble solo necesitas contarnos lo básico. Ningún documento ni CTL en este paso.",
          en: "No. To register your property you only tell us the basics. No documents and no CTL at this step.",
        },
      },
      {
        q: {
          es: "¿Sirve para venta y para arriendo?",
          en: "Does it work for both sales and rentals?",
        },
        a: {
          es: "Sí. Aceptamos ambas; hoy el foco está en la venta directa, que es donde más te ahorras.",
          en: "Yes. We accept both; today the focus is on direct sales, where you save the most.",
        },
      },
      {
        q: {
          es: "¿Cuándo puedo empezar a recibir compradores?",
          en: "When can I start receiving buyers?",
        },
        a: {
          es: "Desde que publicas: tu anuncio sale en la búsqueda y, si activas el contacto, los compradores que verificaron su WhatsApp te escriben. Tú decides si reciben solicitudes de visita.",
          en: "From the moment you list: your listing shows up in the search and, if you turn on contact, buyers who verified their WhatsApp write to you. You decide whether they can request visits.",
        },
      },
      {
        q: {
          es: "¿Qué pasa con mis datos?",
          en: "What happens to my data?",
        },
        a: {
          es: "Los tratamos según la Ley 1581: solo lo necesario, con tu consentimiento y sin compartirlos con terceros. Puedes leer la política de privacidad enlazada en el registro.",
          en: "We handle it under Colombia's data-protection law, Ley 1581: only what's necessary, with your consent, and without sharing it with third parties. You can read the privacy policy linked in the sign-up.",
        },
      },
    ],
  },

  ctaFinal: {
    titulo: {
      es: "Tu inmueble, listo hoy",
      en: "Your property, ready today",
    },
    texto: {
      es: "Publícalo hoy como fundador. Sin comisión, sin intermediarios y en menos de tres minutos.",
      en: "List it today as a founding seller. No commission, no middlemen, and in under three minutes.",
    },
  },

  // Paquete fundador (4 guías gratuitas). Las guías siguen en español (decisión del S5, vigente): en inglés cada
  // tarjeta lo avisa y el manual lo declara en «Limitaciones».
  paquete: {
    titulo: {
      es: "Tu paquete de fundador",
      en: "Your founding-seller pack",
    },
    subtitulo: {
      es: "Guías gratis para vender directo, sin comisión. Cifras solo con fuente.",
      en: "Free guides to sell direct, with no commission. Figures only with a source.",
    },
    avisoIdioma: { es: "Guía en español", en: "Guide in Spanish" },
    guias: [
      {
        titulo: { es: "Guía fotográfica", en: "Photo guide" },
        desc: {
          es: "Cada espacio con buena luz y orden, desde tu teléfono.",
          en: "Every room in good light and tidy, shot on your phone.",
        },
      },
      {
        titulo: {
          es: "Checklist legal y notarial",
          en: "Legal and notary checklist",
        },
        desc: {
          es: "Los pasos y costos reales del proceso, con fuentes.",
          en: "The real steps and costs of the process, with sources.",
        },
      },
      {
        titulo: {
          es: "Saca tu CTL en 10 minutos",
          en: "Get your CTL in 10 minutes",
        },
        desc: {
          es: "La llave del sello ⭐ de propietario verificado.",
          en: "The CTL is your property's official title record, and the key to the ⭐ verified-owner seal.",
        },
      },
      {
        titulo: { es: "Cómo fijar tu precio", en: "How to set your price" },
        desc: {
          es: "Con herramientas gratuitas y datos, no corazonadas.",
          en: "With free tools and data, not hunches.",
        },
      },
    ],
  },
} as const satisfies Arbol;
