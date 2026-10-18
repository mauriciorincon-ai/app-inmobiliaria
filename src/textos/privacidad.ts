// Política de tratamiento de datos (/privacidad). Ley 1581 de 2012 y Decreto 1377 de 2013. Redactada en
// cada idioma, no traducida (S5): en inglés se nombra cada norma y cada autoridad colombiana y se
// explica en una línea, porque quien la lee puede ser un extranjero o un colombiano que vive afuera.
// Dice solo lo que el código hace. El correo del responsable entra por variable de build y jamás se
// versiona (regla de producto 9): aquí no hay ningún dato del responsable.
import type { Arbol } from "@/i18n/textos";

export const PRIVACIDAD = {
  meta: {
    titulo: {
      es: "Política de tratamiento de datos — Innmobiliaria",
      en: "Personal data policy — Innmobiliaria",
    },
  },
  titulo: {
    es: "Política de tratamiento de datos",
    en: "Personal data policy",
  },
  base: {
    es: "Conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013 de la República de Colombia.",
    en: "Under Law 1581 of 2012 (Ley 1581 de 2012, Colombia's personal data protection law) and Decree 1377 of 2013 of the Republic of Colombia.",
  },

  responsable: {
    titulo: {
      es: "Responsable del tratamiento",
      en: "Who is responsible for your data",
    },
    antes: {
      es: "Innmobiliaria, plataforma de captación de vendedores directos en Bogotá, Colombia. Para cualquier asunto sobre tus datos personales, escríbenos a ",
      en: "Innmobiliaria, a platform for owners who sell direct in Bogotá, Colombia. For anything about your personal data, write to us at ",
    },
  },

  datos: {
    titulo: {
      es: "Qué datos recogemos y con qué finalidad",
      en: "What data we collect and why",
    },
    texto: {
      es: "Recogemos únicamente lo necesario para registrar tu inmueble y contactarte: tu nombre, tu número de WhatsApp, tu ciudad y los datos básicos del inmueble (tipo, zona, área, habitaciones y precio esperado). Los usamos para comunicarnos contigo por WhatsApp sobre tu publicación y las siguientes etapas hacia el lanzamiento. No los vendemos ni los compartimos con terceros con fines comerciales.",
      en: "We collect only what we need to register your property and contact you: your name, your WhatsApp number, your city and the basic details of the property (type, locality, size, bedrooms and expected price). We use them to reach you on WhatsApp about your listing and the next stages toward launch. We don't sell them or share them with third parties for commercial purposes.",
    },
    // Dice solo lo que el código hace: el correo del paso 3 sirve para los avisos de campaña
    // (`engine/envios/plantillas.ts`: fotos, sello, vigencia) y los envía un proveedor de correo
    // (`lib/brevo.ts`) que recibe correo y nombre. El paquete fundador NO se envía por correo: se sirve
    // como enlaces en la página (ADR 010).
    correoOpcional: {
      es: "El correo electrónico es opcional. Si lo das en el último paso del registro, lo usamos solo para enviarte avisos sobre tu publicación, por ejemplo completar las fotos, ganar el sello de propietario verificado o renovar la vigencia. Si lo dejas vacío, te escribimos únicamente por WhatsApp. Los avisos salen a través de un proveedor de correo que actúa por encargo nuestro y recibe tu correo y tu nombre solo para hacer ese envío. Puedes pedirnos que dejemos de enviarte avisos o que borremos tu correo cuando quieras, escribiendo al correo del responsable indicado arriba.",
      en: "Your email is optional. If you give it in the last step of registration, we use it only to send you notices about your listing, for example to add photos, earn the verified-owner seal or renew its validity. If you leave it empty, we contact you by WhatsApp only. The notices go out through an email provider that acts on our behalf and receives your email and name only to send them. You can ask us to stop sending notices, or to delete your email, at any time by writing to the controller's address above.",
    },
    idioma: {
      es: "También guardamos el idioma en que usaste la página (español o inglés), para escribirte en ese mismo idioma. Para recordar tu elección en el navegador usamos una cookie funcional de un año; no sirve para identificarte ni para publicidad.",
      en: "We also keep the language you used on the site (Spanish or English), so we write to you in that same language. To remember your choice in your browser we use a functional cookie that lasts a year; it can't identify you and isn't used for advertising.",
    },
  },

  ficha: {
    titulo: {
      es: "Qué aparece en tu ficha pública",
      en: "What appears on your public listing page",
    },
    antes: {
      es: "Cada inmueble tiene una ficha con un enlace propio que puedes compartir. En ella se muestran los datos del inmueble (tipo, zona, área, habitaciones, precio), las fotos que subas, tu ",
      en: "Each property has a listing page with its own link that you can share. It shows the property's details (type, locality, size, bedrooms, price), the photos you upload, your ",
    },
    nombre: { es: "nombre", en: "name" },
    medio: {
      es: " como quien publica y, si tu inmueble es verificado, ese sello. Tu ",
      en: " as the person who lists it and, if your property is verified, that seal. Your ",
    },
    whatsapp: {
      es: "WhatsApp nunca aparece en la página pública",
      en: "WhatsApp number never appears on the public page",
    },
    despues: {
      es: ": solo lo recibe un comprador que verificó su propio WhatsApp, y únicamente si tú activaste la opción de contacto (desactivable cuando quieras). Tu correo y el número de matrícula nunca son públicos. Mientras dure esta etapa, las fichas no las indexan los buscadores.",
      en: ": only a buyer who has verified their own WhatsApp receives it, and only if you switched the contact option on (you can switch it off whenever you like). Your email and the property's registry number are never public. During this stage, search engines do not index the listing pages.",
    },
  },

  // Lo que se guarda de un comprador (S7, ADR 015). Innmobiliaria solo RECIBE el mensaje de verificación.
  compradores: {
    titulo: {
      es: "Si eres comprador y verificas tu WhatsApp",
      en: "If you are a buyer and verify your WhatsApp",
    },
    texto: {
      es: "Para escribirle a un dueño verificas tu WhatsApp: tú nos envías un código desde tu número y así probamos que es tuyo. Innmobiliaria nunca te envía mensajes por WhatsApp. Guardamos tu nombre, tu número, el idioma, la fecha en que aceptaste y la fecha en que verificaste, y a qué anuncios escribiste y cuándo. El código no se guarda: solo una huella irreversible, de un solo uso y de 10 minutos. Tu número completo no se muestra en ninguna página pública; el dueño del anuncio al que escribes ve tu nombre y los últimos 4 dígitos.",
      en: "To message an owner you verify your WhatsApp: you send us a code from your number, which proves it is yours. Innmobiliaria never sends you WhatsApp messages. We keep your name, your number, your language, when you consented and when you verified, and which listings you messaged and when. The code itself is not kept: only an irreversible fingerprint of it, single-use and valid for 10 minutes. Your full number is shown on no public page; the owner of the listing you message sees your name and the last 4 digits.",
    },
  },

  // Verificación nivel 2 (regla de producto 3): el CTL se VE y nunca se almacena; persisten la
  // matrícula, el resultado y la fecha (`marcar_verificado`).
  verificacion: {
    titulo: {
      es: "Verificación opcional del propietario",
      en: "Optional owner verification",
    },
    texto: {
      es: "Si quieres ganar el sello de propietario verificado, nos muestras tu Certificado de Tradición y Libertad (CTL) y el equipo de Innmobiliaria confirma que el titular coincide con quien publicó. El documento solo se ve: no se sube a la app ni se almacena. Guardamos únicamente el número de matrícula inmobiliaria, la fecha de la verificación y su resultado, y la matrícula nunca es pública.",
      en: "If you want the verified-owner seal, you show us your Certificado de Tradición y Libertad (CTL, the official record of who owns a property) and the Innmobiliaria team checks that the owner named on it matches the person who listed. The document is only looked at: it is not uploaded to the app or stored. We keep only the property's matrícula inmobiliaria (its registry number), the date of the check and its result, and the registry number is never public.",
    },
  },

  autorizacion: {
    titulo: { es: "Tu autorización", en: "Your consent" },
    texto: {
      es: "Al marcar la casilla de consentimiento en el registro, autorizas de forma libre, previa, expresa e informada el tratamiento de tus datos para las finalidades descritas. Sin esa autorización no realizamos ningún registro.",
      en: "By ticking the consent box when you register, you give your free, prior, express and informed authorization for us to process your data for the purposes described. Without it we don't register anyone.",
    },
  },

  derechos: {
    titulo: { es: "Tus derechos", en: "Your rights" },
    antes: {
      es: "Como titular puedes, en cualquier momento: conocer, actualizar y rectificar tus datos; solicitar prueba de tu autorización; ser informado sobre el uso que les damos; presentar quejas ante la Superintendencia de Industria y Comercio; revocar la autorización y solicitar la supresión de tus datos cuando no exista un deber legal de conservarlos. Para ejercerlos, escríbenos a ",
      en: "As the data subject you can, at any time: access, update and correct your data; ask for proof of your consent; be told how we use your data; file a complaint with the Superintendencia de Industria y Comercio (Colombia's data-protection authority); and withdraw your consent and ask us to delete your data when we have no legal duty to keep it. To exercise any of these rights, write to us at ",
    },
  },

  seguridad: {
    titulo: {
      es: "Seguridad y conservación",
      en: "Security and retention",
    },
    texto: {
      es: "Tus datos se almacenan con controles de acceso: solo el operador autorizado de Innmobiliaria puede consultarlos. Los conservamos mientras dure la campaña de expectativa y el proceso de lanzamiento, salvo que solicites su supresión antes.",
      en: "Your data is stored with access controls: only Innmobiliaria's authorized operator can view it. We keep it for as long as the pre-launch campaign and the launch process last, unless you ask us to delete it sooner.",
    },
  },
} as const satisfies Arbol;
