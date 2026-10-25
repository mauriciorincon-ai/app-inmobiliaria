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
    nuevoOUsado: {
      titulo: {
        es: "¿Nuevo o usado? — Innmobiliaria",
        en: "New or resale? — Innmobiliaria",
      },
      descripcion: {
        es: "Con tu presupuesto y en la misma zona: los apartamentos nuevos por su precio verdadero frente a los usados en venta de Innmobiliaria.",
        en: "With your budget and in the same area: new apartments by their true price against Innmobiliaria's resale apartments for sale.",
      },
    },
    teAlcanza: {
      titulo: {
        es: "¿Te alcanza con subsidio? — Innmobiliaria",
        en: "Can a subsidy get you there? — Innmobiliaria",
      },
      descripcion: {
        es: "Los programas de subsidio verificados en su norma y con su fecha, frente a la vivienda nueva de Bogotá y la Sabana. Tus ingresos no salen de tu teléfono.",
        en: "Subsidy programs verified in their rule and with their date, against new homes in Bogotá and the savanna. Your income never leaves your phone.",
      },
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
      es: "Mediana del m² «desde» sobre el área privada, con el recorte de atípicos y el mínimo de 5 proyectos del «¿Está caro?». Sin 5, no hay mediana. Un proyecto cuyas páginas imprimen cifras distintas no entra. Es un m² aproximado: el precio «desde» y el área «desde» no siempre son de la misma unidad.",
      en: "Median «from» price per private m², with the same outlier trimming and 5-project minimum as «Is it overpriced?». Without 5, there is no median. A project whose pages print different figures is left out. It is an approximate m²: the «from» price and the «from» area are not always the same unit.",
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
    m2Privada: {
      es: "de área privada, aproximado",
      en: "of private area, approximate",
    },
    m2Construida: {
      es: "de área construida, aproximado",
      en: "of built area, approximate",
    },
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
        es: "Impuesto de registro (la gente lo llama «beneficencia»): se reparte entre comprador y vendedor y no se suma aquí. Míralo con tu precio en Papeleo.",
        en: "Registration tax (people call it «beneficencia»): it is split between buyer and seller and is not added here. See it with your price in Paperwork.",
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
      parqueadero_en_conflicto: {
        es: "Parqueadero: dos páginas de la revista imprimen datos distintos, no se suma.",
        en: "Parking: two pages of the magazine print different figures, so it is not added.",
      },
      clase_en_conflicto: {
        es: "Dos páginas de la revista imprimen datos distintos sobre si es VIS o sobre la ciudad: el registro se calculó con el caso más barato y puede costar más.",
        en: "Two pages of the magazine print different figures on whether it is VIS or on the city: registration was computed with the cheapest case and may cost more.",
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
      enConflicto: {
        es: "Dos páginas de la revista imprimen una entrega distinta para este proyecto: no la usamos para calcular la espera. Pregúntala en la sala de ventas antes de firmar.",
        en: "Two pages of the magazine print different handover dates for this project: we do not use either to compute the wait. Ask at the sales room before you sign.",
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

  // S13 — «¿Nuevo o usado?», «¿Te alcanza con subsidio?» y la visita a la sala de ventas. Mismas reglas que el resto del
  // módulo: cada cifra sale de un motor; aquí solo viven las frases. Lo no verificado no se muestra.
  accesos: {
    titulo: { es: "Para decidir mejor", en: "To decide better" },
    nuevoOUsado: {
      titulo: { es: "¿Nuevo o usado?", en: "New or resale?" },
      detalle: {
        es: "Con tu presupuesto y en la misma zona: lo nuevo por su precio verdadero frente a los usados de Innmobiliaria.",
        en: "With your budget and in the same area: new homes by their true price against Innmobiliaria's resale homes.",
      },
    },
    teAlcanza: {
      titulo: {
        es: "¿Te alcanza con subsidio?",
        en: "Can a subsidy get you there?",
      },
      detalle: {
        es: "Los programas que pudimos verificar, con su norma y su fecha. Tus ingresos se quedan en tu teléfono.",
        en: "The programs we could verify, with their rule and date. Your income stays on your phone.",
      },
    },
    papeleo: {
      titulo: {
        es: "Lo que te cuesta escriturar este",
        en: "What it costs to close on this one",
      },
      detalle: {
        es: "Cuánto paga cada parte al escriturar, con la norma de cada cifra y lo que no pudimos verificar. El precio se queda en tu teléfono.",
        en: "What each party pays at closing, with the rule behind every figure and what we could not verify. The price stays on your phone.",
      },
    },
  },

  nuevoOUsado: {
    volver: { es: "Volver a vivienda nueva", en: "Back to new homes" },
    titulo: { es: "¿Nuevo o usado?", en: "New or resale?" },
    bajada: {
      es: "Con lo que puedes pagar y en la misma zona: los apartamentos nuevos por su precio verdadero frente a los apartamentos usados en venta de Innmobiliaria, con la misma regla de 5 comparables.",
      en: "With what you can afford and in the same area: new apartments by their true price against Innmobiliaria's resale apartments for sale, with the same 5-comparable rule.",
    },
    zona: {
      grupo: { es: "Zona", en: "Area" },
      bogota: { es: "Bogotá", en: "Bogotá city" },
      sabana: { es: "Sabana", en: "Savanna" },
    },
    presupuesto: {
      etiqueta: { es: "Tu presupuesto: {precio}", en: "Your budget: {precio}" },
      nota: {
        es: "Tus ingresos no salen de tu teléfono: solo viaja este tope.",
        en: "Your income never leaves your phone: only this cap travels.",
      },
      ajustar: { es: "Cambiar mis números", en: "Change my numbers" },
    },
    sinPresupuesto: {
      titulo: { es: "Falta tu presupuesto", en: "Your budget is missing" },
      detalle: {
        es: "Sin un tope no hay «lo que cabe». Calcula lo que puedes pagar y vuelve aquí: tus ingresos no salen de tu teléfono, solo viaja el tope.",
        en: "Without a cap there is no «what fits». Work out what you can afford and come back: your income never leaves your phone, only the cap travels.",
      },
      calcular: {
        es: "Calcular lo que puedo pagar",
        en: "Work out what I can afford",
      },
    },
    nuevos: {
      eyebrow: {
        es: "Apartamentos nuevos que caben",
        en: "New apartments that fit",
      },
      pie: {
        es: "por su precio verdadero («pagas al menos»). {fuente}",
        en: "by their true price («you pay at least»). {fuente}",
      },
      mediana: {
        es: "m² privado aproximado, mediana: {valor}",
        en: "Approximate private m², median: {valor}",
      },
      sinMediana: {
        es: "Menos de 5 con área privada: sin mediana",
        en: "Fewer than 5 with private area: no median",
      },
    },
    usados: {
      eyebrow: {
        es: "Usados en venta en Innmobiliaria",
        en: "Resale homes for sale on Innmobiliaria",
      },
      pie: {
        es: "Anuncios vivos en Innmobiliaria al {fecha}.",
        en: "Live listings on Innmobiliaria as of {fecha}.",
      },
      mediana: { es: "m² mediano: {valor}", en: "Median m²: {valor}" },
      mitad: {
        es: "La mitad entre {p25} y {p75}",
        en: "Half between {p25} and {p75}",
      },
      sinDatos: { es: "Sin datos suficientes", en: "Not enough data" },
      sinDatosDetalle: {
        es: "Hay {n} usados en tu presupuesto y zona; hacen falta {minimo} para comparar.",
        en: "There are {n} resale homes in your budget and area; {minimo} are needed to compare.",
      },
      sabana: {
        es: "Innmobiliaria publica solo en Bogotá: en la Sabana no hay usados con los que comparar.",
        en: "Innmobiliaria lists only in Bogotá: there are no resale homes in the savanna to compare with.",
      },
      noDisponible: {
        titulo: {
          es: "No pudimos leer los usados",
          en: "We could not load the resale homes",
        },
        detalle: {
          es: "Intenta de nuevo en unos minutos. Sin ellos no se compara, y no es que no haya.",
          en: "Try again in a few minutes. Without them there is no comparison, and that does not mean there are none.",
        },
      },
    },
    veredicto: {
      mas: {
        es: "Estrenar cuesta {pct} % más por m²",
        en: "A new home costs {pct}% more per m²",
      },
      menos: {
        es: "Estrenar cuesta {pct} % menos por m²",
        en: "A new home costs {pct}% less per m²",
      },
      igual: {
        es: "Estrenar cuesta lo mismo por m²",
        en: "A new home costs the same per m²",
      },
      detalle: {
        es: "Medianas de lo que cabe en {presupuesto}. Lo nuevo se entrega después y calla datos; lo usado se ve hoy.",
        en: "Medians of what fits in {presupuesto}. New homes are handed over later and leave facts out; resale homes can be seen today.",
      },
      sin: {
        titulo: {
          es: "No hay comparación honesta",
          en: "No honest comparison",
        },
        detalle: {
          es: "Con menos de 5 usados comparables no se compara: se dice.",
          en: "With fewer than 5 comparable resale homes there is no comparison: we say so.",
        },
        detalleNuevos: {
          es: "Con menos de 5 apartamentos nuevos con área privada que quepan no hay mediana del m² nuevo: no se compara, se dice.",
          en: "With fewer than 5 new apartments that fit and have a private area there is no new-home median: no comparison, and we say so.",
        },
      },
    },
    caben: {
      titulo: {
        es: "Los apartamentos nuevos que caben",
        en: "The new apartments that fit",
      },
      nota: {
        es: "«Pagas al menos» no incluye lo que el aviso calla: la cuota inicial durante la obra, por ejemplo, no la imprime la revista y no se inventa. Cada ficha cuenta lo que falta.",
        en: "«You pay at least» leaves out what the ad is silent on: the down payment during construction, for example, is not printed in the magazine and is never invented. Each sheet says what is missing.",
      },
      vacio: {
        es: "Ningún apartamento nuevo de esta zona cabe en tu presupuesto.",
        en: "No new apartment in this area fits your budget.",
      },
      espera: {
        inmediata: { es: "Entrega inmediata", en: "Ready to move in" },
        meses: {
          es: "Espera: {meses} meses hasta la entrega",
          en: "Wait: {meses} months until handover",
        },
        mesesUno: {
          es: "Espera: 1 mes hasta la entrega",
          en: "Wait: 1 month until handover",
        },
        vencida: {
          es: "La fecha impresa ya llegó: pregunta si ya entregaron",
          en: "The printed date has arrived: ask whether it has been handed over",
        },
        sinFecha: {
          es: "El aviso no dice cuándo entregan",
          en: "The ad does not say when it is handed over",
        },
        enConflicto: {
          es: "Dos páginas imprimen una entrega distinta",
          en: "Two pages print different handover dates",
        },
      },
    },
  },

  teAlcanza: {
    titulo: {
      es: "¿Te alcanza con subsidio?",
      en: "Can a subsidy get you there?",
    },
    bajada: {
      es: "Solo programas verificados en su norma, con su fecha. Un programa sin cupos se dice; uno que no pudimos verificar no se muestra.",
      en: "Only programs verified in their rule, with their date. A program with no places is shown as such; one we could not verify is not shown.",
    },
    hogares: {
      grupo: { es: "Hogar de ejemplo", en: "Sample household" },
      etiqueta: { es: "Hogar de {ingresos}", en: "{ingresos} household" },
      pasaTope: { es: "pasa el tope", en: "over the cap" },
    },
    resumen: {
      es: "Hogar de ejemplo con {ingresos} al mes: puede pagar hasta {tope} ({inicial} % de cuota inicial, {plazo} años, tasa de referencia {tasa} E. A. con corte al {fecha}).",
      en: "Sample household earning {ingresos} a month: can afford up to {tope} ({inicial}% down, {plazo} years, reference rate {tasa} effective annual as of {fecha}).",
    },
    resumenTuyo: {
      es: "Con {ingresos} al mes puedes pagar hasta {tope} ({inicial} % de cuota inicial, {plazo} años, tasa de referencia {tasa} E. A. con corte al {fecha}).",
      en: "Earning {ingresos} a month you can afford up to {tope} ({inicial}% down, {plazo} years, reference rate {tasa} effective annual as of {fecha}).",
    },
    resumenPropia: {
      es: "Con {ingresos} al mes puedes pagar hasta {tope} ({inicial} % de cuota inicial, {plazo} años, tasa {tasa} E. A., la que escribiste).",
      en: "Earning {ingresos} a month you can afford up to {tope} ({inicial}% down, {plazo} years, {tasa} effective annual, the one you typed).",
    },
    sinTope: {
      es: "Con esos números el simulador no calcula un tope: no se inventa.",
      en: "With those numbers the calculator gives no cap: it is not made up.",
    },
    sinSubsidio: {
      eyebrow: {
        es: "Sin subsidio te alcanzan",
        en: "Without a subsidy you can afford",
      },
      pie: {
        es: "de {total} proyectos de Bogotá y la Sabana con precio",
        en: "of {total} projects in Bogotá and the savanna with a price",
      },
    },
    conSubsidio: {
      eyebrow: {
        es: "Con el mejor caso de subsidio",
        en: "With the best-case subsidy",
      },
      pie: {
        es: "por confirmar: el proyecto debe estar inscrito y no se suman programas entre sí",
        en: "to be confirmed: the project must be enrolled and programs are not added together",
      },
    },
    programas: {
      titulo: {
        es: "Los programas, para {nombre}",
        en: "The programs, for {nombre}",
      },
      contexto: {
        es: "{zona} · {segmento} · desde {precio}",
        en: "{zona} · {segmento} · from {precio}",
      },
      sinEjemplo: {
        es: "No hay un proyecto con precio con el cual explicar los programas.",
        en: "There is no priced project to explain the programs with.",
      },
      cabeceras: {
        programa: { es: "Programa y norma", en: "Program and rule" },
        monto: { es: "Monto 2026", en: "2026 amount" },
        paraTi: { es: "Para ti", en: "For you" },
      },
      monto: {
        rango: { es: "{minimo} a {maximo}", en: "{minimo} to {maximo}" },
        hasta: { es: "hasta {maximo}", en: "up to {maximo}" },
      },
      estadoAl: { es: "estado al {fecha}", en: "status as of {fecha}" },
      baja: {
        compra: {
          es: "Baja el precio al firmar",
          en: "Lowers the price at signing",
        },
        cuota: {
          es: "Alivia la cuota después, no el precio",
          en: "Eases the payment later, not the price",
        },
      },
    },
    estado: {
      aplica: { es: "Aplica", en: "Applies" },
      por_confirmar: { es: "Por confirmar", en: "To be confirmed" },
      no_aplica: { es: "No aplica", en: "Does not apply" },
      sin_cupos: { es: "Sin cupos", en: "No places" },
    },
    motivo: {
      ingreso: {
        es: "Tus ingresos pasan el tope del programa",
        en: "Your income is above the program cap",
      },
      fuera_de_bogota: {
        es: "Solo para proyectos en Bogotá",
        en: "Only for projects in Bogotá",
      },
      no_vis: { es: "El proyecto no es VIS", en: "The project is not VIS" },
      segmento_no_lo_dice: {
        es: "El aviso no dice si es VIS",
        en: "The ad does not say whether it is VIS",
      },
      supera_tope_vis: {
        es: "El precio pasa el tope VIS de 2026",
        en: "The price is above the 2026 VIS cap",
      },
      proyecto_inscrito: {
        es: "El proyecto debe estar inscrito en el programa: pregúntalo en la sala",
        en: "The project must be enrolled in the program: ask at the sales room",
      },
      sin_cupos: {
        es: "Sin cupos a la fecha de la fuente",
        en: "No places as of the source date",
      },
      suspendido: { es: "Suspendido", en: "Suspended" },
    },
    noMostrados: {
      titulo: { es: "Lo que no mostramos", en: "What we do not show" },
      detalle: {
        es: "{lista}: no los pudimos verificar en la fuente primaria. Tus ingresos se quedan en tu teléfono.",
        en: "{lista}: we could not verify them in the primary source. Your income stays on your phone.",
      },
    },
    tuHogar: {
      titulo: { es: "Tu hogar", en: "Your household" },
      cargando: { es: "Leyendo tus números…", en: "Reading your numbers…" },
      sinDatos: {
        es: "Calcula lo que puedes pagar y aquí verás tus números, hechos en tu teléfono con los mismos programas.",
        en: "Work out what you can afford and your numbers will show here, computed on your phone with the same programs.",
      },
      calcular: {
        es: "Calcular lo que puedo pagar",
        en: "Work out what I can afford",
      },
      cambiar: { es: "Cambiar mis números", en: "Change my numbers" },
      privado: {
        es: "Calculado en tu teléfono con lo que guardaste en «lo que puedes pagar»: ninguna petición lleva tus ingresos.",
        en: "Computed on your phone from what you saved in «what you can afford»: no request carries your income.",
      },
    },
  },

  visita: {
    meta: {
      es: "Visita a la sala de ventas de {nombre} — Innmobiliaria",
      en: "Visit the sales room of {nombre} — Innmobiliaria",
    },
    volver: { es: "Volver a la ficha", en: "Back to the project" },
    titulo: { es: "Visitar la sala de ventas", en: "Visit the sales room" },
    sinWhatsapp: {
      titulo: { es: "Primero, tu WhatsApp", en: "First, your WhatsApp" },
      detalle: {
        es: "Pedir una visita exige tu WhatsApp verificado, como en los usados. Es una sola vez y toma unos 30 segundos.",
        en: "Requesting a visit needs your verified WhatsApp, as with resale homes. It is one time and takes about 30 seconds.",
      },
      boton: { es: "Verificar mi WhatsApp", en: "Verify my WhatsApp" },
    },
    sinEdicion: {
      titulo: { es: "Mes sin edición", en: "Month without an edition" },
      detalle: {
        es: "La edición {n} de la revista venció hace {dias} días y la de este mes todavía no llega. No pedimos visitas con datos vencidos: puede que la sala ya haya cambiado precios o disponibilidad.",
        en: "Edition {n} of the magazine expired {dias} days ago and this month's has not arrived. We do not take visit requests on expired data: the sales room may have changed prices or availability.",
      },
      detalleUno: {
        es: "La edición {n} de la revista venció hace 1 día y la de este mes todavía no llega. No pedimos visitas con datos vencidos: puede que la sala ya haya cambiado precios o disponibilidad.",
        en: "Edition {n} of the magazine expired 1 day ago and this month's has not arrived. We do not take visit requests on expired data: the sales room may have changed prices or availability.",
      },
      ficha: { es: "Ver la ficha", en: "See the project sheet" },
    },
    pedir: {
      coordinamos: {
        es: "Mientras la constructora no esté en Innmobiliaria, coordinamos nosotros: le escribimos a la sala de ventas y te confirmamos por WhatsApp. Ninguno de tus datos va a la constructora sin que lo aceptes.",
        en: "Until the builder is on Innmobiliaria, we coordinate: we contact the sales room and confirm with you over WhatsApp. None of your details go to the builder unless you accept.",
      },
      franja: { es: "¿Cuándo te sirve?", en: "When suits you?" },
      franjas: {
        entre_semana: { es: "Entre semana", en: "Weekdays" },
        sabado: { es: "Sábado", en: "Saturday" },
        domingo: { es: "Domingo", en: "Sunday" },
      },
      correo: { es: "Tu correo", en: "Your email" },
      correoAyuda: {
        es: "Solo para los avisos de esta visita: los horarios que te propongamos y el recordatorio.",
        en: "Only for this visit's notices: the times we offer and the reminder.",
      },
      consentimiento: {
        es: "Acepto que Innmobiliaria use mi WhatsApp y mi correo para coordinar esta visita, según la",
        en: "I agree that Innmobiliaria uses my WhatsApp and email to coordinate this visit, under the",
      },
      politica: { es: "política de privacidad", en: "privacy policy" },
      enviar: { es: "Pedir la visita", en: "Request the visit" },
      enviando: { es: "Enviando…", en: "Sending…" },
      cargando: { es: "Un momento…", en: "One moment…" },
    },
    errores: {
      correo: {
        es: "Escribe un correo válido.",
        en: "Enter a valid email address.",
      },
      consentimiento: {
        es: "Para pedir la visita necesitamos tu aceptación.",
        en: "We need your agreement to request the visit.",
      },
      franja: { es: "Elige una franja.", en: "Pick a time slot." },
      ya_solicitada: {
        es: "Ya pediste la visita a este proyecto. Ábrela desde el correo que te enviamos.",
        en: "You already asked to visit this project. Open it from the email we sent you.",
      },
      demasiadas_solicitudes: {
        es: "Ya tienes 5 solicitudes de visita en curso. Espera a que se resuelva alguna o cancela una.",
        en: "You already have 5 visit requests in progress. Wait for one to resolve or cancel one.",
      },
      rechazada_reciente: {
        es: "No pudimos concretar la visita a este proyecto hace poco. Puedes volver a pedirla pasados 14 días.",
        en: "We could not arrange a visit to this project recently. You can ask again after 14 days.",
      },
      no_disponible: {
        es: "Este proyecto ya no está en la edición vigente.",
        en: "This project is no longer in the current edition.",
      },
      email_invalido: {
        es: "Escribe un correo válido.",
        en: "Enter a valid email address.",
      },
      franja_invalida: { es: "Elige una franja.", en: "Pick a time slot." },
      servidor: {
        es: "No pudimos enviar tu solicitud. Intenta de nuevo en un momento.",
        en: "We could not send your request. Try again in a moment.",
      },
    },
    solicitada: {
      titulo: { es: "Recibimos tu solicitud", en: "We got your request" },
      detalle: {
        es: "Le escribimos a la sala de ventas y te confirmamos el día por WhatsApp. Si en dos días hábiles no responden, te lo decimos por correo.",
        en: "We will contact the sales room and confirm the day with you over WhatsApp. If they do not answer within two business days, we will tell you by email.",
      },
      ver: { es: "Ver mi solicitud", en: "See my request" },
    },
    ficha: {
      titulo: { es: "Visitar la sala de ventas", en: "Visit the sales room" },
      detalle: {
        es: "Pide la visita y la coordinamos nosotros con la sala. Lleva esta ficha: pregunta lo que el aviso no dice.",
        en: "Request the visit and we coordinate it with the sales room. Bring this sheet: ask what the ad does not say.",
      },
      boton: { es: "Pedir una visita", en: "Request a visit" },
      sinEdicion: {
        es: "No pedimos visitas con una edición vencida: la sala puede haber cambiado precios o disponibilidad.",
        en: "We do not take visit requests on an expired edition: the sales room may have changed prices or availability.",
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
