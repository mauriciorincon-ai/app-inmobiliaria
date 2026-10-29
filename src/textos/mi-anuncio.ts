// «Mi anuncio» (/mi-anuncio): completar el anuncio con fotos, descripción y contacto, y la vigencia
// (/renovar). Redactado en cada idioma, no traducido (S5). Las frases de fotos y de pasos sugeridos
// llegan de los motores como CÓDIGOS (`engine/fotos/gate`, `engine/score/score`).
import type { Arbol } from "@/i18n/textos";

export const MI_ANUNCIO = {
  meta: {
    titulo: {
      es: "Mi anuncio — Innmobiliaria",
      en: "My listing — Innmobiliaria",
    },
  },
  titulo: { es: "Completa tu anuncio", en: "Complete your listing" },
  subtitulo: {
    es: "Entre más completo, mejor luce para los interesados. Vas guardando a medida que avanzas.",
    en: "The more complete it is, the better it looks to interested people. Your progress is saved as you go.",
  },

  estados: {
    cargando: { es: "Cargando tu anuncio…", en: "Loading your listing…" },
    sinEnlace: {
      titulo: { es: "Necesitas tu enlace", en: "You need your link" },
      antes: {
        es: "Este anuncio se abre con el enlace privado que te dimos al publicar (empieza por ",
        en: "This listing opens with the private link we gave you when you listed it (it starts with ",
      },
      despues: {
        es: "). Búscalo en la pantalla de confirmación o pídelo de nuevo.",
        en: "). Find it on the confirmation screen or ask for it again.",
      },
    },
    error: {
      es: "No pudimos cargar tu anuncio. Recarga la página o inténtalo en un momento.",
      en: "We couldn't load your listing. Reload the page or try again in a moment.",
    },
  },

  secciones: {
    precio: { es: "Precio", en: "Price" },
    fotos: { es: "Fotos", en: "Photos" },
    descripcion: { es: "Descripción", en: "Description" },
    contacto: { es: "Contacto", en: "Contact" },
    sello: { es: "Tu sello", en: "Your seal" },
  },

  // Lo que el dueño ve de su propio sello; los compradores ven el sello en la ficha y en la búsqueda.
  sello: {
    verificado: {
      es: "Vimos tu Certificado de Tradición y Libertad (CTL), expedido el {fecha}. Los compradores ven el sello ⭐ con esa fecha.",
      en: "We saw your Certificado de Tradición y Libertad (CTL), issued on {fecha}. Buyers see the ⭐ seal with that date.",
    },
    pendiente: {
      es: "Tu sello dice «re-verificación pendiente» hasta que veamos un CTL nuevo, de máximo 30 días.",
      en: "Your seal reads «re-check pending» until we see a new CTL, at most 30 days old.",
    },
    fundador: {
      es: "Con un CTL (Certificado de Tradición y Libertad) vigente ganas el sello ⭐ de propietario verificado. El documento solo se ve: no se guarda.",
      en: "With a current CTL (Certificado de Tradición y Libertad, the official record of who owns a property) you earn the ⭐ verified-owner seal. We only look at the document: we don't keep it.",
    },
  },

  score: {
    titulo: {
      es: "Tu anuncio está {score}% completo",
      en: "Your listing is {score}% complete",
    },
    aria: {
      es: "Anuncio {score}% completo",
      en: "Listing {score}% complete",
    },
    completo: {
      es: "¡Listo! Tu anuncio está completo. 🎉",
      en: "All set! Your listing is complete. 🎉",
    },
    siguiente: { es: "Siguiente:", en: "Next:" },
    // Un texto por código de `AccionScore`.
    acciones: {
      primeraFoto: {
        es: "Sube tu primera foto",
        en: "Upload your first photo",
      },
      descripcion: {
        es: "Escribe la descripción",
        en: "Write the description",
      },
      portada: {
        es: "Elige tu foto de portada",
        en: "Choose your cover photo",
      },
      contacto: {
        es: "Activa el contacto para interesados",
        en: "Turn on contact for interested people",
      },
      otraFoto: { es: "Agrega otra foto", en: "Add another photo" },
    },
  },

  galeria: {
    altPortada: { es: "Foto de portada", en: "Cover photo" },
    altFoto: { es: "Foto del inmueble", en: "Photo of the property" },
    insigniaPortada: { es: "Portada", en: "Cover" },
    esPortada: { es: "Es portada", en: "Current cover" },
    hacerPortada: { es: "Portada", en: "Set as cover" },
    eliminar: { es: "Eliminar", en: "Delete" },
  },

  subidor: {
    lleno: {
      es: "Alcanzaste el máximo de fotos",
      en: "You've reached the photo limit",
    },
    agregar: { es: "Toca para agregar fotos", en: "Tap to add photos" },
    contador: {
      es: "{n} de {max} · JPG, PNG o WebP",
      en: "{n} of {max} · JPG, PNG or WebP",
    },
    procesandoUna: {
      es: "Procesando tu foto…",
      en: "Processing your photo…",
    },
    procesandoVarias: {
      es: "Procesando foto {i} de {total}…",
      en: "Processing photo {i} of {total}…",
    },
    ideas: { es: "Ideas para tus fotos", en: "Ideas for your photos" },
    espacios: [
      { es: "Fachada o entrada", en: "Facade or entrance" },
      { es: "Sala / comedor", en: "Living / dining room" },
      { es: "Cocina", en: "Kitchen" },
      { es: "Habitación principal", en: "Main bedroom" },
      { es: "Baño", en: "Bathroom" },
    ],
    // Un texto por RAZÓN de rechazo o fallo (`RazonSubida`). Frases llanas y accionables.
    errores: {
      formato: {
        es: "Usa una foto en formato JPG, PNG o WebP.",
        en: "Use a photo in JPG, PNG or WebP format.",
      },
      peso: {
        es: "La foto pesa demasiado (máximo 20 MB). Prueba con otra.",
        en: "The photo is too large (20 MB maximum). Try another one.",
      },
      resolucion: {
        es: "La foto es muy pequeña. Tómala con la cámara del teléfono (no una captura de pantalla) y vuelve a intentar.",
        en: "The photo is too small. Take it with your phone's camera (not a screenshot) and try again.",
      },
      lectura: {
        es: "No pudimos leer la foto. Prueba con otra.",
        en: "We couldn't read the photo. Try another one.",
      },
      limite: {
        es: "Ya alcanzaste el máximo de fotos.",
        en: "You've already reached the photo limit.",
      },
      red: {
        es: "No pudimos subir la foto. Revisa tu conexión y vuelve a intentar.",
        en: "We couldn't upload the photo. Check your connection and try again.",
      },
    },
  },

  editor: {
    etiqueta: {
      es: "Descripción del inmueble",
      en: "Property description",
    },
    guia: {
      es: "Cuéntale al comprador lo mejor de tu inmueble: ¿por qué te gustó?, ¿cómo es el barrio?, ¿qué tiene cerca (transporte, colegios, parques)?, ¿está listo para entrar a vivir?",
      en: "Tell buyers the best things about your property: why did you like it? What is the neighborhood like? What's nearby (transport, schools, parks)? Is it ready to move into?",
    },
    buena: { es: "¡Buena descripción!", en: "Great description!" },
    faltan: {
      es: "Escribe al menos {minimo} caracteres (llevas {largo}).",
      en: "Write at least {minimo} characters (you have {largo}).",
    },
    guardando: { es: "Guardando…", en: "Saving…" },
    guardado: { es: "Guardado ✓", en: "Saved ✓" },
    guardar: { es: "Guardar", en: "Save" },
  },

  // Cambiar el precio (S9, ADR 017): el historial sirve para avisar a quien tiene una alerta cuando BAJA; una
  // subida no avisa a nadie.
  precio: {
    etiqueta: { es: "Precio esperado (COP)", en: "Expected price (COP)" },
    ayuda: {
      es: "Si lo bajas, quienes tienen una alerta que coincide con tu anuncio lo reciben en su resumen del día. Si lo subes, no avisamos a nadie.",
      en: "If you lower it, people with an alert that matches your listing get it in their daily digest. If you raise it, we don't tell anyone.",
    },
    guardar: { es: "Guardar precio", en: "Save price" },
    guardando: { es: "Guardando…", en: "Saving…" },
    guardado: { es: "Precio guardado ✓", en: "Price saved ✓" },
    errores: {
      invalido: {
        es: "Escribe un precio válido en pesos.",
        en: "Enter a valid price in pesos.",
      },
      // S16 (deuda del S9): guardar el mismo precio no respondía nada.
      igual: {
        es: "Ese ya es el precio de tu anuncio.",
        en: "That's already your listing's price.",
      },
      demasiados: {
        es: "Cambiaste el precio varias veces hoy. Inténtalo de nuevo mañana.",
        en: "You changed the price several times today. Try again tomorrow.",
      },
      servidor: {
        es: "No pudimos guardar el precio. Inténtalo de nuevo en un momento.",
        en: "We couldn't save the price. Try again in a moment.",
      },
    },
  },

  contacto: {
    titulo: {
      es: "Mostrar mi WhatsApp a compradores verificados",
      en: "Show my WhatsApp number to verified buyers",
    },
    texto: {
      es: "Solo un comprador que verificó su WhatsApp puede escribirte desde tu anuncio, y tu número nunca se ve en la página pública. Puedes desactivarlo cuando quieras. Sin esto, nadie te contacta desde aquí.",
      en: "Only a buyer who verified their WhatsApp can message you from your listing, and your number is never shown on the public page. You can turn it off whenever you like. Without this, nobody can contact you from here.",
    },
  },

  // Los compradores verificados que abrieron el chat contigo desde el anuncio (S7); el contacto se registra
  // al abrir WhatsApp, no al enviar el mensaje. Del teléfono solo se ven los
  // últimos 4 dígitos: el número completo ya te llegó en tu WhatsApp.
  contactos: {
    titulo: {
      es: "Compradores que abrieron tu chat",
      en: "Buyers who opened your chat",
    },
    vacio: {
      es: "Cuando un comprador verificado abra el chat contigo desde tu anuncio, aparecerá aquí.",
      en: "When a verified buyer opens a chat with you from your listing, they'll show up here.",
    },
    verificado: { es: "WhatsApp verificado", en: "Verified WhatsApp" },
  },
  // S15 — lo que el equipo hizo con el anuncio. Una pausa o un pedido de CTL los decide una persona del equipo, nunca una regla
  // sola; el texto dice qué pasa y qué sigue, sin acusar.
  equipo: {
    pausado: {
      titulo: { es: "Tu anuncio está en pausa", en: "Your listing is paused" },
      texto: {
        es: "El equipo lo pausó mientras revisa unos datos: durante la pausa no aparece en la búsqueda ni se puede contactar. Si te escribimos por WhatsApp, respóndenos ahí y lo resolvemos contigo.",
        en: "The team paused it while it checks a few details: during the pause it doesn't show in search and can't be contacted. If we message you on WhatsApp, reply there and we'll sort it out with you.",
      },
    },
    ctlPedido: {
      titulo: {
        es: "El equipo te pidió el certificado de tradición",
        en: "The team asked for your title record",
      },
      texto: {
        es: "Para dejar el anuncio al día, muéstranos un certificado de tradición y libertad (CTL) expedido hace 30 días o menos. Lo vemos y no lo guardamos.",
        en: "To keep the listing up to date, show us a title record (certificado de tradición y libertad, CTL) issued 30 days ago or less. We look at it and don't keep it.",
      },
    },
  },

  // La sesión de fotos (S15, «fotos que venden»). El dueño la pide y la cancela; el equipo la agenda y le escribe por WhatsApp.
  sesionFotos: {
    titulo: { es: "Sesión de fotos", en: "Photo session" },
    intro: {
      es: "Si prefieres que las fotos las tome alguien del equipo, pide una sesión. Te escribimos por WhatsApp para acordar el día. Pedirla no te cuesta nada ni te compromete.",
      en: "If you'd rather have someone from the team take the photos, ask for a session. We message you on WhatsApp to agree on the day. Asking for one costs nothing and doesn't commit you.",
    },
    franja: {
      etiqueta: {
        es: "¿Qué franja te sirve?",
        en: "Which time of the week suits you?",
      },
      ayuda: {
        es: "El día y la hora los acordamos contigo por WhatsApp.",
        en: "We agree the day and time with you on WhatsApp.",
      },
      placeholder: { es: "Elige una franja", en: "Pick a slot" },
      entre_semana: { es: "Entre semana", en: "Weekdays" },
      sabado: { es: "Sábado", en: "Saturday" },
      domingo: { es: "Domingo", en: "Sunday" },
    },
    estado: {
      solicitada: { es: "Pedida", en: "Requested" },
      agendada: { es: "Agendada", en: "Scheduled" },
      hecha: { es: "Hecha", en: "Done" },
      cancelada: { es: "Cancelada", en: "Cancelled" },
    },
    detalle: {
      solicitada: {
        es: "Pediste una sesión (franja: {franja}). El equipo te escribirá por WhatsApp para acordar el día.",
        en: "You asked for a session (slot: {franja}). The team will message you on WhatsApp to agree on the day.",
      },
      agendada: {
        es: "Tu sesión está agendada para el {cuando}.",
        en: "Your session is scheduled for {cuando}.",
      },
      hecha: {
        es: "La sesión se hizo el {cuando}. Si quieres otra, puedes pedirla.",
        en: "The session took place on {cuando}. If you'd like another, you can ask for one.",
      },
      cancelada: {
        es: "La sesión se canceló. Si quieres, puedes pedir otra.",
        en: "The session was cancelled. If you like, you can ask for another.",
      },
    },
    pedir: { es: "Pedir la sesión", en: "Ask for the session" },
    pedirOtra: { es: "Pedir otra sesión", en: "Ask for another session" },
    cancelar: { es: "Cancelar la sesión", en: "Cancel the session" },
    enviando: { es: "Enviando…", en: "Sending…" },
    cancelando: { es: "Cancelando…", en: "Cancelling…" },
    errores: {
      eligeFranja: {
        es: "Elige la franja que te sirve.",
        en: "Pick the slot that suits you.",
      },
      ya_solicitada: {
        es: "Ya tienes una sesión pedida. Recarga la página para verla.",
        en: "You already have a session requested. Reload the page to see it.",
      },
      demasiadas_sesiones: {
        es: "Ya pediste varias sesiones este mes. Inténtalo de nuevo más adelante.",
        en: "You've already asked for several sessions this month. Try again later.",
      },
      no_disponible: {
        es: "Tu anuncio venció: renuévalo para pedir la sesión.",
        en: "Your listing has expired: renew it to ask for the session.",
      },
      estado_invalido: {
        es: "Esa sesión ya cambió. Recarga la página para ver cómo está.",
        en: "That session has already changed. Reload the page to see where it stands.",
      },
      servidor: {
        es: "No pudimos completar la acción. Inténtalo de nuevo en un momento.",
        en: "We couldn't complete that. Please try again in a moment.",
      },
    },
  },
} as const satisfies Arbol;

