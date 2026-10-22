// Vivienda nueva (S11 maqueta, S12 producto). Redactada en cada idioma, no traducida, desde la maqueta aprobada
// (`docs/diseno/vivienda-nueva/`). La edición de la revista se muestra SIEMPRE con su fuente; el nombre de la publicación y
// su número no se traducen. Las cifras no viven aquí: salen de los motores de `src/engine/vivienda-nueva/`; este archivo
// solo tiene las frases y los nombres de los identificadores que esos motores devuelven.
import type { Arbol } from "@/i18n/textos";

export const VIVIENDA_NUEVA = {
  fuente: {
    es: "Fuente: Estrenar Vivienda, edición {n}",
    en: "Source: Estrenar Vivienda, edition {n}",
  },
  fuentePaginas: {
    es: "Fuente: Estrenar Vivienda, edición {n}, p. {paginas}",
    en: "Source: Estrenar Vivienda, edition {n}, p. {paginas}",
  },
  paginasUnion: { es: " y ", en: " and " },

  meta: {
    titulo: {
      es: "Vivienda nueva en Bogotá y la Sabana — Innmobiliaria",
      en: "New homes in Bogotá and the savanna — Innmobiliaria",
    },
    descripcion: {
      es: "Proyectos de vivienda nueva con lo que pagas de verdad: el precio «desde» más lo que la norma cobra por escriturar, la espera y lo que el aviso calla.",
      en: "New-home projects with what you really pay: the «from» price plus what the rules charge to close, the wait and what the ad leaves out.",
    },
    ficha: {
      es: "{nombre} — vivienda nueva — Innmobiliaria",
      en: "{nombre} — new home — Innmobiliaria",
    },
  },

  mercado: {
    grupo: { es: "Usados o nuevos", en: "Resale or new" },
    usados: { es: "Usados", en: "Resale" },
    nuevos: { es: "Nuevos", en: "New" },
  },

  pagina: {
    titulo: {
      es: "Vivienda nueva en Bogotá y la Sabana",
      en: "New homes in Bogotá and the savanna",
    },
    vigencia: {
      es: "Ventana de la edición: del {desde} al {hasta}",
      en: "Edition window: {desde} to {hasta}",
    },
    cargando: { es: "Cargando la edición…", en: "Loading the edition…" },
    sinEdicion: {
      titulo: { es: "Mes sin edición", en: "Month without an edition" },
      detalleUno: {
        es: "La edición de este mes todavía no llega. Lo que ves es la {n}, que venció hace 1 día: los precios pueden haber cambiado y el índice no se presenta como de hoy.",
        en: "This month's edition has not arrived yet. What you see is edition {n}, which expired 1 day ago: prices may have changed and the index is not presented as current.",
      },
      detalleVarios: {
        es: "La edición de este mes todavía no llega. Lo que ves es la {n}, que venció hace {dias} días: los precios pueden haber cambiado y el índice no se presenta como de hoy.",
        en: "This month's edition has not arrived yet. What you see is edition {n}, which expired {dias} days ago: prices may have changed and the index is not presented as current.",
      },
    },
    sinPublicar: {
      titulo: {
        es: "No hay una edición publicada",
        en: "No edition is published",
      },
      detalle: {
        es: "No hay una edición de vivienda nueva revisada y publicada en este momento. La búsqueda de usados sigue funcionando.",
        en: "There is no reviewed, published new-home edition at the moment. The resale search keeps working.",
      },
    },
    error: {
      titulo: {
        es: "No pudimos leer la vivienda nueva",
        en: "We could not load the new homes",
      },
      detalle: {
        es: "Intenta de nuevo en unos minutos. La búsqueda de usados sigue funcionando.",
        en: "Try again in a few minutes. The resale search keeps working.",
      },
    },
    pago: {
      etiqueta: {
        es: "Lo que puedes pagar: {precio}",
        en: "What you can afford: {precio}",
      },
      nota: {
        es: "Se compara con el precio verdadero («pagas al menos»), no con el «desde» del aviso. Tus ingresos no salen de tu teléfono: solo viaja este tope.",
        en: "It is compared with the true price («you pay at least»), not the ad's «from» price. Your income never leaves your phone: only this cap travels.",
      },
      ajustar: { es: "Cambiar mis números", en: "Change my numbers" },
      calcular: {
        es: "¿Cuánto puedes pagar? Calcúlalo",
        en: "How much can you afford? Work it out",
      },
    },
  },

  noEncontrado: {
    titulo: {
      es: "Ese proyecto no está en la edición",
      en: "That project is not in the edition",
    },
    detalle: {
      es: "Revisa el enlace o vuelve a la lista de vivienda nueva.",
      en: "Check the link or go back to the list of new homes.",
    },
    volver: { es: "Ver vivienda nueva", en: "See new homes" },
  },

  indice: {
    titulo: {
      es: "El índice: cuánto piden por m² privado",
      en: "The index: asking price per private m²",
    },
    nota: {
      es: "Mediana del m² «desde» sobre el área privada, con el recorte de atípicos y el mínimo de 5 proyectos del «¿Está caro?». Sin 5, no hay mediana. Un proyecto cuyas páginas imprimen cifras distintas no entra.",
      en: "Median «from» price per private m², with the same outlier trimming and 5-project minimum as «Is it overpriced?». Without 5, there is no median. A project whose pages print different figures is left out.",
    },
    medianaDe: {
      es: "mediana del m² privado «desde» de {usados} proyectos ({n} en la edición)",
      en: "median «from» private m² of {usados} projects ({n} in the edition)",
    },
    sinDatos: { es: "Sin datos suficientes", en: "Not enough data" },
    detalleMediana: {
      es: "{n} proyectos · {conArea} traen área privada · mediana de {usados}",
      en: "{n} projects · {conArea} give private area · median of {usados}",
    },
    detalleSinUno: {
      es: "{n} proyecto · {conArea} con área privada · hacen falta {minimo}",
      en: "{n} project · {conArea} with private area · {minimo} needed",
    },
    detalleSinVarios: {
      es: "{n} proyectos · {conArea} con área privada · hacen falta {minimo}",
      en: "{n} projects · {conArea} with private area · {minimo} needed",
    },
    enConflictoUno: {
      es: "1 proyecto con cifras en conflicto, fuera del m²",
      en: "1 project with conflicting figures, left out of the m²",
    },
    enConflictoVarios: {
      es: "{n} proyectos con cifras en conflicto, fuera del m²",
      en: "{n} projects with conflicting figures, left out of the m²",
    },
    desglose: {
      es: "Por zona, franja de precio y segmento",
      en: "By area, price band and segment",
    },
    zona: { es: "Zona", en: "Area" },
    franja: {
      es: "Franja de precio «desde»",
      en: "«From» price band",
    },
    segmento: { es: "Segmento impreso", en: "Printed segment" },
    m2Mediana: { es: "m² privado (mediana)", en: "Private m² (median)" },
    conQue: { es: "Con qué", en: "Based on" },
    entregasUno: {
      es: "1 proyecto de vivienda se anuncia con entrega inmediata.",
      en: "1 housing project is advertised as ready to move in.",
    },
    entregasVarios: {
      es: "{n} proyectos de vivienda se anuncian con entrega inmediata.",
      en: "{n} housing projects are advertised as ready to move in.",
    },
    sinLocalidad: {
      es: "Bogotá, sin localidad impresa",
      en: "Bogotá, no locality printed",
    },
    noDiceVis: { es: "No dice si es VIS", en: "VIS status not stated" },
    franjas: {
      hasta_150: { es: "Hasta $150 M", en: "Up to COP 150M" },
      hasta_tope_vis: {
        es: "De $150 M al tope VIS ({tope})",
        en: "COP 150M to the VIS cap ({tope})",
      },
      hasta_400: {
        es: "Del tope VIS a $400 M",
        en: "VIS cap to COP 400M",
      },
      mas_de_400: { es: "Más de $400 M", en: "Over COP 400M" },
      sin_precio: {
        es: "Sin precio en el aviso",
        en: "No price in the ad",
      },
    },
  },

  filtros: {
    grupo: {
      es: "Filtros de vivienda nueva",
      en: "New-home filters",
    },
    abrir: { es: "Filtros", en: "Filters" },
    abrirCon: { es: "Filtros · {n}", en: "Filters · {n}" },
    lugar: { es: "Zona", en: "Area" },
    lugarTodas: { es: "Todas", en: "All" },
    franja: { es: "Franja de precio", en: "Price band" },
    segmento: { es: "VIS o No VIS", en: "VIS or non-VIS" },
    etapa: { es: "Etapa de la obra", en: "Construction stage" },
    entrega: { es: "Entrega a más tardar", en: "Handover by" },
    cualquiera: { es: "Cualquiera", en: "Any" },
    entregaInmediata: { es: "Entrega inmediata", en: "Ready to move in" },
    aplicar: { es: "Aplicar", en: "Apply" },
    quitar: { es: "Quitar filtros", en: "Clear filters" },
    segmentos: {
      vis: { es: "VIS", en: "VIS (social housing)" },
      vip: { es: "VIP", en: "VIP (priority housing)" },
      no_vis: { es: "No VIS", en: "Non-VIS" },
      no_lo_dice: {
        es: "No dice si es VIS",
        en: "VIS status not stated",
      },
    },
    etapas: {
      sobre_planos: { es: "Sobre planos", en: "Off-plan" },
      en_construccion: { es: "En construcción", en: "Under construction" },
      entrega_inmediata: { es: "Entrega inmediata", en: "Ready to move in" },
      no_lo_dice: { es: "No dice la etapa", en: "Stage not stated" },
    },
  },

  lista: {
    titulo: { es: "Los proyectos", en: "The projects" },
    nota: {
      es: "«Pagas al menos» suma al «desde» lo que la norma cobra por registrar y el parqueadero que se paga aparte. Lo que el aviso calla se cuenta en cada tarjeta.",
      en: "«You pay at least» adds to the «from» price what the rules charge to register and any parking paid separately. What the ad leaves out is counted on each card.",
    },
    conteoUno: { es: "1 proyecto", en: "1 project" },
    conteoVarios: { es: "{n} proyectos", en: "{n} projects" },
    conteoTope: {
      es: "{dentro} caben · {fuera} no caben · {sinPrecio} sin precio en el aviso",
      en: "{dentro} fit · {fuera} do not fit · {sinPrecio} without a price in the ad",
    },
    fuera: {
      es: "Fuera de lo que puedes pagar",
      en: "Beyond what you can afford",
    },
    sinPrecio: {
      es: "Sin precio en el aviso, o con precios que se contradicen",
      en: "No price in the ad, or prices that contradict each other",
    },
    verMas: {
      es: "Ver más proyectos ({restan} más)",
      en: "See more projects ({restan} more)",
    },
    vacio: {
      es: "Ningún proyecto cumple esos filtros.",
      en: "No project matches those filters.",
    },
  },

  tarjeta: {
    desde: { es: "Desde", en: "From" },
    alMenos: { es: "Pagas al menos", en: "You pay at least" },
    m2Privada: { es: "de área privada", en: "of private area" },
    m2Construida: { es: "de área construida", en: "of built area" },
    sinArea: { es: "Sin área: no hay m²", en: "No area: no price per m²" },
    m2Conflicto: {
      es: "Cifras en conflicto: no hay m²",
      en: "Conflicting figures: no price per m²",
    },
    sinPrecio: {
      es: "El aviso no da precio",
      en: "The ad gives no price",
    },
    precioConflicto: {
      es: "Las páginas imprimen precios distintos",
      en: "The pages print different prices",
    },
    callaDatos: {
      es: "Calla {n} de {total} datos",
      en: "Silent on {n} of {total} facts",
    },
    nombreIlegible: {
      es: "Nombre ilegible en la revista",
      en: "Name illegible in the magazine",
    },
    constructoraNoImpresa: {
      es: "Constructora no impresa",
      en: "Builder not printed",
    },
    sinZona: { es: "Sin zona impresa", en: "No area printed" },
    fuera: {
      es: "Fuera de lo que puedes pagar",
      en: "Beyond what you can afford",
    },
  },

  ficha: {
    volver: { es: "Volver a vivienda nueva", en: "Back to new homes" },
    fueraDeTope: {
      titulo: {
        es: "Fuera de lo que puedes pagar",
        en: "Beyond what you can afford",
      },
      detalle: {
        es: "Pagas al menos {alMenos} y lo que puedes pagar es {tope}: faltan {falta} antes de sumar lo que el aviso calla.",
        en: "You pay at least {alMenos} and you can afford {tope}: {falta} short before adding what the ad leaves out.",
      },
    },
    dentroDeTope: {
      es: "Cabe en lo que puedes pagar ({tope}), antes de sumar lo que el aviso calla.",
      en: "It fits what you can afford ({tope}), before adding what the ad leaves out.",
    },
    precio: {
      titulo: { es: "El precio verdadero", en: "The true price" },
      alMenos: { es: "Pagas al menos", en: "You pay at least" },
      faltan: {
        es: "Lo que falta sumar (no se inventa)",
        en: "What is still missing (never invented)",
      },
      sinPrecio: {
        es: "El aviso no da precio: no hay cuenta que hacer.",
        en: "The ad gives no price: there is nothing to compute.",
      },
      enConflicto: {
        es: "Dos páginas de la revista imprimen precios distintos: no elegimos uno, así que no hay cuenta que hacer.",
        en: "Two pages of the magazine print different prices: we do not pick one, so there is nothing to compute.",
      },
      m2Privada: {
        es: "m² aproximado: {valor} por m² privado ({area} m²). Aproximado porque el precio «desde» y el área «desde» no siempre son de la misma unidad.",
        en: "Approximate m²: {valor} per private m² ({area} m²). Approximate because the «from» price and the «from» area are not always the same unit.",
      },
      m2Construida: {
        es: "m² aproximado: {valor} por m² construido ({area} m²). Aproximado porque el precio «desde» y el área «desde» no siempre son de la misma unidad, y el aviso no da el área privada.",
        en: "Approximate m²: {valor} per built m² ({area} m²). Approximate because the «from» price and the «from» area are not always the same unit, and the ad gives no private area.",
      },
      m2Conflicto: {
        es: "m² aproximado: no hay, porque dos páginas de la revista imprimen cifras distintas.",
        en: "Approximate m²: none, because two pages of the magazine print different figures.",
      },
      m2Sin: {
        es: "m² aproximado: no hay, porque el aviso no da área.",
        en: "Approximate m²: none, because the ad gives no area.",
      },
      tarifas: {
        es: "Tarifas: {lista}. Estimado.",
        en: "Fees: {lista}. Estimate.",
      },
      consultadas: {
        es: "{norma}, consultada el {fecha}",
        en: "{norma}, consulted on {fecha}",
      },
    },
    partida: {
      precio_desde: {
        es: "Precio «desde» del aviso",
        en: "The ad's «from» price",
      },
      derechos_registro: {
        es: "Derechos de registro (estimado, a cargo de quien registra)",
        en: "Registration fees (estimate, paid by whoever registers)",
      },
      parqueadero: {
        es: "Parqueadero que se paga aparte",
        en: "Parking paid separately",
      },
    },
    faltante: {
      derechos_registro: {
        es: "Derechos de registro: no pudimos verificar la tarifa en la norma, no se suman.",
        en: "Registration fees: we could not verify the rate in the rule, so they are not added.",
      },
      derechos_notariales: {
        es: "Derechos notariales de la compraventa: {monto}. Se reparten como diga la promesa de compraventa.",
        en: "Notary fees for the sale: {monto}. They are split as the purchase promise says.",
      },
      derechos_notariales_sin_monto: {
        es: "Derechos notariales: no los pudimos verificar en la norma para este caso, no se suman.",
        en: "Notary fees: we could not verify them in the rule for this case, so they are not added.",
      },
      impuesto_registro: {
        es: "Impuesto de registro y beneficencia: no los pudimos verificar en la norma, no se suman.",
        en: "Registration tax and charity levy: we could not verify them in the rule, so they are not added.",
      },
      iva_notarial: {
        es: "IVA y hojas de la notaría: no verificados.",
        en: "Notary VAT and paper: not verified.",
      },
      parqueadero_sin_precio: {
        es: "Parqueadero: el aviso no da su precio.",
        en: "Parking: the ad gives no price.",
      },
      parqueadero_no_lo_dice: {
        es: "Parqueadero: el aviso no dice si va incluido.",
        en: "Parking: the ad does not say whether it is included.",
      },
      subidas_en_obra: {
        es: "El aviso no dice que el precio sea fijo: puede subir mientras se construye.",
        en: "The ad does not say the price is fixed: it may rise during construction.",
      },
      hipoteca: {
        es: "Si compras con crédito, la hipoteca suma derechos de notaría y de registro.",
        en: "If you buy with a loan, the mortgage adds notary and registration fees.",
      },
      segmento_no_lo_dice: {
        es: "El aviso no dice si es VIS: el registro se calculó como VIS, el caso más barato. Si no lo es, cuesta el doble.",
        en: "The ad does not say whether it is VIS: registration was computed as VIS, the cheapest case. If it is not, it costs twice as much.",
      },
      exencion_vip_con_subsidio: {
        es: "VIP: el registro queda exento solo si recibes subsidio.",
        en: "VIP: registration is exempt only if you get a subsidy.",
      },
      supera_tope_vis: {
        es: "Se anuncia como VIS, pero su precio pasa el tope VIS de 2026 en {ciudad}: se calculó como vivienda general. Pregunta en qué año se liquida el precio.",
        en: "It is advertised as VIS, but its price is above the 2026 VIS cap in {ciudad}: computed as regular housing. Ask which year the price is set in.",
      },
    },
    espera: {
      titulo: { es: "La espera", en: "The wait" },
      intro: {
        es: "Mientras construyen sigues pagando arriendo.",
        en: "While it is built you keep paying rent.",
      },
      meses: {
        es: "{meses} meses hasta la entrega, {cuando}.",
        en: "{meses} months until handover, {cuando}.",
      },
      mesesUno: {
        es: "1 mes hasta la entrega, {cuando}.",
        en: "1 month until handover, {cuando}.",
      },
      vencida: {
        es: "La fecha impresa ya llegó: pregunta en la sala de ventas si ya entregaron.",
        en: "The printed date has already arrived: ask at the sales room whether it has been handed over.",
      },
      aproximada: {
        es: "Aproximado: la revista imprime la entrega sin el mes.",
        en: "Approximate: the magazine prints the handover without the month.",
      },
      cuandoHasta: { es: "hasta {mes}", en: "by {mes}" },
      cuandoAnio: { es: "durante {anio}", en: "during {anio}" },
      inmediata: {
        es: "Entrega inmediata: no hay espera que pagar.",
        en: "Ready to move in: no wait to pay for.",
      },
      sinFecha: {
        es: "El aviso no dice cuándo entregan: la espera no se puede calcular. Pregúntalo antes de firmar.",
        en: "The ad does not say when it is handed over: the wait cannot be computed. Ask before you sign.",
      },
      arriendo: {
        etiqueta: {
          es: "Tu arriendo mensual (COP)",
          en: "Your monthly rent (COP)",
        },
        ayuda: {
          es: "Lo escribes tú y no sale de tu teléfono: ninguna petición lo lleva.",
          en: "You type it yourself and it never leaves your phone: no request carries it.",
        },
        ejemplo: { es: "Ej: 1.800.000", en: "e.g. 1,800,000" },
        total: {
          es: "Con ese arriendo, la espera te cuesta {total}.",
          en: "With that rent, the wait costs you {total}.",
        },
        invalido: {
          es: "Escribe el arriendo en pesos, sin decimales.",
          en: "Type the rent in pesos, with no decimals.",
        },
        borrar: {
          es: "Borrar mi arriendo de este teléfono",
          en: "Delete my rent from this phone",
        },
        guardado: {
          es: "Guardado solo en este teléfono.",
          en: "Saved only on this phone.",
        },
      },
    },
    honesta: {
      titulo: { es: "La ficha honesta", en: "The honest sheet" },
      resumen: {
        es: "El aviso dice {n} de {total} datos que necesitas para decidir. Lo que no dice, no se adivina.",
        en: "The ad states {n} of the {total} facts you need to decide. What it does not state is never guessed.",
      },
      mensajes: {
        es: "Mensajes de venta (no son datos)",
        en: "Sales messages (not facts)",
      },
      otros: { es: "+{n} otro", en: "+{n} other" },
      conflicto: {
        es: "Dos páginas de la revista imprimen cifras distintas en: {campos}.",
        en: "Two pages of the magazine print different figures for: {campos}.",
      },
    },
  },

  region: {
    bogota: { es: "Bogotá", en: "Bogotá city" },
    sabana: { es: "Sabana de Bogotá", en: "Bogotá savanna" },
    otra: { es: "Otras regiones", en: "Other regions" },
    sin_ciudad: { es: "Sin ciudad impresa", en: "No city printed" },
  },
  segmento: {
    VIS: { es: "VIS", en: "VIS (social housing)" },
    VIP: { es: "VIP", en: "VIP (priority housing)" },
    "No VIS": { es: "No VIS", en: "Non-VIS" },
    mixto: { es: "VIS y No VIS", en: "VIS and non-VIS" },
    no_lo_dice: { es: "No dice si es VIS", en: "VIS status not stated" },
    ilegible: { es: "Segmento ilegible", en: "Segment illegible" },
  },
  etapa: {
    sobre_planos: { es: "Sobre planos", en: "Off-plan" },
    en_construccion: { es: "En construcción", en: "Under construction" },
    entrega_inmediata: { es: "Entrega inmediata", en: "Ready to move in" },
  },
  campo: {
    precio_desde: { es: "Precio desde", en: "Price from" },
    area_privada_desde: { es: "Área privada", en: "Private area" },
    area_construida_desde: { es: "Área construida", en: "Built area" },
    area_privada_hasta: {
      es: "Área privada máxima",
      en: "Largest private area",
    },
    area_construida_hasta: {
      es: "Área construida máxima",
      en: "Largest built area",
    },
    segmento: { es: "VIS o No VIS", en: "VIS or non-VIS" },
    etapa: { es: "Etapa de la obra", en: "Construction stage" },
    entrega: { es: "Fecha de entrega", en: "Handover date" },
    entrega_precision: {
      es: "Precisión de la entrega",
      en: "Handover precision",
    },
    parqueadero: { es: "Parqueadero", en: "Parking" },
    parqueadero_precio: { es: "Precio del parqueadero", en: "Parking price" },
    precio_fijo: { es: "Precio fijo", en: "Fixed price" },
    subsidio_anunciado: { es: "Subsidio", en: "Subsidy" },
    sector: { es: "Barrio", en: "Neighborhood" },
    ciudad: { es: "Ciudad", en: "City" },
    constructora: { es: "Constructora", en: "Builder" },
    tipo: { es: "Tipo", en: "Type" },
  },
  clase: {
    verificable: { es: "Lo dice", en: "Stated" },
    no_lo_dice: { es: "No lo dice", en: "Not stated" },
    ilegible: {
      es: "Ilegible en la revista",
      en: "Illegible in the magazine",
    },
    en_conflicto: {
      es: "Dos páginas imprimen cifras distintas",
      en: "Two pages print different figures",
    },
  },
  rotulo: {
    lanzamiento: { es: "Lanzamiento", en: "Launch" },
    ultimas_unidades: { es: "Últimas unidades", en: "Last units" },
    descuento: { es: "Descuento", en: "Discount" },
    cuota_inicial_flexible: {
      es: "Cuota inicial flexible",
      en: "Flexible down payment",
    },
    mejor_precio: { es: "«El mejor precio»", en: "«The best price»" },
    mejor_ubicacion: {
      es: "«La mejor ubicación»",
      en: "«The best location»",
    },
    renta_turistica: {
      es: "Para rentar a turistas",
      en: "For short-term rentals",
    },
    financiacion_directa: {
      es: "Financiación directa",
      en: "Developer financing",
    },
  },
} as const satisfies Arbol;
