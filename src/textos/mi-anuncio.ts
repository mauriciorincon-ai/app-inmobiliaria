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
    fotos: { es: "Fotos", en: "Photos" },
    descripcion: { es: "Descripción", en: "Description" },
    contacto: { es: "Contacto", en: "Contact" },
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

  contacto: {
    titulo: {
      es: "Mostrar mi WhatsApp en la ficha pública",
      en: "Show my WhatsApp number on the public listing",
    },
    texto: {
      es: "Los interesados podrán escribirte directo. Puedes desactivarlo cuando quieras. Sin esto, tu contacto no aparece.",
      en: "Interested people will be able to message you directly. You can turn it off whenever you like. Without this, your contact details don't appear.",
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
  },
} as const satisfies Arbol;
