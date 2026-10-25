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
      es: "Recogemos únicamente lo necesario para registrar tu inmueble y contactarte: tu nombre, tu número de WhatsApp, tu ciudad y los datos básicos del inmueble (tipo, zona, área, habitaciones y precio esperado). Los usamos para que el equipo de Innmobiliaria pueda escribirte a mano por WhatsApp sobre tu publicación y las siguientes etapas hacia el lanzamiento; Innmobiliaria no envía mensajes automáticos por WhatsApp. No los vendemos ni los compartimos con terceros con fines comerciales.",
      en: "We collect only what we need to register your property and contact you: your name, your WhatsApp number, your city and the basic details of the property (type, locality, size, bedrooms and expected price). We use them so the Innmobiliaria team can write to you by hand on WhatsApp about your listing and the next stages toward launch; Innmobiliaria does not send automatic WhatsApp messages. We don't sell them or share them with third parties for commercial purposes.",
    },
    // Dice solo lo que el código hace: el correo del paso 3 sirve para los avisos de campaña
    // (`engine/envios/plantillas.ts`: fotos, sello, vigencia) y los envía un proveedor de correo
    // (`lib/brevo.ts`) que recibe correo y nombre. El paquete fundador NO se envía por correo: se sirve
    // como enlaces en la página (ADR 010).
    correoOpcional: {
      es: "El correo electrónico es opcional. Si lo das en el último paso del registro, lo usamos solo para enviarte avisos sobre tu publicación, por ejemplo completar las fotos, ganar el sello de propietario verificado o renovar la vigencia. Si lo dejas vacío, no recibes avisos automáticos: el equipo solo puede escribirte a mano por WhatsApp. Los avisos salen a través de un proveedor de correo que actúa por encargo nuestro y recibe tu correo y tu nombre solo para hacer ese envío. Puedes pedirnos que dejemos de enviarte avisos o que borremos tu correo cuando quieras, escribiendo al correo del responsable indicado arriba.",
      en: "Your email is optional. If you give it in the last step of registration, we use it only to send you notices about your listing, for example to add photos, earn the verified-owner seal or renew its validity. If you leave it empty, you receive no automatic notices: the team can only write to you by hand on WhatsApp. The notices go out through an email provider that acts on our behalf and receives your email and name only to send them. You can ask us to stop sending notices, or to delete your email, at any time by writing to the controller's address above.",
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
      es: "Para escribirle a un dueño verificas tu WhatsApp: tú nos envías un código desde tu número y así probamos que es tuyo. Innmobiliaria no te envía mensajes automáticos por WhatsApp; solo si pides visitar la sala de ventas de un proyecto nuevo, el equipo te escribe a mano la dirección una vez confirmada (ver «Si pides una visita»). Guardamos tu nombre, tu número, el idioma, la fecha en que aceptaste y la fecha en que verificaste, y a qué anuncios escribiste y cuándo. El código no se guarda: solo una huella irreversible, de un solo uso y de 10 minutos; de la sesión de tu navegador y de tu conexión solo guardamos también huellas irreversibles, para limitar abusos. Tu número completo no se muestra en ninguna página pública; el dueño del anuncio al que escribes ve tu nombre y los últimos 4 dígitos.",
      en: "To message an owner you verify your WhatsApp: you send us a code from your number, which proves it is yours. Innmobiliaria sends you no automatic WhatsApp messages; only if you ask to visit a new-home sales room does the team write you the address by hand once confirmed (see «If you request a viewing»). We keep your name, your number, your language, when you consented and when you verified, and which listings you messaged and when. The code itself is not kept: only an irreversible fingerprint of it, single-use and valid for 10 minutes; for your browser session and your connection we likewise keep only irreversible fingerprints, to limit abuse. Your full number is shown on no public page; the owner of the listing you message sees your name and the last 4 digits.",
    },
  },

  // Identificación con la cédula (S8, ADR 016). El número NO se guarda; viaja a un proveedor de validación,
  // que actúa por encargo nuestro y está fuera de Colombia (transferencia internacional, con la autorización
  // del titular al marcar la casilla de esa pantalla).
  identificacion: {
    titulo: {
      es: "Si te identificas con tu cédula",
      en: "If you check your ID with your cédula",
    },
    texto: {
      es: "Identificarte es opcional. Tu número de cédula, la fecha de expedición y tu nombre se envían a un proveedor de validación de identidad, que actúa por encargo nuestro y los contrasta con la Registraduría Nacional del Estado Civil. Ese proveedor está fuera de Colombia, así que el envío es una transferencia internacional de datos que haces con tu autorización al marcar la casilla de esa pantalla. Innmobiliaria NO guarda tu número de cédula, ni la fecha de expedición, ni una foto, ni el documento: guardamos solo que la validación salió bien, el proveedor que la hizo y la fecha, y un registro de cada consulta (sin tus datos) para respetar el tope de uso del servicio. Los dueños ven «Comprador identificado» y tu nombre, nunca tu número de cédula. Puedes borrar tu identificación cuando quieras desde la misma pantalla.",
      en: "Checking your ID is optional. Your cédula number, date of issue and name are sent to an identity-validation provider, which acts on our behalf and compares them with the Registraduría Nacional del Estado Civil (Colombia's civil registry). That provider is outside Colombia, so the transfer is an international data transfer that you authorize by ticking the box on that screen. Innmobiliaria does NOT keep your cédula number, your date of issue, a photo or the document: we keep only that the check succeeded, which provider ran it and the date, plus a record of each query (without your details) so we can respect the service's usage limit. Owners see «ID-checked buyer» and your name, never your cédula number. You can delete your ID check at any time from the same screen.",
    },
  },

  // Visitas (S8, ADR 016): el correo del comprador, lo que declara y el conteo de asistencia.
  visitas: {
    titulo: {
      es: "Si pides una visita",
      en: "If you request a viewing",
    },
    texto: {
      es: "Para pedir una visita nos das un correo, que usamos solo para los avisos de esa visita: horarios propuestos, confirmación, cancelación y un recordatorio el día antes. Guardamos también lo que declaras en la solicitud (para qué buscas, tu presupuesto, cómo pagarías y tu mensaje) y los horarios. El dueño ve tu nombre, los últimos 4 dígitos de tu número, tu nivel de verificación y lo que declaraste; el correo nunca se lo mostramos. Cuando confirmas un horario, el dueño ve tu número completo para enviarte la dirección exacta por su propio WhatsApp. Después de la visita, el dueño marca si asististe y los dueños ven solo un conteo («asistió a 2 de 3 visitas»), sin detalle. Los avisos automáticos van por correo: Innmobiliaria no te envía mensajes automáticos por WhatsApp. Los avisos salen a través de un proveedor de correo que actúa por encargo nuestro.",
      en: "To request a viewing you give us an email, which we use only for the notices of that viewing: suggested times, confirmation, cancellation and a reminder the day before. We also keep what you state in the request (what you're looking for, your budget, how you'd pay and your message) and the times. The owner sees your name, the last 4 digits of your number, your verification level and what you stated; we never show them your email. When you confirm a time, the owner sees your full number so they can send you the exact address on their own WhatsApp. After the viewing, the owner marks whether you attended, and owners see only a count («attended 2 of 3 viewings»), without detail. Automatic notices go by email: Innmobiliaria sends you no automatic WhatsApp messages. Notices are sent through an email provider that acts on our behalf.",
    },
    // Visita a una sala de ventas de vivienda nueva (S13): la coordina el equipo de Innmobiliaria, a mano.
    salas: {
      es: "Si pides visitar la sala de ventas de un proyecto nuevo, la coordina el equipo de Innmobiliaria mientras la constructora no esté en la plataforma. Guardamos lo mismo que en cualquier visita (tu correo para los avisos, el proyecto y la franja que elegiste, y los horarios) y el equipo ve tu nombre, los últimos 4 dígitos de tu número y tu nivel de verificación. El equipo escribe a la sala desde su propio teléfono, sin darle tu nombre ni tu número, y propone el horario. Cuando confirmas uno, el equipo ve tu número completo y te escribe a mano por WhatsApp la dirección de la sala. Los teléfonos y direcciones de las salas los ve solo el equipo y nunca se publican. Después de la visita no marcamos tu asistencia.",
      en: "If you ask to visit the sales room of a new-home project, the Innmobiliaria team coordinates it while the builder is not on the platform. We keep the same as for any viewing (your email for the notices, the project and the time slot you chose, and the times) and the team sees your name, the last 4 digits of your number and your verification level. The team writes to the sales room from its own phone, without giving it your name or your number, and proposes a time. When you confirm one, the team sees your full number and writes you the room's address by hand on WhatsApp. Only the team sees the sales rooms' phones and addresses, and they are never published. After the visit we do not mark whether you attended.",
    },
    conservacion: {
      es: "Si nunca verificas tu número, borramos tu nombre y tu número a los 30 días; los códigos vencidos sin usar, a los 7. Tus solicitudes de visita y tu correo se conservan mientras sigas verificado; puedes pedir que los borremos escribiendo al correo del responsable.",
      en: "If you never verify your number, we delete your name and number after 30 days; expired unused codes after 7. Your viewing requests and email are kept while you stay verified; you can ask us to delete them by writing to the data controller.",
    },
  },

  // Lo que se queda en tu teléfono (S10 «lo que puedes pagar», S12 el arriendo, S13 el subsidio): dice solo lo que el
  // código hace. Los números viven en `localStorage` y ninguna petición los lleva; solo viaja el precio máximo calculado.
  telefono: {
    titulo: {
      es: "Lo que se queda en tu teléfono",
      en: "What stays on your phone",
    },
    texto: {
      es: "Tus ingresos, la cuota inicial, el plazo y la tasa que escribes en «Lo que puedes pagar», y el arriendo que escribes en la vivienda nueva, se guardan solo en el almacenamiento de tu navegador, en tu teléfono: no los enviamos ni los guardamos en nuestros servidores. Las cuentas de «¿Te alcanza con subsidio?» y de «la espera» las hace tu propio teléfono. Lo único que viaja es el precio máximo que se calcula a partir de ahí, para filtrar los resultados: tus ingresos no viajan, aunque ese precio sale de ellos. Puedes borrarlos desde las mismas pantallas o limpiando los datos de tu navegador.",
      en: "The income, down payment, term and rate you type into «What you can afford», and the rent you type for new homes, are stored only in your browser's storage, on your phone: we neither receive nor keep them on our servers. The sums for «Can a subsidy get you there?» and for «the wait» are done by your own phone. The only thing that travels is the maximum price computed from them, to filter the results: your income does not travel, although that price is derived from it. You can delete them from the same screens or by clearing your browser data.",
    },
  },

  // Guardar y avisar (S9, ADR 017). Dice solo lo que el código hace: la purga borra las alertas sin confirmar a
  // los 7 días y las dadas de baja a los 30, y el historial de precios a los 90.
  alertas: {
    titulo: {
      es: "Si creas una alerta por correo",
      en: "If you create an email alert",
    },
    texto: {
      es: "Para avisarte guardamos tu correo, el nombre que le pongas a la alerta, los criterios de la búsqueda (operación, tipo, localidad, precio, habitaciones y, si la dibujaste, la zona), el idioma, la fecha en que aceptaste y una huella irreversible de tu conexión para limitar abusos. No te avisamos nada hasta que confirmes el correo con un enlace: las alertas sin confirmar se borran a los 7 días. Recibes un resumen al día como máximo, y cada correo trae un enlace para dejar de recibirlo con un clic, sin iniciar sesión. Cuando te das de baja o borras la alerta, la conservamos 30 días solo para no volver a escribirte y luego la borramos. Los correos salen a través de un proveedor de correo que actúa por encargo nuestro. Innmobiliaria no te envía mensajes por WhatsApp.",
      en: "To alert you we keep your email, the name you give the alert, the search criteria (deal type, property type, locality, price, bedrooms and, if you drew one, the area), your language, the date you consented and an irreversible fingerprint of your connection to limit abuse. We tell you nothing until you confirm your email with a link: unconfirmed alerts are deleted after 7 days. You get one digest a day at most, and every email carries a link to stop receiving it with one click, without signing in. When you unsubscribe or delete the alert, we keep it for 30 days only so we don't write to you again, and then delete it. The emails go out through an email provider that acts on our behalf. Innmobiliaria does not send you WhatsApp messages.",
    },
  },
  guardados: {
    titulo: {
      es: "Si guardas anuncios, comparas o compartes listas",
      en: "If you save listings, compare them or share lists",
    },
    texto: {
      es: "Tus favoritos se guardan en tu teléfono, en el almacenamiento del navegador, y no los guardamos en nuestros servidores mientras no verifiques tu WhatsApp (solo consultamos los datos públicos de esos anuncios para mostrártelos); al verificarlo los asociamos a esa verificación para que los veas desde otro dispositivo. Una lista compartida se abre con un enlace: quien lo tenga ve los anuncios de la lista y las notas, con el primer nombre de quien las escribió; escribir una nota exige tener el WhatsApp verificado. Las notas se conservan mientras exista la lista: si quitas un anuncio o borras la lista, se borran también sus notas. Puedes dejar de compartir cuando quieras y el enlace deja de funcionar. Cuando un dueño cambia el precio de su anuncio guardamos el precio anterior y el nuevo para avisar las bajas, y lo borramos a los 90 días.",
      en: "Your favorites are kept on your phone, in your browser's storage, and we don't store them on our servers until you verify your WhatsApp (we only look up the public data of those listings to show them to you); when you do, we tie them to that verification so you can see them from another device. A shared list opens with a link: whoever has it sees the list's listings and its notes, with the first name of whoever wrote them; writing a note requires a verified WhatsApp. Notes are kept as long as the list exists: if you remove a listing or delete the list, its notes are deleted too. You can stop sharing whenever you like and the link stops working. When an owner changes a listing's price we keep the old and new price so we can tell about drops, and we delete that history after 90 days.",
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
      es: "Tus datos se almacenan con controles de acceso: solo el operador autorizado de Innmobiliaria puede consultarlos, salvo lo que cada ficha o solicitud muestra a quien corresponde (por ejemplo, el dueño de un anuncio ve las solicitudes de visita de ese anuncio). Los conservamos mientras dure la campaña de expectativa y el proceso de lanzamiento, salvo que solicites su supresión antes.",
      en: "Your data is stored with access controls: only Innmobiliaria's authorized operator can view it, apart from what each listing or request shows to the person it concerns (for example, a listing's owner sees the viewing requests for that listing). We keep it for as long as the pre-launch campaign and the launch process last, unless you ask us to delete it sooner.",
    },
  },
} as const satisfies Arbol;
