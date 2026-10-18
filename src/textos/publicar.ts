// Flujo «publicar = registro» (3 pasos), confirmación y errores de validación. Redactado en cada
// idioma, no traducido (S5). En inglés, el término local se nombra y se explica en una línea.
import type { Arbol } from "@/i18n/textos";

export const PUBLICAR = {
  meta: {
    titulo: {
      es: "Publica tu inmueble — Innmobiliaria",
      en: "List your property — Innmobiliaria",
    },
    descripcion: {
      es: "Registra tu inmueble como fundador en menos de tres minutos. Sin fotos ni documentos.",
      en: "Register your property as a founding seller in under three minutes. No photos, no documents.",
    },
  },

  progreso: {
    paso: { es: "Paso {paso} de {total}", en: "Step {paso} of {total}" },
    etiquetas: [
      { es: "Tú", en: "You" },
      { es: "Tu inmueble", en: "Your property" },
      { es: "Revisa y envía", en: "Review and send" },
    ],
    aria: {
      es: "Progreso del registro: paso {paso} de {total}",
      en: "Sign-up progress: step {paso} of {total}",
    },
  },

  paso1: {
    titulo: { es: "Empecemos por ti", en: "Let's start with you" },
    subtitulo: {
      es: "Toma menos de un minuto. Sin papeles.",
      en: "It takes under a minute. No paperwork.",
    },
    nombre: {
      etiqueta: { es: "¿Cómo te llamas?", en: "What's your name?" },
      ejemplo: { es: "Tu nombre", en: "Your name" },
    },
    whatsapp: {
      etiqueta: { es: "Tu WhatsApp", en: "Your WhatsApp number" },
      ayuda: {
        es: "Te escribiremos por aquí sobre tu publicación.",
        en: "A Colombian mobile number (10 digits, starting with 3). We'll message you here about your listing.",
      },
    },
    ciudad: {
      etiqueta: {
        es: "¿En qué ciudad está tu inmueble?",
        en: "Which city is your property in?",
      },
    },
  },

  paso2: {
    titulo: { es: "Sobre tu inmueble", en: "About your property" },
    subtitulo: {
      es: "Solo lo básico. Las fotos llegan en la próxima etapa.",
      en: "Just the basics. Photos come in the next stage.",
    },
    operacion: {
      etiqueta: {
        es: "¿Vendes o arriendas?",
        en: "Are you selling or renting out?",
      },
    },
    tipo: {
      etiqueta: { es: "Tipo de inmueble", en: "Property type" },
      ejemplo: { es: "Elige el tipo", en: "Choose the type" },
    },
    localidad: {
      etiqueta: { es: "Localidad", en: "Locality (localidad)" },
      ayuda: {
        es: "Tu localidad de Bogotá. Con ella sabemos cuántos cupos de fundador quedan en tu zona.",
        en: "Bogotá is divided into localidades, its administrative districts. We use yours to show how many founding-seller spots are left in your area.",
      },
      ejemplo: { es: "Elige tu localidad", en: "Choose your locality" },
    },
    barrio: {
      etiqueta: { es: "Barrio", en: "Neighborhood (barrio)" },
      ejemplo: { es: "Elige tu barrio", en: "Choose your neighborhood" },
      primeroLocalidad: {
        es: "Elige primero la localidad",
        en: "Choose the locality first",
      },
      ayuda: {
        es: "Usamos los barrios oficiales de Catastro Bogotá. En el mapa tu anuncio aparece en el área de tu barrio, nunca en un punto.",
        en: "We use the official neighborhoods from Bogotá's cadastre. On the map your listing shows as the area of your neighborhood, never as a point.",
      },
    },
    direccion: {
      etiqueta: {
        es: "Dirección aproximada (opcional)",
        en: "Approximate address (optional)",
      },
      ayuda: {
        es: "No la mostramos públicamente. Nos ayuda a ubicar la zona.",
        en: "We don't show it publicly. It helps us place the area.",
      },
      ejemplo: {
        es: "Ej: Calle 140 con carrera 15",
        en: "e.g. Calle 140 and Carrera 15",
      },
    },
    area: {
      etiqueta: { es: "Área (m²)", en: "Area (m²)" },
    },
    habitaciones: {
      etiqueta: { es: "Habitaciones", en: "Bedrooms" },
    },
    precio: {
      etiqueta: {
        es: "Precio esperado (COP)",
        en: "Expected price (COP, Colombian pesos)",
      },
      ayuda: {
        es: "Un estimado está bien. Lo puedes ajustar después.",
        en: "An estimate is fine. You can adjust it later.",
      },
      ejemplo: { es: "420.000.000", en: "420,000,000" },
    },
  },

  paso3: {
    titulo: { es: "Revisa y publica", en: "Review and submit" },
    subtitulo: {
      es: "Confirma que todo esté bien antes de enviar.",
      en: "Check that everything is right before you send.",
    },
    filas: {
      nombre: { es: "Nombre", en: "Name" },
      whatsapp: { es: "WhatsApp", en: "WhatsApp" },
      ciudad: { es: "Ciudad", en: "City" },
      operacion: { es: "Operación", en: "Listing type" },
      tipo: { es: "Tipo", en: "Property type" },
      localidad: { es: "Localidad", en: "Locality" },
      barrio: { es: "Barrio", en: "Neighborhood" },
      area: { es: "Área", en: "Area" },
      habitaciones: { es: "Habitaciones", en: "Bedrooms" },
      precio: { es: "Precio esperado", en: "Expected price" },
    },
    correo: {
      etiqueta: { es: "Tu correo (opcional)", en: "Your email (optional)" },
      // El paquete fundador NO se envía por correo (ADR 010): se sirve como enlaces en la página.
      ayuda: {
        es: "Para avisarte sobre tu publicación: fotos, sello de verificado y vigencia. Si lo dejas vacío, te escribimos solo por WhatsApp.",
        en: "So we can notify you about your listing: photos, verified seal and renewal. If you leave it empty, we'll write to you on WhatsApp only.",
      },
    },
    consentimiento: {
      antes: {
        es: "Autorizo el tratamiento de mis datos según la ",
        en: "I authorize the processing of my personal data under the ",
      },
      enlace: { es: "política de privacidad", en: "privacy policy" },
      despues: {
        es: " (Ley 1581 de 2012).",
        en: " (Colombia's Ley 1581 of 2012).",
      },
    },
  },

  botones: {
    atras: { es: "← Atrás", en: "← Back" },
    continuar: { es: "Continuar", en: "Continue" },
    publicar: { es: "Publicar mi inmueble", en: "List my property" },
    publicando: { es: "Publicando…", en: "Submitting…" },
  },

  // Etiqueta del campo trampa para bots: invisible para personas, pero es texto del documento.
  honeypot: { es: "No llenar", en: "Do not fill in" },

  envio: {
    demasiados: {
      es: "Recibimos demasiados intentos desde tu conexión. Intenta de nuevo más tarde.",
      en: "We received too many attempts from your connection. Please try again later.",
    },
    generico: {
      es: "No pudimos registrar tu inmueble. Revisa los datos e intenta de nuevo.",
      en: "We couldn't register your property. Check the details and try again.",
    },
    conexion: {
      es: "Hubo un problema de conexión. Revisa tu internet e inténtalo otra vez.",
      en: "There was a connection problem. Check your internet and try again.",
    },
  },

  // Un texto por CÓDIGO de `ERR` (engine/registro/schema.ts); `tests/unit/textos-errores.test.ts`
  // exige que no falte ninguno. Los marcadores se rellenan con `LIMITES`.
  errores: {
    nombreCorto: { es: "Escribe tu nombre", en: "Enter your name" },
    nombreLargo: { es: "Máximo 80 caracteres", en: "80 characters maximum" },
    whatsappVacio: {
      es: "Escribe tu WhatsApp",
      en: "Enter your WhatsApp number",
    },
    whatsappInvalido: {
      es: "Escribe un celular colombiano válido (ej: 300 123 4567)",
      en: "Enter a valid Colombian mobile number (e.g. 300 123 4567)",
    },
    ciudadCorta: { es: "Escribe tu ciudad", en: "Enter your city" },
    ciudadLarga: { es: "Máximo 60 caracteres", en: "60 characters maximum" },
    operacion: {
      es: "Elige si es venta o arriendo",
      en: "Choose whether it's for sale or for rent",
    },
    tipo: {
      es: "Elige el tipo de inmueble",
      en: "Choose the property type",
    },
    localidad: { es: "Elige la localidad", en: "Choose the locality" },
    barrioCorto: {
      es: "Elige tu barrio",
      en: "Choose your neighborhood",
    },
    barrioNoCatalogo: {
      es: "Elige un barrio de la lista de esa localidad",
      en: "Choose a neighborhood from that locality's list",
    },
    barrioLargo: { es: "Máximo 80 caracteres", en: "80 characters maximum" },
    direccionLarga: {
      es: "Máximo 120 caracteres",
      en: "120 characters maximum",
    },
    areaVacia: { es: "Escribe el área en m²", en: "Enter the area in m²" },
    soloEnteros: { es: "Solo números enteros", en: "Whole numbers only" },
    areaRango: {
      es: "El área debe estar entre {areaMin} y {areaMax} m²",
      en: "The area must be between {areaMin} and {areaMax} m²",
    },
    habitacionesVacio: {
      es: "Escribe cuántas habitaciones",
      en: "Enter how many bedrooms",
    },
    habitacionesMax: {
      es: "Máximo {habMax} habitaciones",
      en: "{habMax} bedrooms maximum",
    },
    precioVacio: {
      es: "Escribe el precio esperado",
      en: "Enter the expected price",
    },
    precioNumero: {
      es: "Escribe un número entero, sin decimales",
      en: "Enter a whole number with no decimals",
    },
    precioRango: {
      es: "El precio está fuera de rango",
      en: "The price is out of range",
    },
    consentimiento: {
      es: "Debes aceptar el tratamiento de datos para publicar",
      en: "You must accept the data processing to list your property",
    },
    correoLargo: { es: "Máximo 120 caracteres", en: "120 characters maximum" },
    correoInvalido: {
      es: "Escribe un correo válido o déjalo vacío",
      en: "Enter a valid email or leave it empty",
    },
  },

  confirmacion: {
    meta: {
      titulo: {
        es: "Registro confirmado — Innmobiliaria",
        en: "Registration confirmed — Innmobiliaria",
      },
    },
    titulo: {
      es: "Tu inmueble quedó registrado como fundador",
      en: "Your property is registered as a founding listing",
    },
    intro: {
      es: "Gracias por confiar en Innmobiliaria. Ya eres parte del primer grupo de vendedores directos de Bogotá. Esto es lo que sigue:",
      en: "Thank you for trusting Innmobiliaria. You're now part of the first group of direct sellers in Bogotá. Here's what comes next:",
    },
    siguientes: [
      {
        titulo: {
          es: "Preparamos tus fotos",
          en: "We prepare your photos",
        },
        texto: {
          es: "En la próxima etapa te ayudaremos a que tu inmueble se vea espectacular.",
          en: "In the next stage we'll help your property look its best.",
        },
      },
      {
        titulo: {
          es: "Verificamos tu inmueble",
          en: "We verify your property",
        },
        texto: {
          es: "Un paso sencillo y opcional para ganar el sello de propietario verificado.",
          en: "A simple, optional step to earn the verified-owner seal.",
        },
      },
      {
        titulo: {
          es: "Abrimos a compradores",
          en: "We open to buyers",
        },
        // Sin fecha: no hay una fecha comprometida (decisión del S5).
        texto: {
          es: "Te avisamos por WhatsApp cuando llegue el momento.",
          en: "We'll message you on WhatsApp when the time comes.",
        },
      },
    ],
    volver: { es: "Volver al inicio", en: "Back to the home page" },
    enlace: {
      titulo: {
        es: "Este es tu enlace privado — guárdalo",
        en: "This is your private link — save it",
      },
      texto: {
        es: "Con él vuelves cuando quieras a completar tu anuncio con fotos y descripción. Es solo tuyo: no lo compartas.",
        en: "Use it to come back whenever you like and complete your listing with photos and a description. It's yours alone: don't share it.",
      },
      etiqueta: { es: "Tu enlace privado", en: "Your private link" },
      copiar: { es: "Copiar enlace", en: "Copy link" },
      copiado: { es: "Copiado ✓", en: "Copied ✓" },
      completar: {
        es: "Completar mi anuncio ahora →",
        en: "Complete my listing now →",
      },
    },
  },
} as const satisfies Arbol;
