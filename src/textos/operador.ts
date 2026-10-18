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
  },
  cerrarSesion: { es: "Cerrar sesión", en: "Sign out" },

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
