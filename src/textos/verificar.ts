// Verificación del WhatsApp del comprador (S7, ADR 015). Redactada en cada idioma, no traducida. Innmobiliaria
// jamás envía mensajes: el comprador nos escribe con un código y así prueba que el número es suyo. Las frases
// cuentan SOLO lo que la página hace hoy: la cédula, la tarjeta del comprador y la agenda de visitas llegan
// en sprints posteriores y no se prometen aquí. El inglés explica Ley 1581 la primera vez.
import type { Arbol } from "@/i18n/textos";

export const VERIFICAR = {
  meta: {
    titulo: {
      es: "Verifica tu WhatsApp — Innmobiliaria",
      en: "Verify your WhatsApp — Innmobiliaria",
    },
  },

  insignia: { es: "Comprador verificado", en: "Verified buyer" },
  titulo: {
    es: "Verifica que tu WhatsApp es tuyo",
    en: "Verify that your WhatsApp is yours",
  },
  subtitulo: {
    es: "Así los dueños saben que les escribe una persona real con un número real. Verificamos que el número es tuyo, no quién eres.",
    en: "That way owners know a real person with a real number is writing to them. We check that the number is yours, not who you are.",
  },

  pasos: {
    grupo: { es: "Cómo funciona", en: "How it works" },
    uno: {
      es: "Escribe tu nombre y tu número.",
      en: "Enter your name and number.",
    },
    dos: {
      es: "WhatsApp se abre con un código ya escrito hacia Innmobiliaria. Envíalo sin cambiarlo.",
      en: "WhatsApp opens with a code already typed to Innmobiliaria. Send it as it is.",
    },
    tres: {
      es: "Vuelves aquí y quedas verificado.",
      en: "Come back here and you're verified.",
    },
  },

  cargando: { es: "Un momento…", en: "One moment…" },

  formulario: {
    nombre: { es: "Cómo te llamas", en: "Your name" },
    telefono: { es: "Tu WhatsApp", en: "Your WhatsApp number" },
    telefonoAyuda: {
      es: "Un celular de Colombia, por ahora. Un dueño lo ve solo cuando tú le escribes.",
      en: "A Colombian mobile number, for now. An owner sees it only when you write to them.",
    },
    consentimiento: {
      es: "Acepto que Innmobiliaria guarde mi nombre y mi número para verificarme y registrar mis contactos (Ley 1581).",
      en: "I agree that Innmobiliaria keeps my name and number to verify me and log my contacts (Colombia's data-protection law, Ley 1581).",
    },
    politica: { es: "Política de datos", en: "Data policy" },
    enviar: { es: "Verificar con WhatsApp", en: "Verify with WhatsApp" },
    enviando: { es: "Preparando tu código…", en: "Getting your code ready…" },
  },

  errores: {
    nombre: {
      es: "Escribe tu nombre (mínimo 2 letras).",
      en: "Enter your name (at least 2 letters).",
    },
    telefono: {
      es: "Escribe un celular de Colombia: 10 dígitos que empiecen por 3.",
      en: "Enter a Colombian mobile number: 10 digits starting with 3.",
    },
    consentimiento: {
      es: "Necesitamos tu autorización para verificarte.",
      en: "We need your consent to verify you.",
    },
    tope: {
      es: "Pediste varios códigos seguidos. Espera un rato e inténtalo de nuevo.",
      en: "You asked for several codes in a row. Wait a while and try again.",
    },
    noDisponible: {
      es: "La verificación no está disponible en este momento. Inténtalo más tarde.",
      en: "Verification isn't available right now. Try again later.",
    },
    servidor: {
      es: "No pudimos preparar tu código. Inténtalo de nuevo.",
      en: "We couldn't get your code ready. Please try again.",
    },
  },

  esperando: {
    aviso: {
      es: "WhatsApp se abrió con este mensaje para Innmobiliaria:",
      en: "WhatsApp opened with this message to Innmobiliaria:",
    },
    codigoEtiqueta: { es: "Tu código", en: "Your code" },
    estado: {
      es: "Esperando tu mensaje… Envíalo sin cambiarlo y vuelve aquí.",
      en: "Waiting for your message… Send it as it is and come back here.",
    },
    vence: {
      es: "El código vence en 10 minutos.",
      en: "The code expires in 10 minutes.",
    },
    abrir: {
      es: "Abrir WhatsApp con el código",
      en: "Open WhatsApp with the code",
    },
    yaEnvie: { es: "Ya lo envié", en: "I sent it" },
    noAbrio: { es: "No se abrió WhatsApp", en: "WhatsApp didn't open" },
    ayuda: {
      es: "Copia el código y envíalo desde tu WhatsApp al número de Innmobiliaria: {numero}.",
      en: "Copy the code and send it from your WhatsApp to Innmobiliaria's number: {numero}.",
    },
    copiar: { es: "Copiar el código", en: "Copy the code" },
    copiado: { es: "Código copiado.", en: "Code copied." },
  },

  listo: {
    titulo: {
      es: "Tu WhatsApp quedó verificado",
      en: "Your WhatsApp is verified",
    },
    texto: {
      es: "Ya puedes escribirles a los dueños. Lo hiciste una vez: en este navegador no te lo volvemos a pedir.",
      en: "You can now message owners. You did it once: in this browser we won't ask again.",
    },
    volver: { es: "Volver al anuncio", en: "Back to the listing" },
    buscar: { es: "Buscar inmuebles", en: "Search properties" },
  },

  otroNumero: {
    titulo: {
      es: "El código llegó desde otro número",
      en: "The code came from a different number",
    },
    texto: {
      es: "Revisa que el número de abajo sea el de tu WhatsApp y vuelve a intentarlo. Si el código venció (dura 10 minutos), te damos uno nuevo.",
      en: "Check that the number below is your WhatsApp number and try again. If the code expired (it lasts 10 minutes), we'll give you a new one.",
    },
    reintentar: { es: "Pedir otro código", en: "Get a new code" },
  },

  vencido: {
    titulo: { es: "El código venció", en: "The code expired" },
    texto: {
      es: "Un código dura 10 minutos y se usa una sola vez. Te damos uno nuevo.",
      en: "A code lasts 10 minutes and works once. We'll give you a new one.",
    },
    reintentar: { es: "Pedir otro código", en: "Get a new code" },
  },

  // Lo que queda escrito en WhatsApp al abrirlo hacia el número de Innmobiliaria. `{codigo}` es INN-XXXXXX.
  mensajeWhatsapp: {
    es: "Hola Innmobiliaria, este es mi código para verificar mi WhatsApp: {codigo}",
    en: "Hi Innmobiliaria, this is my code to verify my WhatsApp: {codigo}",
  },
} as const satisfies Arbol;
