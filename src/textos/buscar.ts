// Búsqueda del comprador (/buscar). Redactada en cada idioma, no traducida (S6). El inglés nombra y
// explica el término local la primera vez (localidad, barrio). Las frases cuentan SOLO lo que la
// página hace hoy: guardar en favoritos y crear una alerta por correo (S9); el contacto con el dueño vive en
// la ficha.
import type { Arbol } from "@/i18n/textos";

export const BUSCAR = {
  meta: {
    titulo: {
      es: "Buscar inmuebles en Bogotá — Innmobiliaria",
      en: "Search properties in Bogotá — Innmobiliaria",
    },
    descripcion: {
      es: "Anuncios vivos de dueños directos en Bogotá: filtra por precio, tipo y habitaciones, o dibuja tu zona en el mapa.",
      en: "Live listings from direct owners in Bogotá: filter by price, type and bedrooms, or draw your area on the map.",
    },
  },

  // Etiqueta del grupo de navegación de la cabecera.
  enlace: { es: "Buscar", en: "Search" },

  filtros: {
    grupo: { es: "Filtros de búsqueda", en: "Search filters" },
    operacion: { es: "Operación", en: "Deal type" },
    abrir: { es: "Filtros", en: "Filters" },
    abrirCon: { es: "Filtros · {n}", en: "Filters · {n}" },
    tipo: { es: "Tipo de inmueble", en: "Property type" },
    tipoTodos: { es: "Todos", en: "All" },
    localidad: { es: "Localidad", en: "Locality (localidad)" },
    localidadTodas: { es: "Todas", en: "All" },
    localidadAyuda: {
      es: "Bogotá se divide en localidades; dentro de cada una hay barrios.",
      en: "A localidad is one of Bogotá's administrative districts; each one contains several neighborhoods (barrios).",
    },
    precioMin: { es: "Precio mínimo (COP)", en: "Minimum price (COP)" },
    precioMax: { es: "Precio máximo (COP)", en: "Maximum price (COP)" },
    precioEjemplo: { es: "Ej: 300.000.000", en: "e.g. 300,000,000" },
    habitaciones: { es: "Habitaciones (mínimo)", en: "Bedrooms (at least)" },
    habitacionesCualquiera: { es: "Cualquiera", en: "Any" },
    habitacionesMas: { es: "{n} o más", en: "{n} or more" },
    aplicar: { es: "Ver resultados", en: "Show results" },
    quitar: { es: "Quitar filtros", en: "Clear filters" },
    activos: { es: "Filtros activos", en: "Active filters" },
    quitarUno: {
      es: "Quitar el filtro: {filtro}",
      en: "Remove filter: {filtro}",
    },
    chip: {
      hasta: { es: "Hasta {precio}", en: "Up to {precio}" },
      desde: { es: "Desde {precio}", en: "From {precio}" },
      habitaciones: { es: "{n}+ habitaciones", en: "{n}+ bedrooms" },
      localidad: { es: "Localidad: {nombre}", en: "Locality: {nombre}" },
      zona: { es: "Zona dibujada", en: "Drawn area" },
    },
  },

  vista: {
    etiqueta: { es: "Vista", en: "View" },
    lista: { es: "Lista", en: "List" },
    mapa: { es: "Mapa", en: "Map" },
  },

  mapa: {
    etiqueta: { es: "Mapa de búsqueda", en: "Search map" },
    dibujar: { es: "Dibujar zona", en: "Draw an area" },
    borrar: { es: "Borrar zona", en: "Clear area" },
    listo: { es: "Listo", en: "Done" },
    guia: {
      es: "Toca el mapa para marcar las esquinas de tu zona (mínimo 3).",
      en: "Tap the map to mark the corners of your area (at least 3).",
    },
    puntos: { es: "{n} esquinas marcadas", en: "{n} corners marked" },
    cargando: { es: "Cargando el mapa…", en: "Loading the map…" },
    atribucionCatastro: {
      es: "Barrios: Catastro Bogotá (CC BY 4.0)",
      en: "Neighborhoods: Bogotá cadastre (CC BY 4.0)",
    },
    // Por qué no se acepta la zona dibujada (los códigos salen de `engine/busqueda/poligono`).
    motivo: {
      pocos_puntos: {
        es: "Marca al menos 3 esquinas.",
        en: "Mark at least 3 corners.",
      },
      muchos_puntos: {
        es: "Demasiadas esquinas: el máximo son 100.",
        en: "Too many corners: 100 at most.",
      },
      fuera_de_bogota: {
        es: "La zona tiene que estar dentro de Bogotá.",
        en: "The area has to be inside Bogotá.",
      },
      muy_pequena: {
        es: "La zona es muy pequeña: agrándala para abarcar al menos un barrio.",
        en: "That area is too small: make it bigger to cover at least one neighborhood.",
      },
      se_cruza: {
        es: "Los lados de la zona se cruzan: bórrala y dibújala de nuevo.",
        en: "The area's sides cross each other: clear it and draw it again.",
      },
    },
    caido: {
      titulo: { es: "El mapa no cargó", en: "The map didn't load" },
      detalle: {
        es: "La lista sigue funcionando con tus filtros.",
        en: "The list still works with your filters.",
      },
      reintentar: { es: "Reintentar", en: "Try again" },
    },
  },

  lista: {
    conteoBogotaUno: {
      es: "{n} anuncio vivo en Bogotá",
      en: "{n} live listing in Bogotá",
    },
    conteoBogotaVarios: {
      es: "{n} anuncios vivos en Bogotá",
      en: "{n} live listings in Bogotá",
    },
    conteoFiltrosUno: {
      es: "{n} anuncio vivo con tus filtros",
      en: "{n} live listing matching your filters",
    },
    conteoFiltrosVarios: {
      es: "{n} anuncios vivos con tus filtros",
      en: "{n} live listings matching your filters",
    },
    conteoZonaUno: {
      es: "{n} anuncio vivo en tu zona",
      en: "{n} live listing in your area",
    },
    conteoZonaVarios: {
      es: "{n} anuncios vivos en tu zona",
      en: "{n} live listings in your area",
    },
    orden: {
      es: "Los confirmados más recientemente, primero",
      en: "Most recently confirmed first",
    },
    guardarAlerta: { es: "Guardar como alerta", en: "Save as alert" },
    tope: {
      es: "Mostramos los {n} confirmados más recientemente. Afina tus filtros para ver otros.",
      en: "Showing the {n} most recently confirmed. Narrow your filters to see others.",
    },
    privacidad: {
      es: "Cada anuncio aparece en el área de su barrio, nunca en un punto exacto: la dirección exacta no se muestra.",
      en: "Each listing shows as the area of its neighborhood, never as an exact point: the exact address isn't shown.",
    },
    primeraVez: {
      titulo: {
        es: "Dibuja tu zona en el mapa",
        en: "Draw your area on the map",
      },
      detalle: {
        es: "Marca las calles donde quieres vivir y te mostramos solo lo que está adentro.",
        en: "Mark the streets where you want to live and we'll show only what's inside.",
      },
    },
    sinResultados: {
      titulo: {
        es: "Aún no hay anuncios vivos con esa búsqueda",
        en: "No live listings match that search yet",
      },
      detalle: {
        es: "Prueba con una zona más grande o quita un filtro.",
        en: "Try a bigger area or remove a filter.",
      },
      quitarFiltros: { es: "Quitar los filtros", en: "Clear the filters" },
      quitarZona: { es: "Quitar la zona", en: "Clear the area" },
      avisame: {
        es: "Avísame en esta zona",
        en: "Tell me about this area",
      },
    },
    error: {
      titulo: {
        es: "No pudimos cargar los anuncios",
        en: "We couldn't load the listings",
      },
      detalle: {
        es: "Recarga la página o inténtalo en un momento.",
        en: "Reload the page or try again in a moment.",
      },
    },
  },

  tarjeta: {
    habitaciones: { es: "{n} hab.", en: "{n} bd" },
    sinFoto: { es: "Sin fotos todavía", en: "No photos yet" },
  },

  cargando: { es: "Buscando…", en: "Searching…" },
} as const satisfies Arbol;
