// «Solicitudes de visita» en Mi anuncio (S8, ADR 016, maquetas 05 y 06 del lado del dueño). Redactada en cada
// idioma, no traducida. El dueño ve, antes de decir que sí, la tarjeta del comprador: su nivel, para qué busca,
// lo que dice tener y a cuántas visitas asistió. Del comprador nunca ve el correo, y el teléfono completo solo
// en una visita confirmada, para pasarle la dirección exacta por su propio WhatsApp. Las horas son de Bogotá.
import type { Arbol } from "@/i18n/textos";

export const SOLICITUDES = {
  titulo: { es: "Solicitudes de visita", en: "Viewing requests" },
  intro: {
    es: "Antes de aceptar, ves quién es: su nivel de verificación, para qué busca y cuánto dice tener.",
    en: "Before you accept, you see who it is: their verification level, what they're looking for and what they say they can spend.",
  },
  cargando: { es: "Guardando…", en: "Saving…" },

  ajuste: {
    titulo: {
      es: "Visitas solo de compradores identificados",
      en: "Viewings from ID-checked buyers only",
    },
    texto: {
      es: "Si la activas, la solicitud de quien solo verificó su WhatsApp queda en espera hasta que tú la aceptes. Quien se identifica con su cédula entra directo. Siguen pudiendo escribirte por WhatsApp.",
      en: "If you switch it on, a request from someone who only verified their WhatsApp stays on hold until you accept it. Someone who checks their ID with their cédula goes straight through. They can still message you on WhatsApp.",
    },
  },

  vacio: {
    titulo: {
      es: "Todavía no hay solicitudes de visita",
      en: "No viewing requests yet",
    },
    texto: {
      es: "Cuando un comprador verificado pida ver tu inmueble, aquí verás su tarjeta antes de decir que sí. Si dejaste tu correo al publicar, te avisamos cuando llegue una.",
      en: "When a verified buyer asks to see your property, you'll see their card here before you say yes. If you left your email when you listed, we'll let you know when one arrives.",
    },
    sinContacto: {
      es: "Para recibir solicitudes, activa antes «Mostrar mi WhatsApp a compradores verificados» en la sección de contacto.",
      en: "To receive requests, first switch on «Show my WhatsApp number to verified buyers» in the contact section.",
    },
  },

  estados: {
    en_espera: { es: "En espera", en: "On hold" },
    pendiente: { es: "Nueva", en: "New" },
    propuesta: { es: "Esperando su respuesta", en: "Waiting for their reply" },
    confirmada: { es: "Visita confirmada", en: "Viewing confirmed" },
    rechazada: { es: "Rechazada", en: "Declined" },
    cancelada: { es: "Cancelada", en: "Cancelled" },
  },

  tarjeta: {
    whatsappVerificado: { es: "WhatsApp verificado", en: "WhatsApp verified" },
    identificado: { es: "Identificado con cédula", en: "ID checked (cédula)" },
    sinIdentificar: { es: "Sin identificar", en: "ID not checked" },
    busca: { es: "Busca", en: "Looking to" },
    presupuesto: { es: "Presupuesto", en: "Budget" },
    presupuestoRango: {
      es: "{min} a {max} millones",
      en: "COP {min} to {max} million",
    },
    presupuestoDesde: {
      es: "Desde {min} millones",
      en: "From COP {min} million",
    },
    presupuestoHasta: {
      es: "Hasta {max} millones",
      en: "Up to COP {max} million",
    },
    presupuestoNoDijo: { es: "No lo dijo", en: "Not stated" },
    presupuestoDeclarado: {
      es: "Lo declara el comprador; no lo verificamos.",
      en: "Stated by the buyer; we don't verify it.",
    },
    pago: { es: "Cómo pagaría", en: "How they'd pay" },
    pagoNoDijo: { es: "No lo dijo", en: "Not stated" },
    visitas: { es: "Visitas", en: "Viewings" },
    primeraVisita: {
      es: "Primera visita en Innmobiliaria",
      en: "First viewing on Innmobiliaria",
    },
    conteoUna: {
      es: "Asistió a {n} de 1 visita en Innmobiliaria",
      en: "Attended {n} of 1 viewing on Innmobiliaria",
    },
    conteoVarias: {
      es: "Asistió a {n} de {m} visitas en Innmobiliaria",
      en: "Attended {n} of {m} viewings on Innmobiliaria",
    },
    telefono: {
      es: "WhatsApp terminado en {fin}",
      en: "WhatsApp ending in {fin}",
    },
  },

  enEspera: {
    titulo: {
      es: "Pediste visitas solo de compradores identificados",
      en: "You asked for viewings from ID-checked buyers only",
    },
    texto: {
      es: "{nombre} todavía no se identificó con su cédula. Su solicitud queda en espera; si quieres, la aceptas igual.",
      en: "{nombre} hasn't checked their ID with their cédula yet. The request is on hold; you can accept it anyway if you like.",
    },
  },

  acciones: {
    proponer: { es: "Proponer horarios", en: "Suggest times" },
    cambiarHorarios: { es: "Cambiar los horarios", en: "Change the times" },
    rechazar: { es: "No me interesa", en: "Not interested" },
    aceptar: { es: "Aceptar igual", en: "Accept anyway" },
    cancelar: { es: "Cancelar la visita", en: "Cancel the viewing" },
    escribir: { es: "Escribirle por WhatsApp", en: "Message on WhatsApp" },
    confirmarCancelar: { es: "Sí, cancelar", en: "Yes, cancel" },
    noCancelar: { es: "No, mantener", en: "No, keep it" },
    confirmarRechazar: { es: "Sí, no me interesa", en: "Yes, not interested" },
    avisoCancelar: {
      es: "Le avisamos al comprador por correo.",
      en: "We'll tell the buyer by email.",
    },
  },

  ninguno: {
    es: "No le sirvió ninguno de los horarios que propusiste: propón otros.",
    en: "None of the times you suggested worked for them: suggest others.",
  },

  horarios: {
    titulo: {
      es: "Propón horarios para {nombre}",
      en: "Suggest times for {nombre}",
    },
    texto: {
      es: "Elige hasta 3. {nombre} confirma uno y los dos reciben un recordatorio por correo el día antes. Las horas son de Bogotá.",
      en: "Pick up to 3. {nombre} confirms one and you both get an email reminder the day before. Times are Bogotá time.",
    },
    fila: { es: "Horario {n}", en: "Time {n}" },
    fecha: { es: "Fecha", en: "Date" },
    hora: { es: "Hora", en: "Time" },
    quitar: { es: "Quitar el horario {n}", en: "Remove time {n}" },
    agregar: {
      es: "Agregar otro horario (hasta 3)",
      en: "Add another time (up to 3)",
    },
    enviar: { es: "Enviar horarios a {nombre}", en: "Send times to {nombre}" },
    enviando: { es: "Enviando…", en: "Sending…" },
    cerrar: { es: "Cerrar", en: "Close" },
    actuales: { es: "Tus horarios", en: "Your times" },
  },

  asistencia: {
    pregunta: {
      es: "¿{nombre} vino a la visita del {fecha}?",
      en: "Did {nombre} come to the viewing on {fecha}?",
    },
    explicacion: {
      es: "Lo que marques aparece en su tarjeta como un conteo («asistió a 2 de 2 visitas»). Nadie ve el detalle.",
      en: "What you mark shows on their card as a count («attended 2 of 2 viewings»). Nobody sees the detail.",
    },
    si: { es: "Sí, vino", en: "Yes, they came" },
    no: { es: "No vino", en: "They didn't come" },
    marcadaSi: { es: "Marcaste que vino.", en: "You marked that they came." },
    marcadaNo: {
      es: "Marcaste que no vino.",
      en: "You marked that they didn't come.",
    },
    cambiar: { es: "Cambiar", en: "Change" },
  },

  // Mensaje que el dueño manda por su WhatsApp con la dirección exacta (la plataforma no la tiene).
  mensajeDireccion: {
    es: "Hola {nombre}, te escribo por la visita al {inmueble} que pediste en Innmobiliaria ({horario}, hora de Bogotá). La dirección exacta es: ",
    en: "Hi {nombre}, I'm writing about the viewing of the {inmueble} you requested on Innmobiliaria ({horario}, Bogotá time). The exact address is: ",
  },
  inmueble: { es: "{tipo} en {barrio}", en: "{tipo} in {barrio}" },

  problemas: {
    ninguno: {
      es: "Elige al menos un horario.",
      en: "Pick at least one time.",
    },
    demasiados: { es: "Son hasta 3 horarios.", en: "Up to 3 times." },
    invalido: {
      es: "Completa la fecha y la hora de cada horario.",
      en: "Fill in the date and time of every slot.",
    },
    repetidos: {
      es: "Hay dos horarios iguales.",
      en: "Two of the times are the same.",
    },
    muy_pronto: {
      es: "Cada horario debe ser al menos una hora después de ahora.",
      en: "Each time must be at least an hour from now.",
    },
    muy_lejos: {
      es: "Los horarios pueden ser hasta dentro de 60 días.",
      en: "Times can be up to 60 days from now.",
    },
    fuera_de_hora: {
      es: "Elige una hora entre las 6:00 a. m. y las 9:00 p. m.",
      en: "Pick a time between 6:00 a.m. and 9:00 p.m.",
    },
  },

  errores: {
    servidor: {
      es: "No pudimos completar la acción. Inténtalo de nuevo en un momento.",
      en: "We couldn't complete that. Please try again in a moment.",
    },
    estado_invalido: {
      es: "Esta solicitud cambió. Recarga la página para ver cómo está.",
      en: "This request changed. Reload the page to see where it stands.",
    },
    visita_futura: {
      es: "Aún no llega la hora de la visita.",
      en: "The viewing time hasn't come yet.",
    },
  },
} as const satisfies Arbol;