// Vigencia del anuncio (anti-zombie, ADR 007): se renueva con un clic desde el enlace privado.
export const VIGENCIA = {
  meta: {
    titulo: {
      es: "Renovar mi anuncio — Innmobiliaria",
      en: "Renew my listing — Innmobiliaria",
    },
  },
  pagina: {
    titulo: { es: "Renueva tu anuncio", en: "Renew your listing" },
    subtitulo: {
      es: "Un clic y tu inmueble sigue vivo {dias} días más.",
      en: "One click and your property stays live for {dias} more days.",
    },
    cargando: { es: "Cargando tu anuncio…", en: "Loading your listing…" },
    sinEnlace: {
      titulo: { es: "Necesitas tu enlace", en: "You need your link" },
      antes: {
        es: "Abre esta página desde el enlace privado que te dimos al publicar (empieza por ",
        en: "Open this page from the private link we gave you when you listed (it starts with ",
      },
      despues: {
        es: " o llega desde el correo de renovación).",
        en: " or arrives in the renewal email).",
      },
    },
    error: {
      es: "No pudimos cargar tu anuncio. Recarga la página o inténtalo en un momento.",
      en: "We couldn't load your listing. Reload the page or try again in a moment.",
    },
  },
  tarjeta: {
    vivo: { es: "Tu anuncio está vivo", en: "Your listing is live" },
    vencido: { es: "Tu anuncio venció", en: "Your listing has expired" },
    vivoAntes: {
      es: "Sigue publicado hasta el ",
      en: "It stays published until ",
    },
    faltaUno: { es: " (falta {n} día)", en: " ({n} day left)" },
    faltanVarios: { es: " (faltan {n} días)", en: " ({n} days left)" },
    vivoDespues: {
      es: " Renuévalo cuando quieras para que nunca desaparezca.",
      en: " Renew it whenever you like so it never disappears.",
    },
    vencidoTexto: {
      es: "Dejó de aparecer en la ficha pública. Renuévalo y vuelve a estar visible al instante.",
      en: "It stopped appearing on the public listing page. Renew it and it's visible again right away.",
    },
    renovar: {
      es: "Renovar {dias} días más",
      en: "Renew for {dias} more days",
    },
    renovando: { es: "Renovando…", en: "Renewing…" },
    error: {
      es: "No pudimos renovar. Inténtalo de nuevo en un momento.",
      en: "We couldn't renew it. Try again in a moment.",
    },
    pausado: {
      es: "Tu anuncio se renovó, pero el equipo lo tiene en pausa mientras revisa unos datos: no aparece en la búsqueda hasta que se resuelva.",
      en: "Your listing was renewed, but the team has it paused while it checks a few details: it doesn't show in search until that's sorted out.",
    },
  },
} as const satisfies Arbol;
