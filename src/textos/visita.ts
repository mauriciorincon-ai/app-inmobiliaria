// Pedir una visita y seguirla (S8, ADR 016, maqueta 06 del lado del comprador). Redactada en cada idioma, no
// traducida. El formulario de pedir NO está en la maqueta: se arma con el vocabulario de la tarjeta del dueño
// (maqueta 05). Innmobiliaria jamás escribe por WhatsApp: los avisos van por correo y la dirección exacta la
// da el dueño por su WhatsApp. Todas las horas son de Bogotá.
import type { Arbol } from "@/i18n/textos";

export const VISITA = {
  // Vocabulario compartido con la tarjeta que ve el dueño (`solicitudes.ts`).
  intencion: {
    vivir: { es: "Para vivir", en: "To live in" },
    invertir: { es: "Para invertir", en: "As an investment" },
  },
  formasPago: {
    hipotecario: { es: "Crédito hipotecario", en: "Mortgage" },
    ahorros: { es: "Ahorros", en: "Savings" },
    venta_inmueble: {
      es: "Venta de otro inmueble",
      en: "Sale of another property",
    },
    otro: { es: "Otro", en: "Other" },
  },

  pedir: {
    meta: {
      titulo: {
        es: "Pedir una visita — Innmobiliaria",
        en: "Request a viewing — Innmobiliaria",
      },
    },
    titulo: { es: "Pide una visita", en: "Request a viewing" },
    subtitulo: {
      es: "Cuéntale al dueño quién eres y para qué buscas. Él te propone horarios y tú eliges uno.",
      en: "Tell the owner who you are and what you're looking for. They offer times and you pick one.",
    },
    cargando: { es: "Un momento…", en: "One moment…" },
    primeroWhatsapp: {
      titulo: {
        es: "Para pedir una visita, verifica tu WhatsApp",
        en: "To request a viewing, verify your WhatsApp",
      },
      texto: {
        es: "Es una sola vez y toma unos 30 segundos.",
        en: "It's one time and takes about 30 seconds.",
      },
      boton: { es: "Verificar mi WhatsApp", en: "Verify my WhatsApp" },
    },
    soloIdentificados: {
      titulo: {
        es: "Este dueño prefiere compradores identificados",
        en: "This owner prefers ID-checked buyers",
      },
      texto: {
        es: "Si pides la visita sin identificarte, tu solicitud queda en espera hasta que el dueño la acepte. Si te identificas con tu cédula, entra directo.",
        en: "If you request a viewing without checking your ID, your request stays on hold until the owner accepts it. If you check your ID with your cédula, it goes straight through.",
      },
      boton: { es: "Identificarme con mi cédula", en: "Check my ID" },
    },
    formulario: {
      intencion: {
        es: "¿Para qué lo buscas?",
        en: "What are you looking for?",
      },
      presupuesto: {
        es: "Tu presupuesto (opcional)",
        en: "Your budget (optional)",
      },
      presupuestoAyuda: {
        es: "En millones de pesos. Lo declaras tú; no lo verificamos.",
        en: "In millions of pesos. You state it; we don't verify it.",
      },
      desde: { es: "Desde (millones)", en: "From (millions)" },
      hasta: { es: "Hasta (millones)", en: "Up to (millions)" },
      pago: {
        es: "¿Cómo pagarías? (opcional)",
        en: "How would you pay? (optional)",
      },
      mensaje: {
        es: "Un mensaje para el dueño (opcional)",
        en: "A message for the owner (optional)",
      },
      mensajeAyuda: {
        es: "Hasta 300 caracteres. No pongas teléfonos ni correos: el dueño ya verá tu nombre.",
        en: "Up to 300 characters. Don't add phone numbers or emails: the owner will already see your name.",
      },
      contador: { es: "{n} de 300", en: "{n} of 300" },
      correo: { es: "Tu correo", en: "Your email" },
      correoAyuda: {
        es: "Solo lo usamos para avisarte de esta visita: horarios, confirmación y recordatorio. El dueño no lo ve.",
        en: "We only use it to tell you about this viewing: times, confirmation and reminder. The owner doesn't see it.",
      },
      consentimiento: {
        es: "Acepto que Innmobiliaria guarde mi correo y los datos de esta solicitud para coordinar la visita (Ley 1581), y que el dueño vea mi nombre, mi nivel de verificación y lo que declaro aquí.",
        en: "I agree that Innmobiliaria keeps my email and the details of this request to arrange the viewing (Colombia's Ley 1581), and that the owner sees my name, my verification level and what I state here.",
      },
      politica: { es: "Política de datos", en: "Data policy" },
      enviar: { es: "Pedir la visita", en: "Request the viewing" },
      enviando: { es: "Enviando…", en: "Sending…" },
    },
    errores: {
      intencion: {
        es: "Elige para qué lo buscas.",
        en: "Choose what you're looking for.",
      },
      presupuesto: {
        es: "Revisa el presupuesto: «desde» no puede ser mayor que «hasta».",
        en: "Check the budget: «from» can't be higher than «up to».",
      },
      correo: {
        es: "Escribe un correo válido.",
        en: "Enter a valid email address.",
      },
      consentimiento: {
        es: "Necesitamos tu autorización para coordinar la visita.",
        en: "We need your authorization to arrange the viewing.",
      },
      servidor: {
        es: "No pudimos enviar tu solicitud. Inténtalo de nuevo en un momento.",
        en: "We couldn't send your request. Please try again in a moment.",
      },
      ya_solicitada: {
        es: "Ya pediste una visita a este inmueble. Revisa el correo que te enviamos o espera la respuesta del dueño.",
        en: "You already requested a viewing of this property. Check the email we sent you or wait for the owner's reply.",
      },
      demasiadas_solicitudes: {
        es: "Tienes cinco solicitudes abiertas. Espera alguna respuesta o cancela una antes de pedir otra.",
        en: "You have five open requests. Wait for a reply or cancel one before asking for another.",
      },
      demasiados_ciclos: {
        es: "Pediste muchas visitas hoy. Inténtalo de nuevo mañana.",
        en: "You've requested many viewings today. Please try again tomorrow.",
      },
      consentimiento_requerido: {
        es: "Necesitamos tu autorización para coordinar la visita.",
        en: "We need your authorization to arrange the viewing.",
      },
      rechazada_reciente: {
        es: "El dueño no pudo recibirte hace poco. Inténtalo de nuevo en unos días.",
        en: "The owner couldn't see you recently. Try again in a few days.",
      },
      no_disponible: {
        es: "Este anuncio ya no recibe solicitudes de visita.",
        en: "This listing no longer takes viewing requests.",
      },
    },
    listo: {
      titulo: { es: "Solicitud enviada", en: "Request sent" },
      texto: {
        es: "Tu solicitud ya está en el anuncio del dueño. Cuando proponga horarios te escribimos al correo que dejaste y eliges uno.",
        en: "Your request is now on the owner's listing. When they offer times we'll write to the email you gave us and you pick one.",
      },
      ver: { es: "Ver mi solicitud", en: "See my request" },
    },
  },

  pagina: {
    meta: {
      titulo: {
        es: "Tu visita — Innmobiliaria",
        en: "Your viewing — Innmobiliaria",
      },
    },
    cargando: { es: "Cargando tu visita…", en: "Loading your viewing…" },
    sinEnlace: {
      titulo: { es: "Necesitas tu enlace", en: "You need your link" },
      texto: {
        es: "Tu visita se abre con el enlace del correo que te enviamos al pedirla.",
        en: "Your viewing opens with the link in the email we sent you when you requested it.",
      },
    },
    error: {
      es: "No pudimos cargar tu visita. Recarga la página o inténtalo en un momento.",
      en: "We couldn't load your viewing. Reload the page or try again in a moment.",
    },
    inmueble: { es: "{tipo} en {barrio}", en: "{tipo} in {barrio}" },
    horasBogota: { es: "Hora de Bogotá", en: "Bogotá time" },
    estados: {
      en_espera: {
        titulo: {
          es: "Tu solicitud está en espera",
          en: "Your request is on hold",
        },
        texto: {
          es: "{dueno} recibe primero a compradores identificados. Si te identificas con tu cédula, lo verá en tu tarjeta; también puede aceptarla igual.",
          en: "{dueno} welcomes ID-checked buyers first. If you check your ID with your cédula, they'll see it on your card; they can also accept it anyway.",
        },
        identificar: { es: "Identificarme con mi cédula", en: "Check my ID" },
      },
      pendiente: {
        titulo: { es: "Esperando horarios", en: "Waiting for times" },
        texto: {
          es: "Tu solicitud ya está con {dueno}. Cuando proponga horarios te escribimos al correo que dejaste y los eliges aquí.",
          en: "Your request is now with {dueno}. When they offer times we'll write to the email you gave us and you pick one here.",
        },
      },
      propuesta: {
        titulo: {
          es: "{dueno} te propone estos horarios",
          en: "{dueno} suggests these times",
        },
        elige: { es: "Elige uno", en: "Pick one" },
        confirmar: { es: "Confirmar la visita", en: "Confirm the viewing" },
        confirmando: { es: "Confirmando…", en: "Confirming…" },
        ninguno: { es: "Ninguno me sirve", en: "None of these work for me" },
        ningunoListo: {
          es: "{dueno} verá que necesitas otros horarios.",
          en: "{dueno} will see that you need other times.",
        },
      },
      confirmada: {
        titulo: { es: "Visita confirmada", en: "Viewing confirmed" },
        con: {
          es: "{inmueble} · con {dueno}, el dueño",
          en: "{inmueble} · with {dueno}, the owner",
        },
        direccion: {
          es: "{dueno} te envía la dirección exacta por WhatsApp. Para eso verá tu número desde su anuncio.",
          en: "{dueno} sends you the exact address on WhatsApp. To do that, they'll see your number on their listing.",
        },
        recordatorio: {
          es: "Te recordamos por correo el {dia}.",
          en: "We'll remind you by email on {dia}.",
        },
        consejo: {
          es: "Lleva tu cédula; nunca pagues nada antes de visitar.",
          en: "Bring your cédula; never pay anything before the viewing.",
        },
        calendario: { es: "Agregar a mi calendario", en: "Add to my calendar" },
        calendarioListo: {
          es: "Descargamos el evento para tu calendario.",
          en: "We downloaded the event for your calendar.",
        },
        cancelar: { es: "Cancelar la visita", en: "Cancel the viewing" },
        yaPaso: {
          es: "Esta visita ya pasó. Gracias por usar Innmobiliaria.",
          en: "This viewing has already happened. Thanks for using Innmobiliaria.",
        },
      },
      cancelada: {
        titulo: {
          es: "La visita quedó cancelada",
          en: "The viewing was cancelled",
        },
        porDueno: {
          es: "{dueno} canceló la visita. Puedes pedirle otros horarios cuando quieras.",
          en: "{dueno} cancelled the viewing. You can ask for other times whenever you like.",
        },
        porComprador: {
          es: "{dueno} lo verá en su anuncio. Puedes pedirle otros horarios cuando quieras.",
          en: "{dueno} will see it on their listing. You can ask for other times whenever you like.",
        },
        otros: { es: "Pedir otros horarios", en: "Ask for other times" },
      },
      rechazada: {
        titulo: {
          es: "{dueno} no puede recibirte",
          en: "{dueno} can't show you the property",
        },
        texto: {
          es: "En la búsqueda hay más inmuebles de dueños directos.",
          en: "There are more homes from direct owners in the search.",
        },
        buscar: { es: "Buscar inmuebles", en: "Search homes" },
      },
    },
    // S13 — la visita a la sala de ventas de un proyecto nuevo. Lo que no está aquí se reutiliza con «Innmobiliaria» en el lugar
    // del dueño. La dirección de la sala la manda el equipo por WhatsApp, a mano: este enlace jamás la muestra.
    sala: {
      equipo: { es: "Innmobiliaria", en: "Innmobiliaria" },
      proyecto: {
        es: "Sala de ventas de {nombre}",
        en: "Sales room of {nombre}",
      },
      pendiente: {
        es: "Le escribimos a la sala de ventas y te confirmamos el día por WhatsApp. Cuando tengamos horarios te escribimos al correo que dejaste y los eliges aquí. Si en dos días hábiles no responden, te lo decimos.",
        en: "We will contact the sales room and confirm the day with you over WhatsApp. When we have times we will write to the email you gave us and you pick one here. If they do not answer within two business days, we will tell you.",
      },
      confirmada: {
        con: {
          es: "{inmueble} · coordinada por {dueno}",
          en: "{inmueble} · arranged by {dueno}",
        },
        direccion: {
          es: "{dueno} te envía la dirección de la sala por WhatsApp, al número que verificaste. Los teléfonos y direcciones de las salas no se publican.",
          en: "{dueno} sends you the sales room's address on WhatsApp, to the number you verified. Sales rooms' phones and addresses are never published.",
        },
      },
      cancelada: {
        porComprador: {
          es: "La visita quedó cancelada. Puedes pedir otra cuando quieras.",
          en: "The visit is cancelled. You can ask for another whenever you like.",
        },
      },
      rechazada: {
        titulo: {
          es: "No pudimos concretar la visita",
          en: "We could not arrange the visit",
        },
        texto: {
          es: "En la edición hay más proyectos de vivienda nueva.",
          en: "The edition has more new-home projects.",
        },
        buscar: { es: "Ver vivienda nueva", en: "See new homes" },
      },
      cancelarConfirmar: {
        es: "Se cancela la visita; si ya había un horario, queda sin efecto.",
        en: "The visit is cancelled; if a time was set, it no longer applies.",
      },
      ics: {
        titulo: {
          es: "Visita: sala de ventas de {nombre}",
          en: "Visit: sales room of {nombre}",
        },
        descripcion: {
          es: "Visita a la sala de ventas coordinada por {dueno}. La dirección te llega por WhatsApp. Lleva tu cédula; nunca pagues nada antes de visitar.",
          en: "Sales-room visit arranged by {dueno}. The address reaches you on WhatsApp. Bring your cédula; never pay anything before the visit.",
        },
      },
    },
    cancelarConfirmar: {
      retirar: { es: "Retirar mi solicitud", en: "Withdraw my request" },
      titulo: { es: "¿Cancelar?", en: "Cancel?" },
      texto: {
        es: "{dueno} lo verá en su anuncio y, si dejó su correo, le escribimos.",
        en: "{dueno} will see it on their listing and, if they left their email, we'll write to them.",
      },
      si: { es: "Sí, cancelar", en: "Yes, cancel" },
      no: { es: "No, mantener", en: "No, keep it" },
      cancelando: { es: "Cancelando…", en: "Cancelling…" },
    },
    errores: {
      servidor: {
        es: "No pudimos completar la acción. Inténtalo de nuevo en un momento.",
        en: "We couldn't complete that. Please try again in a moment.",
      },
      horario_vencido: {
        es: "Ese horario ya pasó. Pídele al dueño otros.",
        en: "That time has already passed. Ask the owner for others.",
      },
      estado_invalido: {
        es: "Esta solicitud cambió. Recarga la página para ver cómo está.",
        en: "This request changed. Reload the page to see where it stands.",
      },
    },
    ics: {
      titulo: { es: "Visita: {inmueble}", en: "Viewing: {inmueble}" },
      descripcion: {
        es: "Visita con {dueno}. La dirección exacta te la envía por WhatsApp. Lleva tu cédula; nunca pagues nada antes de visitar.",
        en: "Viewing with {dueno}. They send you the exact address on WhatsApp. Bring your cédula; never pay anything before the viewing.",
      },
    },
  },

  // Botón de la ficha (junto a «Escribirle por WhatsApp»).
  boton: {
    pedir: { es: "Pedir una visita", en: "Request a viewing" },
    preferencia: {
      es: "Este dueño prefiere compradores identificados.",
      en: "This owner prefers ID-checked buyers.",
    },
  },
} as const satisfies Arbol;
