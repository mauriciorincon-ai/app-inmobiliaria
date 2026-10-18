// Identificarse con la cédula (S8, ADR 016, maqueta 04). Redactada en cada idioma, no traducida. Lo que la
// pantalla promete es lo que el sistema hace: el número, la fecha de expedición y el nombre viajan al
// proveedor de validación y no se guardan; se guarda solo el resultado y la fecha; el comprador puede borrar
// su identificación cuando quiera. Es opcional: sin ella se puede escribir a los dueños y pedir visitas.
import type { Arbol } from "@/i18n/textos";

export const IDENTIDAD = {
  meta: {
    titulo: {
      es: "Identifícate — Innmobiliaria",
      en: "Check your ID — Innmobiliaria",
    },
  },

  insignia: {
    es: "Comprador identificado · opcional",
    en: "ID-checked buyer · optional",
  },
  titulo: {
    es: "Identifícate con tu cédula",
    en: "Check your ID with your cédula",
  },
  subtitulo: {
    es: "Validamos que tu nombre y tu número de cédula coinciden en la Registraduría. Sube tu confianza para visitas y ofertas: algunos dueños solo reciben a compradores identificados.",
    en: "We check that your name and cédula number (Colombia's national ID) match the Registraduría, the national registry. It raises your trust for viewings and offers: some owners only welcome ID-checked buyers.",
  },
  limite: {
    es: "Por ahora, solo cédula de ciudadanía colombiana.",
    en: "For now, Colombian citizen cédulas only.",
  },

  estado: {
    grupo: { es: "Tu nivel", en: "Your level" },
    whatsappVerificado: { es: "WhatsApp verificado", en: "WhatsApp verified" },
    whatsappSinVerificar: {
      es: "WhatsApp sin verificar",
      en: "WhatsApp not verified",
    },
    identificado: { es: "Identificado", en: "ID checked" },
    sinIdentificar: { es: "Sin identificar", en: "ID not checked" },
  },

  cargando: { es: "Un momento…", en: "One moment…" },

  primeroWhatsapp: {
    titulo: {
      es: "Primero verifica tu WhatsApp",
      en: "First, verify your WhatsApp",
    },
    texto: {
      es: "La identificación se suma a la verificación de tu número; no la reemplaza.",
      en: "The ID check adds to your number's verification; it doesn't replace it.",
    },
    boton: { es: "Verificar mi WhatsApp", en: "Verify my WhatsApp" },
  },

  formulario: {
    cedula: { es: "Número de cédula", en: "Cédula number" },
    cedulaAyuda: {
      es: "Solo números, sin puntos.",
      en: "Numbers only, no dots.",
    },
    fecha: { es: "Fecha de expedición", en: "Date of issue" },
    fechaAyuda: {
      es: "Está al respaldo de tu cédula.",
      en: "It's on the back of your cédula.",
    },
    nombre: {
      es: "Nombres y apellidos, como en la cédula",
      en: "Full name, as on the cédula",
    },
    consentimiento: {
      es: "Autorizo que mi número de cédula, la fecha de expedición y mi nombre se consulten con un proveedor de validación, que los contrasta con la Registraduría, para identificarme (Ley 1581). Innmobiliaria guarda solo el resultado y la fecha, nunca el número, una foto ni el documento.",
      en: "I authorize my cédula number, date of issue and name to be checked with an identity-validation provider, which compares them with the Registraduría, to confirm my identity (Colombia's Ley 1581). Innmobiliaria keeps only the result and the date, never the number, a photo or the document.",
    },
    politica: { es: "Política de datos", en: "Data policy" },
    enviar: { es: "Validar mi cédula", en: "Check my cédula" },
    enviando: {
      es: "Consultando la Registraduría…",
      en: "Checking with the Registraduría…",
    },
  },

  errores: {
    cedula: {
      es: "Escribe tu número de cédula, de 6 a 10 dígitos.",
      en: "Enter your cédula number, 6 to 10 digits.",
    },
    fecha: {
      es: "Escribe una fecha de expedición válida.",
      en: "Enter a valid date of issue.",
    },
    nombre: {
      es: "Escribe tu nombre completo, con nombres y apellidos.",
      en: "Enter your full name, first names and surnames.",
    },
    consentimiento: {
      es: "Necesitamos tu autorización para consultar tus datos.",
      en: "We need your authorization to check your details.",
    },
    servidor: {
      es: "No pudimos hacer la validación. Inténtalo de nuevo en un momento.",
      en: "We couldn't run the check. Please try again in a moment.",
    },
  },

  resultado: {
    identificado: {
      titulo: {
        es: "Listo, {nombre}: tu identificación quedó validada",
        en: "Done, {nombre}: your ID is checked",
      },
      texto: {
        es: "Los dueños verán «Comprador identificado» y tu nombre en tu tarjeta. Tu número de cédula no lo ve nadie.",
        en: "Owners will see «ID-checked buyer» and your name on your card. Nobody sees your cédula number.",
      },
      seguir: { es: "Volver", en: "Go back" },
      buscar: { es: "Buscar inmuebles", en: "Search homes" },
      borrar: { es: "Borrar mi identificación", en: "Delete my ID check" },
      borrando: { es: "Borrando…", en: "Deleting…" },
    },
    borrada: {
      titulo: {
        es: "Borramos tu identificación",
        en: "We deleted your ID check",
      },
      texto: {
        es: "Los dueños dejan de ver «Comprador identificado» en tu tarjeta. Tu WhatsApp sigue verificado y puedes identificarte de nuevo cuando quieras.",
        en: "Owners no longer see «ID-checked buyer» on your card. Your WhatsApp stays verified and you can check your ID again whenever you like.",
      },
    },
    noCoincide: {
      titulo: {
        es: "Los datos no coinciden con la Registraduría",
        en: "The details don't match the Registraduría",
      },
      texto: {
        es: "Escribe el nombre exactamente como aparece en tu cédula, con los dos apellidos, y revisa la fecha de expedición.",
        en: "Type your name exactly as it appears on your cédula, with both surnames, and check the date of issue.",
      },
      reintentar: { es: "Intentar de nuevo", en: "Try again" },
    },
    noDisponible: {
      titulo: {
        es: "Ahora no pudimos consultar la Registraduría",
        en: "We couldn't reach the Registraduría right now",
      },
      texto: {
        es: "No gastaste ningún intento. Vuelve a probar en unos minutos; mientras tanto puedes escribirles a los dueños.",
        en: "That didn't use up any of your tries. Try again in a few minutes; meanwhile you can still message owners.",
      },
      reintentar: { es: "Intentar de nuevo", en: "Try again" },
    },
    tope: {
      titulo: {
        es: "Hoy no podemos validar más cédulas",
        en: "We can't check more IDs right now",
      },
      texto: {
        es: "Llegamos al tope gratuito del servicio de identificación. Tu WhatsApp sigue verificado y puedes escribirles a los dueños; vuelve más adelante para identificarte.",
        en: "We reached the free limit of the ID service. Your WhatsApp is still verified and you can message owners; come back later to check your ID.",
      },
    },
    topeComprador: {
      titulo: {
        es: "Ya usaste tus tres intentos",
        en: "You've used your three tries",
      },
      texto: {
        es: "Para cuidar el servicio, cada persona tiene tres intentos de validación. Tu WhatsApp sigue verificado. Si crees que es un error, escríbenos al correo del responsable que aparece en la política de datos.",
        en: "To look after the service, each person gets three tries. Your WhatsApp is still verified. If you think this is a mistake, write to the contact email in the data policy.",
      },
    },
  },

  garantias: {
    grupo: { es: "Tus datos", en: "Your data" },
    foto: {
      es: "No subes una foto de tu cédula ni la guardamos.",
      en: "You don't upload a photo of your cédula and we don't keep one.",
    },
    dueno: {
      es: "El dueño ve tu nombre y tu nivel, nunca tu número de cédula.",
      en: "The owner sees your name and your level, never your cédula number.",
    },
    borrar: {
      es: "Puedes pedir que borremos tu identificación cuando quieras.",
      en: "You can ask us to delete your ID check at any time.",
    },
  },
} as const satisfies Arbol;
