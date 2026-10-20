// «¿Está caro este anuncio?» y «Datos de la zona» (S10, maqueta 09, ADR 018). Redactada en cada idioma, no traducida.
// SIEMPRE un rango con su N, su fecha y su fuente; jamás un «avalúo» ni un valor único: el precio de oferta no es el de
// cierre, y el valor de Catastro es del terreno. Los marcadores `{…}` los rellena la interfaz.
import type { Arbol } from "@/i18n/textos";

export const PRECIO = {
  meta: {
    titulo: {
      es: "¿Está caro este anuncio? — Innmobiliaria",
      en: "Is this listing overpriced? — Innmobiliaria",
    },
    descripcion: {
      es: "El precio por m² de este anuncio frente al rango de los anuncios parecidos de su zona, con su fuente y su fecha.",
      en: "This listing's price per m² against the range of similar listings in its area, with its source and date.",
    },
  },

  titulo: {
    es: "¿Está caro este anuncio?",
    en: "Is this listing overpriced?",
  },
  volver: { es: "Volver al anuncio", en: "Back to the listing" },
  resumen: {
    es: "{tipo} en {barrio} · {precio} · {area} m² = {m2} por m²",
    en: "{tipo} in {barrio} · {precio} · {area} m² = {m2} per m²",
  },
  nota: {
    es: "Un rango de lo que piden otros dueños por anuncios parecidos. No es un avalúo.",
    en: "A range of what other owners ask for similar listings. It is not an appraisal (avalúo).",
  },

  // El nombre de la fuente de los comparables, que se muestra junto a la fecha.
  fuente: {
    es: "anuncios vivos en Innmobiliaria",
    en: "live listings on Innmobiliaria",
  },

  // La etiqueta corta de cada estado (la ficha, comparar, el dueño). Siempre con símbolo + texto, nunca solo color.
  estado: {
    en_rango: { es: "En rango", en: "In range" },
    caro: { es: "Por encima del rango", en: "Above the range" },
    sospechoso: { es: "Sospechosamente barato", en: "Suspiciously cheap" },
    sin_datos: { es: "Sin datos suficientes", en: "Not enough data" },
  },

  // La pantalla de detalle (maqueta 09).
  detalle: {
    frenteBarrio: {
      es: "Precio por m² frente a {n} anuncios comparables de {zona}",
      en: "Price per m² against {n} comparable listings in {zona}",
    },
    frenteLocalidad: {
      es: "Precio por m² frente a {n} anuncios comparables de toda la localidad de {zona} (en el barrio hay pocos)",
      en: "Price per m² against {n} comparable listings across the whole localidad of {zona} (the neighborhood has too few)",
    },
    error: {
      es: "No pudimos consultar los anuncios parecidos ahora. Inténtalo de nuevo en un momento.",
      en: "We couldn't look up similar listings right now. Try again in a moment.",
    },
    marca: { es: "Este", en: "This one" },
    barraAria: {
      es: "Este anuncio pide {m2} por m². El rango de su zona va de {p25} a {p75} por m².",
      en: "This listing asks {m2} per m². Its area's range goes from {p25} to {p75} per m².",
    },
    escala: {
      es: "Rango entre {p25} y {p75} por m²",
      en: "Range between {p25} and {p75} per m²",
    },
    rangoEnPesos: {
      es: "Para {area} m²: entre {p25} y {p75}",
      en: "For {area} m²: between {p25} and {p75}",
    },
    veredicto: {
      en_rango: {
        titulo: {
          es: "Dentro del rango de su zona",
          en: "Within its area's range",
        },
        texto: {
          es: "La mitad central de los comparables pide entre {p25} y {p75} por m². Este pide {m2}.",
          en: "The middle half of the comparables asks between {p25} and {p75} per m². This one asks {m2}.",
        },
      },
      debajo: {
        titulo: {
          es: "Dentro del rango, en la parte baja",
          en: "Within the range, at the low end",
        },
        texto: {
          es: "Pide {m2} por m², un poco por debajo de {p25}, el piso del rango de su zona. Sin llegar a ser sospechoso: pregúntale al dueño por qué.",
          en: "It asks {m2} per m², a little below {p25}, the floor of its area's range. Not suspicious, but ask the owner why.",
        },
      },
      caro: {
        titulo: { es: "Por encima del rango", en: "Above the range" },
        texto: {
          es: "Pide {m2} por m², {pct} % sobre el tope del rango ({p75}). Puede tener algo que lo justifique; pregúntale al dueño qué.",
          en: "It asks {m2} per m², {pct}% above the top of the range ({p75}). Something may justify it; ask the owner what.",
        },
      },
      sospechoso: {
        titulo: {
          es: "Muy por debajo de su zona: revisa con cuidado",
          en: "Far below its area: check carefully",
        },
        texto: {
          es: "Pide {pct} % menos que la mediana ({mediana} por m²). Un precio así puede ser señal de estafa. Visita antes de pagar, pide el CTL y nunca des anticipos.",
          en: "It asks {pct}% less than the median ({mediana} per m²). A price like this can be a sign of a scam. View it before you pay, ask for the title record (CTL) and never pay a deposit up front.",
        },
      },
      sin_datos: {
        titulo: {
          es: "Aún no hay suficientes comparables",
          en: "Not enough comparables yet",
        },
        texto: {
          es: "Para dar un rango honesto pedimos al menos {minimo} anuncios parecidos en la zona; hoy hay {n}. Te mostramos el rango apenas existan.",
          en: "To give an honest range we need at least {minimo} similar listings in the area; today there are {n}. We'll show the range as soon as there are.",
        },
      },
    },
    como: {
      abrir: { es: "Cómo lo calculamos", en: "How we calculate it" },
      pasos: [
        {
          es: "Comparables: mismo tipo y operación, con área parecida (±30 %), vivos hoy. Primero los de su barrio; si no alcanzan, los de toda su localidad, y lo decimos.",
          en: "Comparables: same type and deal, similar size (±30%), live today. First the ones in its neighborhood; if there aren't enough, the whole localidad, and we say so.",
        },
        {
          es: "Quitamos los precios atípicos (los que se salen 1,5 veces del rango entre cuartiles) antes de contar. Con menos de {minimo} anuncios no damos rango.",
          en: "We drop outlier prices (the ones that fall 1.5 times the interquartile range outside) before counting. With fewer than {minimo} listings we give no range.",
        },
        {
          es: "El rango va del percentil 25 al 75 del precio por m², la mitad central, aplicado al área del anuncio.",
          en: "The range runs from the 25th to the 75th percentile of the price per m², the middle half, applied to the listing's size.",
        },
        {
          es: "Es el precio que piden los dueños, no el de cierre. No es un avalúo.",
          en: "It's the owners' asking price, not the sale price. It's not an appraisal (avalúo).",
        },
        {
          es: "Fuente: {fuente} al {fecha}.",
          en: "Source: {fuente} as of {fecha}.",
        },
      ],
    },
  },

  // Datos de la zona (maqueta 09): tres cifras, cada una con su fuente y su fecha, que nunca se mezclan.
  zona: {
    titulo: { es: "Datos de la zona", en: "Area data" },
    subtitulo: {
      es: "{tipo} en {zona} · {operacion}",
      en: "{tipo} in {zona} · {operacion}",
    },
    cifras: { es: "Cifras de la zona", en: "Area figures" },
    medianaOferta: {
      etiqueta: {
        es: "m² mediano de oferta",
        en: "Median asking price per m²",
      },
      detalleBarrio: {
        es: "Innmobiliaria · {fecha} · {n} anuncios del barrio",
        en: "Innmobiliaria · {fecha} · {n} listings in the neighborhood",
      },
      detalleLocalidad: {
        es: "Innmobiliaria · {fecha} · {n} anuncios de la localidad",
        en: "Innmobiliaria · {fecha} · {n} listings in the localidad",
      },
      sinDatos: {
        es: "Sin datos suficientes (menos de {minimo} anuncios parecidos)",
        en: "Not enough data (fewer than {minimo} similar listings)",
      },
    },
    ofertaActiva: {
      etiqueta: { es: "Oferta activa", en: "Active listings" },
      barrio: {
        es: "{n} en el barrio · vivos hoy",
        en: "{n} in the neighborhood · live today",
      },
      localidad: {
        es: "{n} en la localidad · vivos hoy",
        en: "{n} in the localidad · live today",
      },
    },
    terreno: {
      etiqueta: {
        es: "Valor de referencia del m² de terreno",
        en: "Reference value per m² of land",
      },
      detalle: {
        es: "Catastro Bogotá (UAECD) · vigencia {vigencia} · mediana de {n} manzanas del barrio",
        en: "Bogotá cadastre (UAECD) · {vigencia} values · median of {n} blocks in the neighborhood",
      },
      sinDato: {
        es: "Catastro no publica un valor de referencia para este barrio",
        en: "The cadastre doesn't publish a reference value for this neighborhood",
      },
    },
    aviso: {
      es: "El valor de Catastro es solo del terreno, por manzana: sirve de referencia, no de precio de un apartamento ni de una casa.",
      en: "The cadastre's value is for land only, by block: it's a reference, not the price of an apartment or a house.",
    },
    atribucion: {
      es: "Datos abiertos de Bogotá: «Valor de referencia por metro cuadrado de terreno», Unidad Administrativa Especial de Catastro Distrital (UAECD), vigencia {vigencia}, licencia {licencia}. Los anuncios son los de Innmobiliaria.",
      en: "Bogotá open data: «Reference value per square meter of land» (Valor de referencia por metro cuadrado de terreno), Unidad Administrativa Especial de Catastro Distrital (UAECD), {vigencia} values, {licencia} license. The listings are Innmobiliaria's own.",
    },
    dueno: {
      es: "El dueño ve este mismo rango cuando publica, para poner un precio con datos.",
      en: "The owner sees this same range when listing, to set a price with data.",
    },
  },

  // La tarjeta de la ficha (maqueta 02/09).
  tarjeta: {
    titulo: { es: "¿Está caro?", en: "Is it overpriced?" },
    frente: {
      es: "Frente a {n} anuncios comparables",
      en: "Against {n} comparable listings",
    },
    sinDatos: {
      es: "Aún hay pocos anuncios parecidos para dar un rango honesto.",
      en: "There are still too few similar listings to give an honest range.",
    },
    ver: { es: "Ver el detalle", en: "See the detail" },
    nota: {
      es: "Un rango de lo que piden otros dueños, no un avalúo.",
      en: "A range of what other owners ask, not an appraisal.",
    },
  },

  // «¿Cabe en lo que puedes pagar?» en la ficha: lee el cálculo guardado en ESTE teléfono.
  cuota: {
    titulo: { es: "Tu cuota", en: "Your payment" },
    calcula: { es: "Calcula tu cuota", en: "Calculate your payment" },
    calculaAyuda: {
      es: "Con tus ingresos y tu cuota inicial, en tu teléfono.",
      en: "With your income and down payment, on your phone.",
    },
    cabe: {
      es: "≈ {cuota} al mes con la tasa del {fecha}: cabe en lo que puedes pagar",
      en: "≈ {cuota} a month at the {fecha} rate: fits what you can pay",
    },
    noCabe: {
      es: "≈ {cuota} al mes con la tasa del {fecha}: pasa de lo que puedes pagar",
      en: "≈ {cuota} a month at the {fecha} rate: over what you can pay",
    },
    cabeTuTasa: {
      es: "≈ {cuota} al mes con tu tasa: cabe en lo que puedes pagar",
      en: "≈ {cuota} a month at your rate: fits what you can pay",
    },
    noCabeTuTasa: {
      es: "≈ {cuota} al mes con tu tasa: pasa de lo que puedes pagar",
      en: "≈ {cuota} a month at your rate: over what you can pay",
    },
    sinTasa: {
      es: "Escribe una tasa para ver tu cuota.",
      en: "Enter a rate to see your payment.",
    },
    excede: {
      es: "Ojo: con esa cuota inicial el crédito pasaría del 70 % del valor, el máximo que permite la norma. Sube la cuota inicial al 30 % o más.",
      en: "Heads up: with that down payment the loan would go over 70% of the value, the maximum the rule allows. Raise the down payment to 30% or more.",
    },
    ajustar: { es: "Ajustar mi cálculo", en: "Adjust my numbers" },
    privado: {
      es: "Tu cálculo vive solo en este teléfono.",
      en: "Your numbers live only on this phone.",
    },
  },

  // El dueño ve el mismo rango cuando publica y desde «Mi anuncio» (corre en su navegador).
  dueno: {
    titulo: {
      es: "Lo que piden por anuncios parecidos",
      en: "What similar listings ask",
    },
    falta: {
      es: "Elige el tipo, la localidad, el barrio y escribe el área para ver el rango de tu zona.",
      en: "Pick the type, localidad and neighborhood and enter the size to see your area's range.",
    },
    cargando: {
      es: "Buscando anuncios parecidos…",
      en: "Looking for similar listings…",
    },
    error: {
      es: "No pudimos consultar los anuncios parecidos ahora. Puedes seguir sin esto.",
      en: "We couldn't look up similar listings right now. You can carry on without it.",
    },
    rango: {
      es: "En {zona}, la mitad central de los anuncios parecidos pide entre {p25} y {p75} por {area} m² ({n} anuncios al {fecha}).",
      en: "In {zona}, the middle half of similar listings asks between {p25} and {p75} for {area} m² ({n} listings as of {fecha}).",
    },
    barrio: { es: "tu barrio", en: "your neighborhood" },
    localidad: { es: "tu localidad", en: "your localidad" },
    tuPrecio: {
      en_rango: {
        es: "Tu precio está dentro de ese rango.",
        en: "Your price is within that range.",
      },
      debajo: {
        es: "Tu precio está dentro del rango, en la parte baja.",
        en: "Your price is within the range, at the low end.",
      },
      caro: {
        es: "Tu precio está por encima de ese rango.",
        en: "Your price is above that range.",
      },
      sospechoso: {
        es: "Tu precio está muy por debajo de lo que piden otros: revisa que no falte un cero.",
        en: "Your price is far below what others ask: check you haven't left out a zero.",
      },
    },
    sinDatos: {
      es: "Aún no hay suficientes anuncios parecidos en tu zona para dar un rango (hay {n}; pedimos al menos {minimo}). Lo verás apenas existan.",
      en: "There aren't enough similar listings in your area yet to give a range (there are {n}; we need at least {minimo}). You'll see it as soon as there are.",
    },
    nota: {
      es: "Es lo que piden otros dueños, no el precio de cierre. No es un avalúo.",
      en: "It's what other owners ask, not the sale price. It's not an appraisal (avalúo).",
    },
  },
} as const satisfies Arbol;
