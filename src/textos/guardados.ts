// Guardados (S9, maqueta 07, ADR 017): favoritos sin cuenta, comparar hasta 4 y listas compartidas con notas.
// Redactada en cada idioma, no traducida. Innmobiliaria JAMÁS escribe por WhatsApp: «Compartir por WhatsApp»
// abre WhatsApp con el texto escrito y quien lo envía es la persona. Los marcadores `{…}` los rellena la UI.
import type { Arbol } from "@/i18n/textos";

export const GUARDADOS = {
  meta: {
    titulo: {
      es: "Guardados — Innmobiliaria",
      en: "Saved — Innmobiliaria",
    },
  },
  titulo: { es: "Guardados", en: "Saved" },
  cargando: { es: "Un momento…", en: "One moment…" },
  error: {
    es: "No pudimos cargar tus guardados. Recarga la página o inténtalo en un momento.",
    en: "We couldn't load your saved listings. Reload the page or try again in a moment.",
  },

  vista: {
    grupo: { es: "Vista", en: "View" },
    favoritos: { es: "Favoritos", en: "Favorites" },
    comparar: { es: "Comparar", en: "Compare" },
    listas: { es: "Listas", en: "Lists" },
  },

  aviso: {
    telefono: {
      es: "Tus favoritos viven en este teléfono. Verifica tu WhatsApp para verlos en cualquier dispositivo y compartir listas.",
      en: "Your favorites live on this phone. Verify your WhatsApp to see them on any device and share lists.",
    },
    cuenta: {
      es: "Tus favoritos están guardados con tu WhatsApp verificado: los ves en cualquier dispositivo donde lo verifiques.",
      en: "Your favorites are saved with your verified WhatsApp: you see them on any device where you verify it.",
    },
    verificar: { es: "Verificar mi WhatsApp", en: "Verify my WhatsApp" },
  },

  favoritos: {
    contador: {
      es: "{n} de {tope} para comparar",
      en: "{n} of {tope} picked to compare",
    },
    comparar: { es: "Comparar", en: "Compare" },
    tope: {
      es: "Puedes comparar hasta {tope} a la vez. Quita uno para sumar otro.",
      en: "You can compare up to {tope} at a time. Remove one to add another.",
    },
    marcar: { es: "Comparar", en: "Compare" },
    marcarAria: { es: "Comparar: {anuncio}", en: "Compare: {anuncio}" },
    quitar: { es: "Quitar de favoritos", en: "Remove from favorites" },
    quitarAria: {
      es: "Quitar de favoritos: {anuncio}",
      en: "Remove from favorites: {anuncio}",
    },
    ver: { es: "Ver el anuncio: {anuncio}", en: "See the listing: {anuncio}" },
    noDisponiblesUno: {
      es: "Uno de tus guardados ya no está disponible.",
      en: "One of your saved listings is no longer available.",
    },
    noDisponiblesVarios: {
      es: "{n} de tus guardados ya no están disponibles.",
      en: "{n} of your saved listings are no longer available.",
    },
    limpiar: { es: "Quitarlos de mi lista", en: "Remove them from my list" },
    vacio: {
      titulo: {
        es: "Aún no guardas ningún anuncio",
        en: "You haven't saved any listings yet",
      },
      texto: {
        es: "Toca el corazón en un anuncio para guardarlo aquí. No necesitas cuenta.",
        en: "Tap the heart on a listing to save it here. You don't need an account.",
      },
      boton: { es: "Buscar en el mapa", en: "Search the map" },
    },
  },

  comparar: {
    ayuda: {
      es: "Desliza de lado en el teléfono para ver todos.",
      en: "Swipe sideways on your phone to see them all.",
    },
    pocos: {
      es: "Marca al menos dos favoritos para compararlos.",
      en: "Pick at least two favorites to compare them.",
    },
    cambiar: {
      es: "Cambiar los que comparo",
      en: "Change what I compare",
    },
    tabla: { es: "Comparación de anuncios", en: "Listing comparison" },
    dato: { es: "Dato", en: "Detail" },
    filas: {
      precio: { es: "Precio", en: "Price" },
      area: { es: "Área", en: "Size" },
      precioM2: { es: "Precio por m²", en: "Price per m²" },
      habitaciones: { es: "Habitaciones", en: "Bedrooms" },
      dueno: { es: "Dueño", en: "Owner" },
      vivo: { es: "Vivo", en: "Live" },
    },
  },

  listas: {
    titulo: { es: "Mis listas", en: "My lists" },
    primeroWhatsapp: {
      titulo: {
        es: "Para crear y compartir listas, verifica tu WhatsApp",
        en: "To create and share lists, verify your WhatsApp",
      },
      texto: {
        es: "Es una sola vez y toma unos 30 segundos.",
        en: "It's one time and takes about 30 seconds.",
      },
    },
    vacio: {
      es: "Aún no tienes listas. Crea una para decidir con otra persona.",
      en: "You don't have any lists yet. Create one to decide together with someone.",
    },
    nueva: { es: "Nueva lista", en: "New list" },
    nombre: { es: "Nombre de la lista", en: "List name" },
    ejemplo: { es: "Ej.: cerca del colegio", en: "E.g. near the school" },
    crear: { es: "Crear lista", en: "Create list" },
    creando: { es: "Creando…", en: "Creating…" },
    abrir: { es: "Abrir", en: "Open" },
    cerrar: { es: "Cerrar", en: "Close" },
    borrar: { es: "Borrar la lista", en: "Delete the list" },
    borrarConfirma: { es: "Sí, borrar", en: "Yes, delete" },
    anunciosUno: { es: "1 anuncio", en: "1 listing" },
    anunciosVarios: { es: "{n} anuncios", en: "{n} listings" },
    compartida: { es: "Compartida", en: "Shared" },
    errores: {
      nombre: {
        es: "Ponle un nombre a la lista.",
        en: "Give the list a name.",
      },
      demasiadas_listas: {
        es: "Llegaste al tope de listas. Borra una para crear otra.",
        en: "You've reached the limit of lists. Delete one to create another.",
      },
      no_verificado: {
        es: "Verifica tu WhatsApp para usar las listas.",
        en: "Verify your WhatsApp to use lists.",
      },
      servidor: {
        es: "No pudimos hacerlo. Inténtalo de nuevo en un momento.",
        en: "We couldn't do that. Try again in a moment.",
      },
    },
  },

  // La lista misma: la ve su dueña y quien llega con el enlace (`/lista#t=…`).
  lista: {
    meta: {
      titulo: {
        es: "Lista compartida — Innmobiliaria",
        en: "Shared list — Innmobiliaria",
      },
    },
    cargando: { es: "Un momento…", en: "One moment…" },
    por: { es: "Lista de {dueno}", en: "{dueno}'s list" },
    anunciosUno: { es: "1 anuncio", en: "1 listing" },
    anunciosVarios: { es: "{n} anuncios", en: "{n} listings" },
    vacia: {
      es: "Esta lista aún no tiene anuncios.",
      en: "This list has no listings yet.",
    },
    noDisponibles: {
      es: "Algunos anuncios de esta lista ya no están disponibles ({n}).",
      en: "Some listings on this list are no longer available ({n}).",
    },
    sinEnlace: {
      titulo: { es: "Este enlace no funciona", en: "This link doesn't work" },
      texto: {
        es: "Puede que la persona haya dejado de compartir la lista, o que el enlace esté incompleto. Pídele que te lo envíe de nuevo.",
        en: "The person may have stopped sharing the list, or the link may be incomplete. Ask them to send it to you again.",
      },
    },
    error: {
      es: "No pudimos cargar la lista. Recarga la página o inténtalo en un momento.",
      en: "We couldn't load the list. Reload the page or try again in a moment.",
    },
    ver: { es: "Ver el anuncio: {anuncio}", en: "See the listing: {anuncio}" },
    quitar: { es: "Quitar de la lista", en: "Remove from the list" },
    agregar: {
      etiqueta: {
        es: "Agregar de mis favoritos",
        en: "Add from my favorites",
      },
      elegir: { es: "Elige un favorito…", en: "Pick a favorite…" },
      boton: { es: "Agregar", en: "Add" },
      ninguno: {
        es: "Todos tus favoritos ya están en esta lista.",
        en: "All your favorites are already on this list.",
      },
    },
    notas: {
      etiqueta: { es: "Tu nota", en: "Your note" },
      ejemplo: { es: "Escribe una nota…", en: "Write a note…" },
      enviar: { es: "Agregar nota", en: "Add note" },
      enviando: { es: "Guardando…", en: "Saving…" },
      tu: { es: "Tú", en: "You" },
      borrar: { es: "Borrar nota", en: "Delete note" },
      verificar: {
        es: "Para escribir notas, verifica tu WhatsApp.",
        en: "To write notes, verify your WhatsApp.",
      },
      boton: { es: "Verificar mi WhatsApp", en: "Verify my WhatsApp" },
    },
    compartir: {
      boton: { es: "Compartir por WhatsApp", en: "Share on WhatsApp" },
      copiar: { es: "Copiar el enlace", en: "Copy the link" },
      copiado: { es: "Enlace copiado", en: "Link copied" },
      listo: {
        es: "Enlace listo. Quien lo abre ve la lista; para escribir notas, verifica su WhatsApp.",
        en: "Link ready. Whoever opens it sees the list; to write notes, they verify their WhatsApp.",
      },
      nuevo: {
        es: "Si compartes de nuevo, el enlace anterior deja de funcionar.",
        en: "If you share again, the previous link stops working.",
      },
      texto: {
        es: "Mira esta lista de Innmobiliaria: {nombre}",
        en: "Take a look at this Innmobiliaria list: {nombre}",
      },
      revocar: { es: "Dejar de compartir", en: "Stop sharing" },
      revocada: {
        es: "Listo: el enlace dejó de funcionar.",
        en: "Done: the link no longer works.",
      },
      estado: {
        es: "Esta lista tiene un enlace activo.",
        en: "This list has an active link.",
      },
      sin: {
        es: "Esta lista no se comparte todavía.",
        en: "This list isn't shared yet.",
      },
    },
    errores: {
      lista_llena: {
        es: "Una lista admite un número limitado de anuncios. Quita uno para sumar otro.",
        en: "A list holds a limited number of listings. Remove one to add another.",
      },
      demasiadas_notas: {
        es: "Llegaste al tope de notas. Inténtalo más tarde.",
        en: "You've reached the notes limit. Try again later.",
      },
      nota_invalida: {
        es: "Escribe una nota de hasta 280 caracteres.",
        en: "Write a note of up to 280 characters.",
      },
      no_verificado: {
        es: "Verifica tu WhatsApp para hacer esto.",
        en: "Verify your WhatsApp to do this.",
      },
      servidor: {
        es: "No pudimos hacerlo. Inténtalo de nuevo en un momento.",
        en: "We couldn't do that. Try again in a moment.",
      },
    },
  },
} as const satisfies Arbol;
