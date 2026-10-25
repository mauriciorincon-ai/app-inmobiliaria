// Antifraude (S15, maqueta 12 del comprador): reportar un anuncio, las reglas publicadas y la cola del operador. Una señal
// jamás acusa: la frase dice qué vio la regla y quién decide (una persona del equipo). Los umbrales llegan como `{…}` desde
// `src/engine/antifraude/reglas.ts`, la misma fuente que usa el motor. Redactado en cada idioma, no traducido.
import type { Arbol } from "@/i18n/textos";

export const ANTIFRAUDE = {
  motivos: {
    precio_irreal: {
      es: "El precio es demasiado bueno para ser verdad",
      en: "The price is too good to be true",
    },
    fotos_de_otro: {
      es: "Las fotos son de otro anuncio",
      en: "The photos belong to another listing",
    },
    no_es_el_dueno: {
      es: "Quien publica no parece el dueño",
      en: "The person listing doesn't seem to be the owner",
    },
    pidio_plata: {
      es: "Me pidió plata antes de la visita",
      en: "They asked me for money before the viewing",
    },
    ya_no_esta: {
      es: "Ya se vendió o se arrendó",
      en: "It's already sold or rented",
    },
    otra_cosa: { es: "Otra cosa", en: "Something else" },
  },

  // El paso «protégete», en la página de reportar y en la de las reglas.
  protegete: {
    titulo: { es: "Mientras tanto, protégete", en: "Meanwhile, protect yourself" },
    pasos: [
      {
        es: "No pagues anticipos antes de visitar.",
        en: "Don't pay deposits before a viewing.",
      },
      {
        es: "Pide el CTL y compara el nombre del dueño con su cédula.",
        en: "Ask for the title record and compare the owner's name with their cédula.",
      },
      {
        es: "No envíes tu cédula ni tus soportes por redes sociales.",
        en: "Don't send your ID or financial documents over social media.",
      },
    ],
  },

  // El enlace en la ficha, junto a «Compartir».
  enlace: { es: "Reportar este anuncio", en: "Report this listing" },

  reportar: {
    meta: {
      titulo: { es: "Reportar un anuncio", en: "Report a listing" },
    },
    volver: { es: "Volver al anuncio", en: "Back to the listing" },
    titulo: { es: "Reportar este anuncio", en: "Report this listing" },
    // `{inmueble}` = «Apartamento en El Retiro»; `{precio}` = el precio ya formateado.
    subtitulo: {
      es: "{inmueble} · {precio}. El dueño no sabe quién reporta.",
      en: "{inmueble} · {precio}. The owner doesn't know who reported it.",
    },
    pregunta: {
      es: "¿Qué pasa con este anuncio?",
      en: "What's wrong with this listing?",
    },
    detalle: { es: "Cuéntanos más (opcional)", en: "Tell us more (optional)" },
    ejemplo: {
      es: "Ej.: me pidió el 50 % por adelantado por WhatsApp",
      en: "E.g. they asked for 50% up front on WhatsApp",
    },
    contador: { es: "{n} de {max} caracteres", en: "{n} of {max} characters" },
    enviar: { es: "Enviar reporte", en: "Send report" },
    enviando: { es: "Enviando…", en: "Sending…" },
    cargando: { es: "Revisando tu sesión…", en: "Checking your session…" },
    primeroWhatsapp: {
      titulo: {
        es: "Primero, verifica tu WhatsApp",
        en: "First, verify your WhatsApp",
      },
      texto: {
        es: "Así sabemos que el reporte viene de una persona. El dueño no ve tu nombre ni tu número.",
        en: "That's how we know a person sent the report. The owner doesn't see your name or your number.",
      },
      boton: { es: "Verificar mi WhatsApp", en: "Verify my WhatsApp" },
    },
    listo: {
      titulo: {
        es: "Gracias: una persona del equipo lo revisa",
        en: "Thanks: a person on our team will review it",
      },
      texto: {
        es: "Si confirmamos el problema, el anuncio sale de la búsqueda. No compartimos tu nombre con el dueño.",
        en: "If we confirm the problem, the listing comes off search. We don't share your name with the owner.",
      },
    },
    reglas: {
      es: "Así revisamos los anuncios",
      en: "How we review listings",
    },
    errores: {
      motivo: {
        es: "Elige al menos un motivo.",
        en: "Choose at least one reason.",
      },
      detalle: {
        es: "El detalle va hasta {max} caracteres.",
        en: "The details can be up to {max} characters.",
      },
      ya_reportado: {
        es: "Ya reportaste este anuncio: el equipo lo tiene.",
        en: "You already reported this listing: our team has it.",
      },
      demasiados_reportes: {
        es: "Llegaste al tope de reportes de hoy. Vuelve a intentarlo mañana.",
        en: "You've reached today's report limit. Please try again tomorrow.",
      },
      no_disponible: {
        es: "Este anuncio ya no está publicado.",
        en: "This listing is no longer published.",
      },
      servidor: {
        es: "No pudimos enviar el reporte. Intenta de nuevo.",
        en: "We couldn't send the report. Please try again.",
      },
    },
  },

  // La página pública de las reglas (`/antifraude`).
  pagina: {
    meta: {
      titulo: {
        es: "Cómo revisamos los anuncios",
        en: "How we review listings",
      },
      descripcion: {
        es: "Las reglas escritas con las que el equipo de Innmobiliaria revisa los anuncios, y qué pasa cuando alguien reporta uno.",
        en: "The written rules the Innmobiliaria team uses to review listings, and what happens when someone reports one.",
      },
    },
    titulo: { es: "Cómo revisamos los anuncios", en: "How we review listings" },
    intro: {
      es: "Cada señal sale de una regla escrita, no de una corazonada. Una señal no acusa a nadie ni oculta un anuncio: la revisa una persona del equipo, que decide.",
      en: "Every signal comes from a written rule, not a hunch. A signal doesn't accuse anyone or hide a listing: a person on our team reviews it and decides.",
    },
    reglasTitulo: { es: "Las cuatro reglas", en: "The four rules" },
    reglas: {
      precio: {
        titulo: { es: "Un precio muy por debajo", en: "A price far below" },
        texto: {
          es: "El precio por m² está {pct} % o más por debajo de la mediana de los anuncios parecidos de su barrio o su localidad, y hay al menos {n} anuncios para comparar. Con menos, no hay mediana y la regla no dice nada.",
          en: "The price per m² is {pct}% or more below the median of similar listings in its neighbourhood or locality, with at least {n} listings to compare. With fewer, there's no median and the rule says nothing.",
        },
      },
      foto: {
        titulo: {
          es: "Una foto que ya está en otro anuncio",
          en: "A photo that's already in another listing",
        },
        texto: {
          es: "Al subir una foto calculamos una huella de la imagen (no guardamos nada más). Si se parece a la huella de una foto de un anuncio con otro teléfono —{distancia} de {bits} puntos o menos de diferencia—, la regla lo señala.",
          en: "When a photo is uploaded we compute a fingerprint of the image (we keep nothing else). If it's close to the fingerprint of a photo in a listing with a different phone number —{distancia} of {bits} points apart or less—, the rule flags it.",
        },
      },
      matricula: {
        titulo: {
          es: "La misma matrícula, otro teléfono",
          en: "Same title number, another phone",
        },
        texto: {
          es: "La matrícula inmobiliaria de un anuncio verificado aparece en otro anuncio publicado con otro teléfono. El mismo dueño con su mismo número no cuenta.",
          en: "The property registration number of a verified listing shows up in another listing published with a different phone. The same owner with the same number doesn't count.",
        },
      },
      telefono: {
        titulo: {
          es: "El mismo WhatsApp, otros nombres",
          en: "Same WhatsApp, other names",
        },
        texto: {
          es: "El mismo WhatsApp publicó anuncios con {nombres} nombres distintos o más. Un dueño con dos inmuebles y su nombre no cuenta.",
          en: "The same WhatsApp published listings under {nombres} different names or more. One owner with two properties under their own name doesn't count.",
        },
      },
    },
    reportesTitulo: {
      es: "Cuando alguien reporta un anuncio",
      en: "When someone reports a listing",
    },
    reportesTexto: {
      es: "Puede reportar quien tenga su WhatsApp verificado: un reporte por anuncio y hasta {max} al día. El dueño no sabe quién reportó. Un reporte, como una señal, no oculta el anuncio: lo revisa el equipo.",
      en: "Anyone with a verified WhatsApp can report: one report per listing and up to {max} a day. The owner doesn't know who reported it. A report, like a signal, doesn't hide the listing: our team reviews it.",
    },
    accionesTitulo: { es: "Qué hace el equipo", en: "What our team does" },
    acciones: {
      pausar: {
        es: "Pausa el anuncio: sale de la búsqueda y de su enlace hasta que se aclare, y le escribimos al dueño.",
        en: "Pauses the listing: it comes off search and its link until things are cleared up, and we message the owner.",
      },
      pedir_ctl: {
        es: "Le pide al dueño un certificado de tradición y libertad de 30 días o menos. Si el anuncio era verificado, queda en «re-verificación pendiente» hasta verlo.",
        en: "Asks the owner for a title record issued 30 days ago or less. If the listing was verified, it shows \"re-check pending\" until we see it.",
      },
      descartar: {
        es: "Descarta la señal cuando tiene explicación, y deja escrito por qué.",
        en: "Dismisses the signal when there's an explanation, and writes down why.",
      },
    },
  },

  // La cola del operador (`/operador/antifraude`).
  cola: {
    meta: { titulo: { es: "Revisión antifraude", en: "Anti-fraud review" } },
    titulo: { es: "Revisión antifraude", en: "Anti-fraud review" },
    intro: {
      es: "Cada bandera sale de una regla escrita, no de una corazonada. Tú decides.",
      en: "Every flag comes from a written rule, not a hunch. You decide.",
    },
    revisar: { es: "Revisar reglas ahora", en: "Check rules now" },
    revisando: { es: "Revisando…", en: "Checking…" },
    revisado: {
      es: "Reglas revisadas. Banderas abiertas: {precio} de precio, {foto} de foto, {matricula} de matrícula y {telefono} de teléfono.",
      en: "Rules checked. Open flags: {precio} price, {foto} photo, {matricula} title number and {telefono} phone.",
    },
    huellar: { es: "Huellar fotos pendientes", en: "Fingerprint pending photos" },
    huellando: { es: "Huellando {n} fotos…", en: "Fingerprinting {n} photos…" },
    huellado: {
      es: "Fotos huelladas: {ok}. Sin poder leer: {fallidas}.",
      en: "Photos fingerprinted: {ok}. Couldn't read: {fallidas}.",
    },
    vacia: {
      es: "Nada por revisar: ningún anuncio tiene banderas ni reportes abiertos.",
      en: "Nothing to review: no listing has open flags or reports.",
    },
    publicado: {
      es: "Publicado el {fecha} · {nivel}",
      en: "Listed on {fecha} · {nivel}",
    },
    nivel: {
      fundador: { es: "Fundador", en: "Founding seller" },
      verificado: { es: "Verificado", en: "Verified" },
    },
    cuenta: {
      banderaUna: { es: "1 bandera", en: "1 flag" },
      banderas: { es: "{n} banderas", en: "{n} flags" },
      reporteUno: { es: "1 reporte de comprador", en: "1 buyer report" },
      reportes: { es: "{n} reportes de compradores", en: "{n} buyer reports" },
    },
    bandera: {
      precio: {
        es: "Precio {porcentaje} % bajo la mediana de su zona",
        en: "Price {porcentaje}% below its area's median",
      },
      precioRegla: {
        es: "Regla: {umbral} % o más por debajo · {n} comparables de su {ambito}.",
        en: "Rule: {umbral}% or more below · {n} comparables in its {ambito}.",
      },
      foto: {
        es: "Foto repetida en otro anuncio",
        en: "Photo repeated in another listing",
      },
      fotoDetalle: {
        es: "La foto {foto} se parece a la foto {foto_otro} de /i/{slug} ({distancia} de 64 puntos de diferencia).",
        en: "Photo {foto} looks like photo {foto_otro} of /i/{slug} ({distancia} of 64 points apart).",
      },
      matricula: { es: "Matrícula repetida", en: "Title number repeated" },
      matriculaDetalle: {
        es: "La misma matrícula está en /i/{slug}, publicado con otro teléfono.",
        en: "The same title number is on /i/{slug}, listed with another phone.",
      },
      telefono: { es: "Teléfono repetido", en: "Phone number repeated" },
      telefonoDetalle: {
        es: "El mismo WhatsApp publicó otros {otros} anuncios con otros nombres.",
        en: "The same WhatsApp listed {otros} more properties under other names.",
      },
    },
    ambito: {
      barrio: { es: "barrio", en: "neighbourhood" },
      localidad: { es: "localidad", en: "locality" },
    },
    reportes: {
      titulo: { es: "Lo que dicen los reportes", en: "What the reports say" },
      // `{motivos}` = los motivos de un reporte, separados por « · ».
      fila: { es: "«{motivos}» · {fecha}", en: "\"{motivos}\" · {fecha}" },
    },
    estado: {
      pausado: { es: "Pausado desde el {fecha}", en: "Paused since {fecha}" },
      ctlPedido: { es: "CTL pedido el {fecha}", en: "Title record requested on {fecha}" },
    },
    acciones: {
      etiqueta: { es: "Acciones sobre el anuncio", en: "Actions on the listing" },
      pausar: { es: "Pausar el anuncio", en: "Pause the listing" },
      reactivar: { es: "Reactivar el anuncio", en: "Reactivate the listing" },
      pedirCtl: { es: "Pedir el CTL al dueño", en: "Ask the owner for the title record" },
      descartar: { es: "Descartar las banderas", en: "Dismiss the flags" },
      escribir: { es: "Escribirle al dueño por WhatsApp", en: "Message the owner on WhatsApp" },
      verFicha: { es: "Ver la ficha", en: "See the listing" },
      trabajando: { es: "Guardando…", en: "Saving…" },
    },
    hechos: {
      pausado: {
        es: "Anuncio pausado: salió de la búsqueda, de su enlace, del contacto y de las visitas. Avísale al dueño por WhatsApp.",
        en: "Listing paused: it's off search, its link, contact and viewings. Let the owner know on WhatsApp.",
      },
      reactivado: {
        es: "Anuncio reactivado: vuelve a verse si sigue vigente.",
        en: "Listing reactivated: it shows again if it's still current.",
      },
      ctlPedido: {
        es: "CTL pedido. Escríbele al dueño: el anuncio sigue visible y, si era verificado, con «re-verificación pendiente» hasta que muestre un CTL de 30 días o menos.",
        en: "Title record requested. Message the owner: the listing stays visible and, if it was verified, shows \"re-check pending\" until they show a title record 30 days old or less.",
      },
      descartado: {
        es: "Banderas descartadas, con la razón y la fecha en el registro de la revisión.",
        en: "Flags dismissed, with the reason and the date in the review log.",
      },
    },
    descartar: {
      titulo: { es: "¿Por qué las descartas?", en: "Why are you dismissing them?" },
      razones: {
        es_el_dueno: {
          es: "Comprobé que publica el dueño",
          en: "I checked the owner is the one listing",
        },
        tiene_explicacion: {
          es: "El precio o las fotos tienen explicación",
          en: "The price or the photos have an explanation",
        },
        mismo_dueno: {
          es: "Es el mismo dueño con otro anuncio",
          en: "It's the same owner with another listing",
        },
        sin_fundamento: {
          es: "Los reportes no se sostienen",
          en: "The reports don't hold up",
        },
      },
      nota: { es: "Nota (opcional)", en: "Note (optional)" },
      confirmar: { es: "Descartar", en: "Dismiss" },
      cancelar: { es: "Cancelar", en: "Cancel" },
    },
    errores: {
      estado_invalido: {
        es: "Alguien ya actuó sobre este anuncio: recarga la página.",
        en: "Someone already acted on this listing: reload the page.",
      },
      razon: { es: "Elige una razón.", en: "Choose a reason." },
      servidor: {
        es: "No pudimos guardar. Intenta de nuevo.",
        en: "We couldn't save. Please try again.",
      },
    },
  },
} as const satisfies Arbol;
