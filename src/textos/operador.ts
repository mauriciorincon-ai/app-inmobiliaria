// Panel del operador. El equipo de Innmobiliaria lo usa en español o en inglés (S5). Los términos
// del dominio se conservan y se explican cuando hace falta. Los avisos que el panel manda a un
// vendedor (correo, WhatsApp) NO salen en este idioma sino en el que el vendedor guardó al publicar
// (`vendedores.idioma`): ver `mensajes.ts` y `correos.ts`.
import type { Arbol } from "@/i18n/textos";

export const OPERADOR = {
  login: {
    titulo: { es: "Panel del operador", en: "Operator panel" },
    aviso: {
      es: "Acceso solo para el equipo de Innmobiliaria.",
      en: "Access for the Innmobiliaria team only.",
    },
    correo: { es: "Correo", en: "Email" },
    contrasena: { es: "Contraseña", en: "Password" },
    entrar: { es: "Entrar", en: "Sign in" },
    entrando: { es: "Entrando…", en: "Signing in…" },
    errorCredenciales: {
      es: "Correo o contraseña incorrectos.",
      en: "Incorrect email or password.",
    },
  },
  cargando: {
    titulo: { es: "Registros", en: "Records" },
    estado: { es: "Cargando registros…", en: "Loading records…" },
  },

  // Navegación común a las tres secciones.
  nav: {
    etiqueta: { es: "Secciones del panel", en: "Panel sections" },
    registros: { es: "Registros", en: "Records" },
    campana: { es: "Campaña", en: "Campaign" },
    zonas: { es: "Zonas y cupos", en: "Areas and spots" },
    salas: { es: "Visitas a salas", en: "Sales-room visits" },
    // S15
    antifraude: { es: "Antifraude", en: "Anti-fraud" },
  },
  cerrarSesion: { es: "Cerrar sesión", en: "Sign out" },

  // S13 — la cola de visitas a salas de ventas de vivienda nueva. Mientras la constructora no esté en la plataforma, el equipo
  // coordina: escribe a la sala por WhatsApp (nada sale solo) y confirma al comprador. El contacto de cada sala lo escribe el
  // operador aquí, una vez por proyecto: nunca está en el repo ni se muestra fuera de este panel.
  salas: {
    titulo: { es: "Visitas a salas de ventas", en: "Sales-room visits" },
    intro: {
      es: "Cada solicitud llega con el proyecto y la página de la revista donde aparece. Tú escribes a la sala desde tu WhatsApp, propones horarios y, ya confirmada, le mandas la dirección al comprador. Si en dos días hábiles no hay respuesta, el sistema le avisa por correo.",
      en: "Each request comes with the project and the magazine page where it appears. You write to the sales room from your WhatsApp, offer times and, once confirmed, send the buyer the address. If there is no answer in two business days, the system tells them by email.",
    },
    error: {
      es: "No pudimos cargar la cola. Recarga la página o inténtalo en un momento.",
      en: "We couldn't load the queue. Reload the page or try again in a moment.",
    },
    vacio: {
      es: "No hay solicitudes de visita a salas de ventas.",
      en: "There are no sales-room visit requests.",
    },
    grupos: {
      por_atender: { es: "Por atender", en: "To handle" },
      con_horarios: { es: "Con horarios propuestos", en: "Times offered" },
      confirmadas: { es: "Confirmadas", en: "Confirmed" },
      cerradas: {
        es: "Cerradas (últimos 30 días)",
        en: "Closed (last 30 days)",
      },
    },
    estado: {
      en_espera: { es: "En espera", en: "On hold" },
      pendiente: { es: "Pendiente", en: "Pending" },
      propuesta: { es: "Horarios propuestos", en: "Times offered" },
      confirmada: { es: "Confirmada", en: "Confirmed" },
      rechazada: { es: "Rechazada", en: "Rejected" },
      cancelada: { es: "Cancelada", en: "Cancelled" },
    },
    fuente: {
      es: "Edición {edicion}, p. {paginas}",
      en: "Edition {edicion}, p. {paginas}",
    },
    sinConstructora: {
      es: "Constructora no impresa",
      en: "Builder not printed",
    },
    franja: {
      etiqueta: { es: "Franja pedida", en: "Requested slot" },
      entre_semana: { es: "Entre semana", en: "Weekdays" },
      sabado: { es: "Sábado", en: "Saturday" },
      domingo: { es: "Domingo", en: "Sunday" },
    },
    pedida: { es: "Pedida el {fecha}", en: "Requested on {fecha}" },
    vence: {
      es: "La sala debe responder antes del {fecha}",
      en: "The sales room should answer before {fecha}",
    },
    sinRespuesta: {
      es: "Ya pasó el plazo: el comprador recibió el aviso de que la sala no responde.",
      en: "The deadline passed: the buyer was told the sales room is not answering.",
    },
    ninguno: {
      es: "Ningún horario le sirvió: propón otros.",
      en: "None of the times worked for them: offer others.",
    },
    comprador: {
      es: "{nombre} · WhatsApp terminado en {fin}",
      en: "{nombre} · WhatsApp ending in {fin}",
    },
    identificado: { es: "Identificado con cédula", en: "ID-checked" },
    sinIdentificar: { es: "Sin identificar", en: "Not ID-checked" },
    horarios: {
      propuestos: { es: "Horarios propuestos", en: "Times offered" },
      visita: { es: "Visita: {horario}", en: "Visit: {horario}" },
      canceladaComprador: {
        es: "El comprador canceló la visita ({horario}). Si ya avisaste a la sala, avísale que no va.",
        en: "The buyer cancelled the visit ({horario}). If you already told the sales room, let them know it is off.",
      },
    },
    contacto: {
      titulo: { es: "Contacto de la sala", en: "Sales-room contact" },
      ayuda: {
        es: "Solo lo ves tú. Escribe el teléfono (con el indicativo, solo números) y la dirección que encuentres en la revista o en su página. Déjalos vacíos para borrarlo.",
        en: "Only you see it. Enter the phone (with the country code, digits only) and the address from the magazine or its website. Leave both empty to delete it.",
      },
      telefono: { es: "Teléfono de la sala", en: "Sales-room phone" },
      direccion: { es: "Dirección de la sala", en: "Sales-room address" },
      guardar: { es: "Guardar contacto", en: "Save contact" },
      guardando: { es: "Guardando…", en: "Saving…" },
      guardado: { es: "Contacto guardado.", en: "Contact saved." },
      faltante: {
        es: "Falta el contacto de la sala.",
        en: "The sales-room contact is missing.",
      },
      error: {
        es: "No pudimos guardar el contacto. Revisa el teléfono (7 a 15 dígitos) y la dirección (5 a 200 caracteres).",
        en: "We couldn't save the contact. Check the phone (7 to 15 digits) and the address (5 to 200 characters).",
      },
    },
    whatsapp: {
      sala: {
        es: "Escribirle a la sala por WhatsApp",
        en: "Write to the sales room on WhatsApp",
      },
      comprador: {
        es: "Mandarle la dirección al comprador por WhatsApp",
        en: "Send the buyer the address on WhatsApp",
      },
      sinDireccion: {
        es: "Guarda la dirección de la sala para poder enviársela al comprador.",
        en: "Save the sales room's address to be able to send it to the buyer.",
      },
      nada: {
        es: "Se abre WhatsApp con el mensaje ya escrito; lo envías tú desde tu teléfono. El sistema no manda ningún WhatsApp.",
        en: "WhatsApp opens with the message already written; you send it from your phone. The system sends no WhatsApp message.",
      },
    },
    mensajes: {
      // La sala está en Bogotá: este mensaje sale SIEMPRE en español (el inglés es solo para que el equipo lea lo que se envía).
      sala: {
        es: "Hola, te escribo de Innmobiliaria. Una persona interesada en {proyecto} quisiera visitar la sala de ventas ({franja}). ¿Qué horarios tienen disponibles? Gracias.",
        en: "Hello, I'm writing from Innmobiliaria. Someone interested in {proyecto} would like to visit the sales room ({franja}). Which times do you have available? Thank you.",
      },
      comprador: {
        es: "Hola {nombre}, soy del equipo de Innmobiliaria. Tu visita a la sala de ventas de {proyecto} quedó confirmada: {horario} (hora de Bogotá). La dirección de la sala es: {direccion}",
        en: "Hi {nombre}, I'm from the Innmobiliaria team. Your visit to the sales room of {proyecto} is confirmed: {horario} (Bogotá time). The sales room's address is: {direccion}",
      },
    },
    acciones: {
      proponer: { es: "Proponer horarios", en: "Offer times" },
      cambiarHorarios: { es: "Cambiar los horarios", en: "Change the times" },
      rechazar: { es: "Rechazar la solicitud", en: "Reject the request" },
      cancelar: { es: "Cancelar la visita", en: "Cancel the visit" },
      confirmar: {
        rechazar: {
          es: "Le avisamos al comprador por correo que no pudimos concretar la visita.",
          en: "We tell the buyer by email that we could not arrange the visit.",
        },
        cancelar: {
          es: "Le avisamos al comprador por correo que se canceló la visita.",
          en: "We tell the buyer by email that the visit was cancelled.",
        },
        si: { es: "Sí, continuar", en: "Yes, continue" },
        no: { es: "No, volver", en: "No, go back" },
      },
      horarios: {
        titulo: { es: "Horarios para la visita", en: "Times for the visit" },
        texto: {
          es: "Los que te dio la sala: hasta 3. El comprador confirma uno y le llega un correo con el enlace. Las horas son de Bogotá.",
          en: "The ones the sales room gave you: up to 3. The buyer confirms one and gets an email with the link. Times are Bogotá time.",
        },
        fila: { es: "Horario {n}", en: "Time {n}" },
        fecha: { es: "Fecha", en: "Date" },
        hora: { es: "Hora", en: "Time" },
        quitar: { es: "Quitar el horario {n}", en: "Remove time {n}" },
        agregar: {
          es: "Agregar otro horario (hasta 3)",
          en: "Add another time (up to 3)",
        },
        enviar: {
          es: "Enviar horarios al comprador",
          en: "Send times to the buyer",
        },
        enviando: { es: "Enviando…", en: "Sending…" },
        cerrar: { es: "Cerrar", en: "Close" },
      },
      ocupado: { es: "Un momento…", en: "One moment…" },
    },
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
      horarios_invalidos: {
        es: "Revisa los horarios: deben ser futuros, distintos y de hasta 3.",
        en: "Check the times: they must be in the future, different and up to 3.",
      },
      no_autorizado: {
        es: "Tu sesión terminó. Vuelve a entrar.",
        en: "Your session ended. Sign in again.",
      },
    },
  },

  registros: {
    titulo: { es: "Registros", en: "Records" },
    conteoUno: {
      es: "{n} inmueble en esta vista",
      en: "{n} property in this view",
    },
    conteoVarios: {
      es: "{n} inmuebles en esta vista",
      en: "{n} properties in this view",
    },
    filtrar: { es: "Filtrar registros", en: "Filter records" },
    filtros: {
      todos: { es: "Todos", en: "All" },
      porVerificar: { es: "Por verificar", en: "To verify" },
      verificados: { es: "Verificados", en: "Verified" },
    },
    error: {
      es: "No pudimos cargar los registros. Recarga la página o inténtalo en un momento.",
      en: "We couldn't load the records. Reload the page or try again in a moment.",
    },
    vacio: {
      titulo: {
        es: "No hay registros en esta vista",
        en: "There are no records in this view",
      },
      detalle: {
        es: "Cambia el filtro o espera a que un vendedor publique.",
        en: "Change the filter or wait for a seller to list a property.",
      },
    },
    tabla: {
      fecha: { es: "Fecha", en: "Date" },
      contacto: { es: "Contacto", en: "Contact" },
      inmueble: { es: "Inmueble", en: "Property" },
      fotos: { es: "Fotos", en: "Photos" },
      nivel: { es: "Nivel", en: "Level" },
      acciones: { es: "Acciones", en: "Actions" },
    },
    verFicha: { es: "Ver ficha →", en: "View listing →" },
    // S6 — el anuncio de antes del catálogo: barrio escrito a mano, sin área en el mapa.
    sinBarrio: {
      es: "Sin barrio del catálogo",
      en: "No catalogue neighborhood",
    },
    sinBarrioAyuda: {
      es: "No sale en la búsqueda por zona dibujada hasta que le asignes uno.",
      en: "It won't show in the drawn-area search until you assign one.",
    },
    // El idioma en que el vendedor publicó, y por tanto el de sus avisos.
    idiomaVendedor: {
      es: "Idioma de sus avisos: {idioma}",
      en: "Language of their notices: {idioma}",
    },
  },

  marcarVerificado: {
    boton: { es: "Verificar ⭐", en: "Verify ⭐" },
    // Para un anuncio ya verificado pero sin fecha de CTL (re-verificación pendiente).
    botonReverificar: { es: "Registrar CTL nuevo", en: "Record new CTL" },
    matricula: {
      es: "Número de matrícula (del CTL)",
      en: "Registry number (matrícula, from the CTL)",
    },
    visto: {
      es: "Vi el CTL original y el titular coincide con quien publicó.",
      en: "I saw the original CTL and the owner matches the person who listed.",
    },
    // S6 — la fecha del CTL: el sello la muestra y el comprador ve cuán reciente es la prueba.
    fechaCtl: {
      es: "Fecha en que se expidió el CTL",
      en: "Date the CTL was issued",
    },
    fechaAyuda: {
      es: "De máximo 30 días. El documento no se guarda: solo la matrícula y las fechas.",
      en: "At most 30 days old. The document isn't kept: only the registry number and the dates.",
    },
    ctlVencido: {
      es: "Ese CTL tiene más de 30 días: pide uno nuevo.",
      en: "That CTL is more than 30 days old: ask for a new one.",
    },
    ctlFuturo: {
      es: "La fecha no puede ser futura.",
      en: "The date can't be in the future.",
    },
    ctlInvalido: {
      es: "Escribe la fecha completa.",
      en: "Enter the full date.",
    },
    confirmar: { es: "Confirmar", en: "Confirm" },
    guardando: { es: "Guardando…", en: "Saving…" },
    cancelar: { es: "Cancelar", en: "Cancel" },
    error: {
      es: "No se pudo verificar. Intenta de nuevo.",
      en: "Verification failed. Try again.",
    },
  },

  // S6 — asignar a mano un barrio del catálogo a un anuncio de antes del catálogo.
  asignarBarrio: {
    boton: { es: "Asignar barrio", en: "Assign neighborhood" },
    escrito: {
      es: "Escribieron: «{barrio}». Elige el barrio del catálogo.",
      en: "They wrote: «{barrio}». Choose the catalogue neighborhood.",
    },
    localidad: { es: "Localidad", en: "Locality" },
    barrio: { es: "Barrio", en: "Neighborhood" },
    elegirLocalidad: { es: "Elige la localidad", en: "Choose the locality" },
    elegirBarrio: { es: "Elige el barrio", en: "Choose the neighborhood" },
    confirmar: { es: "Asignar", en: "Assign" },
    guardando: { es: "Guardando…", en: "Saving…" },
    cancelar: { es: "Cancelar", en: "Cancel" },
    error: {
      es: "No se pudo asignar. Intenta de nuevo.",
      en: "Couldn't assign it. Try again.",
    },
  },

  reContacto: {
    boton: { es: "Re-contactar por WhatsApp", en: "Follow up on WhatsApp" },
    generando: { es: "Generando…", en: "Generating…" },
    error: {
      es: "No se pudo generar el enlace.",
      en: "Couldn't generate the link.",
    },
  },

  campana: {
    titulo: { es: "Campaña", en: "Campaign" },
    embudo: {
      publicados: { es: "Publicados", en: "Listed" },
      conFotos: { es: "Con fotos", en: "With photos" },
      verificados: { es: "Verificados ⭐", en: "Verified ⭐" },
    },
    enviosTitulo: { es: "Envíos recientes", en: "Recent sends" },
    sinEnvios: {
      es: "Aún no has enviado lotes.",
      en: "You haven't sent any batches yet.",
    },
    tabla: {
      fecha: { es: "Fecha", en: "Date" },
      plantilla: { es: "Plantilla", en: "Template" },
      destinatarios: { es: "Destinatarios", en: "Recipients" },
      enviados: { es: "Enviados", en: "Sent" },
      estado: { es: "Estado", en: "Status" },
    },
  },

  lote: {
    titulo: { es: "Enviar un lote", en: "Send a batch" },
    plantilla: { es: "Plantilla", en: "Template" },
    // `{filtro}` es una de las tres descripciones de abajo.
    ayuda: {
      es: "Va a los {filtro} de vendedores con correo. Cada uno lo recibe en el idioma en que publicó.",
      en: "Goes to sellers with an email whose listings are {filtro}. Each one gets it in the language they listed in.",
    },
    filtros: {
      "sin-fotos": { es: "anuncios sin fotos", en: "missing photos" },
      "sin-sello": { es: "anuncios sin sello ⭐", en: "missing the ⭐ seal" },
      "por-vencer": { es: "anuncios por vencer", en: "about to expire" },
      "re-verificar": {
        es: "anuncios verificados sin fecha de CTL",
        en: "verified with no CTL date",
      },
    },
    vistaPrevia: { es: "Vista previa", en: "Preview" },
    // Nombre ficticio con el que se arma el saludo de la vista previa.
    nombreEjemplo: { es: "Vendedor", en: "Seller" },
    // La vista previa se muestra en el idioma del panel; los destinatarios reciben el suyo.
    vistaPreviaNota: {
      es: "Vista previa en español.",
      en: "Preview in English.",
    },
    verDestinatarios: { es: "Ver destinatarios", en: "View recipients" },
    destinatarioUno: {
      es: "{n} destinatario con correo ({es} en español, {en} en inglés)",
      en: "{n} recipient with an email ({es} in Spanish, {en} in English)",
    },
    destinatariosVarios: {
      es: "{n} destinatarios con correo ({es} en español, {en} en inglés)",
      en: "{n} recipients with an email ({es} in Spanish, {en} in English)",
    },
    enviar: { es: "Enviar lote", en: "Send batch" },
    enviando: { es: "Enviando…", en: "Sending…" },
    resultado: {
      es: "Enviados {enviados}/{tanda}. Quedan {quedan} hoy.",
      en: "Sent {enviados}/{tanda}. {quedan} left today.",
    },
    modoPrueba: {
      es: " (modo prueba, sin Brevo)",
      en: " (test mode, no Brevo)",
    },
    errorEnvio: {
      es: "No se pudo enviar el lote. Intenta de nuevo.",
      en: "The batch couldn't be sent. Try again.",
    },
    errorConexion: {
      es: "Problema de conexión. Intenta de nuevo.",
      en: "Connection problem. Try again.",
    },
  },

  zonas: {
    titulo: { es: "Zonas y cupos", en: "Areas and spots" },
    intro: {
      antes: {
        es: "Fija el cupo de fundador por localidad. Deja el campo vacío para que esa zona ",
        en: "Set the founding-seller spots for each locality (localidad, a Bogotá administrative district). Leave the field empty so that area ",
      },
      resaltado: {
        es: "no muestre contador",
        en: "shows no counter",
      },
      despues: {
        es: " (escasez real o no existe). El contador público siempre se calcula desde la BD.",
        en: " (real scarcity or none at all). The public counter is always computed from the database.",
      },
    },
    tabla: {
      localidad: { es: "Localidad", en: "Locality" },
      publicados: { es: "Publicados", en: "Listed" },
      cupo: { es: "Cupo", en: "Spots" },
      restantes: { es: "Restantes", en: "Left" },
    },
    fijarCupo: {
      etiqueta: { es: "Cupo total de la zona", en: "Total spots for the area" },
      fijar: { es: "Fijar", en: "Set" },
    },
    densidad: {
      titulo: {
        es: "Densidad por búsqueda típica",
        en: "Density by typical search",
      },
      detalle: {
        es: "Inmuebles vigentes por localidad × tipo × rango de precio. Se mide desde ya; el umbral para abrir a compradores se decide en fase 2.",
        en: "Live properties by locality × type × price range. It is measured from now on; the threshold for opening to buyers is decided in phase 2.",
      },
      vacio: {
        es: "Aún no hay inmuebles con localidad para medir densidad.",
        en: "There are no properties with a locality yet to measure density.",
      },
      tabla: {
        localidad: { es: "Localidad", en: "Locality" },
        tipo: { es: "Tipo", en: "Type" },
        rango: { es: "Rango", en: "Range" },
        inmuebles: { es: "Inmuebles", en: "Properties" },
      },
      rangos: {
        "menos-200M": { es: "< $200M", en: "< COP 200M" },
        "200M-400M": { es: "$200M–$400M", en: "COP 200M–400M" },
        "mas-400M": { es: "> $400M", en: "> COP 400M" },
      },
    },
  },
} as const satisfies Arbol;
