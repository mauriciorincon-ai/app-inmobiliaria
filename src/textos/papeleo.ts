// Textos del asistente del papeleo (S14, maqueta 11). Cada paso de la guía (`src/engine/papeleo/guia.ts`) y cada línea de gastos
// (`src/engine/papeleo/gastos.ts`) tiene aquí su texto bajo el mismo id, con su norma citada en palabras. Dice solo lo que la norma
// dice: ninguna frase absoluta («siempre», «nunca») sin su artículo; lo que no se pudo verificar se nombra, jamás se afirma.
import type { Arbol } from "@/i18n/textos";

export const PAPELEO = {
  // El estado de cada paso o línea, con símbolo y texto en la pantalla (el color nunca va solo).
  estados: {
    vigente: { es: "Norma leída", en: "Rule read" },
    practica: { es: "Práctica, no norma", en: "Practice, not a rule" },
    no_verificado: { es: "No verificado", en: "Not verified" },
  },

  // Las dos opciones del selector de ciudad que no son una ciudad (las demás llevan su nombre propio, sacado de las listas del tope VIS).
  ciudades: {
    "otro-cundinamarca": {
      es: "Otro municipio de Cundinamarca",
      en: "Another Cundinamarca municipality",
    },
    otra: { es: "Otra ciudad", en: "Another city" },
  },

  // Cada línea de gastos: su nombre.
  lineas: {
    derechos_notariales: { es: "Derechos notariales", en: "Notary fees" },
    recaudos_notariales: {
      es: "Recaudos de la notaría (Fondo del Notariado y SNR)",
      en: "Notary collections (Notary Fund and SNR)",
    },
    iva_notarial: {
      es: "IVA de los derechos notariales",
      en: "VAT on the notary fees",
    },
    impuesto_registro: {
      es: "Impuesto de registro (la gente lo llama «beneficencia»)",
      en: "Registration tax (people call it «beneficencia»)",
    },
    derechos_registro: {
      es: "Derechos de registro (Oficina de Registro)",
      en: "Land-registry fees (registry office)",
    },
    certificado_tradicion: {
      es: "Certificado de tradición y libertad (CTL)",
      en: "Title record certificate (CTL)",
    },
    retencion_enajenacion: {
      es: "Retención en la fuente por la venta",
      en: "Withholding tax on the sale",
    },
    hipoteca: {
      es: "Hipoteca (derechos notariales y de registro)",
      en: "Mortgage (notary and registration fees)",
    },
  },

  // Los avisos que acompañan un cálculo: lo que cambió la cuenta o lo que no se calcula.
  avisos: {
    supera_tope_vis: {
      es: "El precio supera el tope de vivienda de interés social de este lugar ({tope}): se liquida como vivienda normal.",
      en: "The price is above the social-interest housing cap here ({tope}): it is computed as a regular home.",
    },
    supera_tope_vip: {
      es: "El precio supera el tope de la vivienda de interés prioritario ({tope}; Ley 1955 de 2019, art. 85): ya no es VIP y se liquida como VIS si no pasa el tope de la VIS.",
      en: "The price is above the priority-interest housing cap ({tope}; Law 1955 of 2019, art. 85): it is no longer VIP and is computed as VIS if it stays under the VIS cap.",
    },
    vis_sin_subsidio: {
      es: "Sin subsidio de vivienda del Estado o de una caja de compensación, el registro no tiene la mitad de VIS (Res. SNR 2026-001726-6, art. 17, parágrafo 2): se cobra completo. La notaría sí cobra la mitad (Res. SNR 2026-000964-6, art. 31).",
      en: "Without a housing subsidy from the State or a family compensation fund, registration does not get the VIS half rate (SNR Res. 2026-001726-6, art. 17, paragraph 2): it is charged in full. The notary's office does charge half (SNR Res. 2026-000964-6, art. 31).",
    },
    vip_sin_subsidio: {
      es: "Sin subsidio no hay la exención de la VIP. La notaría cobra la mitad a la vivienda de interés social sin pedir subsidio (Res. SNR 2026-000964-6, art. 31) y la Ley 1955 de 2019, art. 85, fija el tope de la VIP dentro del artículo que define esa vivienda: liquidamos la VIP sin subsidio como VIS, y conviene confirmarlo en la notaría. El registro se cobra completo (Res. SNR 2026-001726-6, art. 17, parágrafo 2).",
      en: "Without a subsidy there is no VIP exemption. The notary's office charges half for social-interest housing without requiring a subsidy (SNR Res. 2026-000964-6, art. 31), and Law 1955 of 2019, art. 85, sets the VIP cap inside the article that defines that housing: we compute an unsubsidized VIP as VIS, and it is worth confirming at the notary's office. Registration is charged in full (SNR Res. 2026-001726-6, art. 17, paragraph 2).",
    },
    avaluo_mayor: {
      es: "El avalúo catastral ({avaluo}) es mayor que el precio: notaría, recaudos, registro e impuesto se liquidan sobre el avalúo. La retención la calculamos sobre el precio: la norma habla del «valor de la enajenación» y no dice si el avalúo la sube, pregúntalo en la notaría.",
      en: "The cadastral appraisal ({avaluo}) is higher than the price: notary fees, collections, registration and tax are computed on the appraisal. We compute the withholding on the price: the rule speaks of the «value of the sale» and does not say whether the appraisal raises it, so ask at the notary's office.",
    },
    vis_tarifa_unica: {
      es: "Hay una tarifa notarial única y especial para la VIS que cumple los decretos 2158 de 1995 y 371 de 1996 (Res. SNR 2026-000964-6, art. 31, parágrafo 3). No la calculamos: la notaría te dice si aplica y, si aplica, la notaría te cuesta menos y el total de abajo queda por encima.",
      en: "There is a single special notary fee for VIS that meets Decrees 2158 of 1995 and 371 of 1996 (SNR Res. 2026-000964-6, art. 31, paragraph 3). We do not compute it: the notary's office tells you whether it applies and, if it does, the notary costs you less and the total below ends up higher.",
    },
    vip_notarial_no_verificado: {
      es: "La exención de los derechos notariales de una VIP con subsidio la dice el Decreto 1895 de 2016, que cita la resolución de registro; la resolución notarial no se releyó para ese caso. No se calculan.",
      en: "The notary-fee exemption for a subsidized VIP home comes from Decree 1895 of 2016, which the registration resolution quotes; the notary resolution was not re-read for that case. They are not computed.",
    },
    impuesto_otro_departamento: {
      es: "El impuesto de registro depende del departamento donde está el inmueble (Ordenanza 039 de 2020 de Cundinamarca, art. 221). Solo leímos el de Bogotá y Cundinamarca: pregunta en la notaría. No se suma.",
      en: "The registration tax depends on the department where the property is (Cundinamarca Ordinance 039 of 2020, art. 221). We only read Bogotá's and Cundinamarca's: ask at the notary's office. It is not added.",
    },
    vende_empresa: {
      es: "Si vende una empresa o una constructora, su retención en la fuente es otra y no la calculamos.",
      en: "If a company or a developer sells, its withholding tax is different and we do not compute it.",
    },
    hojas_adicionales: {
      es: "Cada hoja adicional de la escritura tiene un cobro aparte (Res. SNR 2026-000964-6, art. 2, parágrafo): no sabemos cuántas tendrá.",
      en: "Each extra sheet of the deed has a separate charge (SNR Res. 2026-000964-6, art. 2, paragraph): we do not know how many it will have.",
    },
  },

  // Qué pedir antes de firmar la promesa. `norma` dice de dónde sale; si es práctica, lo dice.
  documentos: {
    ctl: {
      titulo: {
        es: "Un certificado de tradición y libertad (CTL) reciente",
        en: "A recent title record certificate (CTL)",
      },
      detalle: {
        es: "Dice quién es el dueño y si hay hipotecas, embargos o demandas inscritas. Se expide en tiempo real: vale a la fecha y hora en que se pidió. El portal de la Superintendencia de Notariado y Registro lo da por vigente 30 días calendario; la notaría puede pedir uno más reciente.",
        en: "It shows who the owner is and whether there are registered mortgages, liens or lawsuits. It is issued in real time: it is valid as of the date and time it was requested. The Superintendencia de Notariado y Registro's portal treats it as valid for 30 calendar days; the notary's office may ask for a newer one.",
      },
      norma: {
        es: "Ley 1579 de 2012, art. 72 (su vigencia es la de la fecha y hora de la solicitud). Los 30 días son un criterio del portal de la SNR, no de esta ley.",
        en: "Law 1579 of 2012, art. 72 (its validity is that of the date and time of the request). The 30 days are a criterion of the SNR portal, not of this law.",
      },
    },
    escritura_anterior: {
      titulo: {
        es: "La copia de la escritura anterior y un estudio de títulos",
        en: "A copy of the previous deed and a title review",
      },
      detalle: {
        es: "Sirve para comparar los linderos, el área y la cadena de dueños con lo que dice el CTL.",
        en: "It lets you compare the boundaries, the area and the chain of owners with what the CTL says.",
      },
      norma: {
        es: "Práctica del estudio de títulos: ninguna de las normas que consultamos la exige tal cual.",
        en: "Title-review practice: none of the rules we consulted requires it as such.",
      },
    },
    comprobantes_fiscales: {
      titulo: {
        es: "El paz y salvo del predial y los demás comprobantes fiscales",
        en: "The property-tax clearance and the other tax vouchers",
      },
      detalle: {
        es: "El del predial es el habitual; otros (valorización, o la administración si es propiedad horizontal) dependen del inmueble. Se presentan al pedir la escritura.",
        en: "The property-tax one is the usual one; others (valorization, or the building administration if it is a condominium) depend on the property. They are presented when the deed is requested.",
      },
      norma: {
        es: "Decreto-Ley 960 de 1970, art. 43: los comprobantes fiscales se presentan al solicitar el servicio notarial y se prohíbe al notario extender el instrumento sin los certificados que la ley exija.",
        en: "Decree-Law 960 of 1970, art. 43: tax vouchers are presented when the notary service is requested, and the notary is forbidden to draw up the instrument without the certificates the law requires.",
      },
    },
    cedulas_y_conyuge: {
      titulo: {
        es: "La cédula del vendedor y, si la vivienda es familiar, la de su cónyuge",
        en: "The seller's ID and, if it is a family home, their spouse's",
      },
      detalle: {
        es: "Un inmueble afectado a vivienda familiar solo se puede vender con el consentimiento libre de ambos cónyuges, que se expresa con su firma. Pregunta si está afectado.",
        en: "A property affected as a family home can only be sold with the free consent of both spouses, expressed by their signature. Ask whether it is affected.",
      },
      norma: {
        es: "Ley 258 de 1996, arts. 2 y 3 (el art. 1 lo modificó la Ley 854 de 2003).",
        en: "Law 258 of 1996, arts. 2 and 3 (art. 1 was amended by Law 854 of 2003).",
      },
    },
    promesa_escrita: {
      titulo: {
        es: "La promesa de compraventa, por escrito",
        en: "The promise of sale, in writing",
      },
      detalle: {
        es: "Una promesa solo obliga si consta por escrito, fija el plazo o la condición en que se firmará la escritura y determina el contrato de modo que solo falten la tradición o las formalidades legales. Lo que dice cada cláusula está en «Qué dice cada documento».",
        en: "A promise only binds if it is in writing, sets the term or condition for signing the deed and defines the contract so that only the transfer or the legal formalities are missing. What each clause says is in «What each document says».",
      },
      norma: {
        es: "Ley 153 de 1887, art. 89.",
        en: "Law 153 of 1887, art. 89.",
      },
    },
    credito: {
      titulo: {
        es: "Si compras con crédito: la aprobación del banco y su avalúo",
        en: "If you buy with a loan: the bank's approval and its appraisal",
      },
      detalle: {
        es: "El banco pide su propio avalúo y estudio de títulos y te da la liquidación de sus costos; aquí no los calculamos.",
        en: "The bank asks for its own appraisal and title review and gives you the breakdown of its costs; we do not compute them here.",
      },
      norma: {
        es: "Lo pide el banco; no es una norma.",
        en: "The bank asks for it; it is not a rule.",
      },
    },
  },

  // La línea de tiempo: cuánto tarda cada paso y de qué norma sale el plazo.
  plazos: {
    antes: {
      titulo: { es: "Antes de firmar", en: "Before signing" },
      texto: {
        es: "Pide el CTL y los documentos de la lista y haz el estudio de títulos.",
        en: "Ask for the CTL and the documents on the list and do the title review.",
      },
      norma: {
        es: "Práctica del estudio de títulos.",
        en: "Title-review practice.",
      },
    },
    promesa: {
      titulo: { es: "Promesa de compraventa", en: "Promise of sale" },
      texto: {
        es: "Fija el plazo o la condición en que se firmará la escritura. Qué pasa si alguien se retira depende de las arras y de la cláusula penal: míralo en «Qué dice cada documento».",
        en: "It sets the term or condition for signing the deed. What happens if someone backs out depends on the deposit (arras) and the penalty clause: see «What each document says».",
      },
      norma: {
        es: "Ley 153 de 1887, art. 89.",
        en: "Law 153 of 1887, art. 89.",
      },
    },
    escritura: {
      titulo: {
        es: "Escritura en la notaría",
        en: "Deed at the notary's office",
      },
      texto: {
        es: "Se pagan los derechos notariales, por mitades según el decreto, salvo que las partes pacten otra cosa. Si vende una persona natural, antes se paga la retención en la fuente ante el notario.",
        en: "Notary fees are paid, in halves as the decree says, unless the parties agree otherwise. If a natural person sells, the withholding tax is paid first at the notary's office.",
      },
      norma: {
        es: "Decreto-Ley 960 de 1970, art. 223; Código Civil, art. 1862; Estatuto Tributario, art. 398.",
        en: "Decree-Law 960 of 1970, art. 223; Civil Code, art. 1862; Tax Code (Estatuto Tributario), art. 398.",
      },
    },
    pedir_registro: {
      titulo: {
        es: "Pedir el registro: dentro de 2 meses",
        en: "Ask for registration: within 2 months",
      },
      texto: {
        es: "En Bogotá y Cundinamarca la solicitud de registro se presenta dentro de los dos meses siguientes a la escritura; si se pide después, el impuesto de registro causa intereses de mora.",
        en: "In Bogotá and Cundinamarca the registration request is filed within two months after the deed; if it is filed later, the registration tax accrues default interest.",
      },
      norma: {
        es: "Ordenanza 039 de 2020 de Cundinamarca, arts. 218 y 220.",
        en: "Cundinamarca Ordinance 039 of 2020, arts. 218 and 220.",
      },
    },
    oficina_registra: {
      titulo: {
        es: "La oficina registra: 5 días hábiles",
        en: "The office registers: 5 business days",
      },
      texto: {
        es: "Desde que se radica la solicitud, la oficina tiene cinco días hábiles para registrar, o diez si el acto vincula más de diez unidades inmobiliarias.",
        en: "From the day the request is filed, the office has five business days to register, or ten if the act involves more than ten property units.",
      },
      norma: {
        es: "Ley 1579 de 2012, art. 27.",
        en: "Law 1579 of 2012, art. 27.",
      },
    },
    hipoteca: {
      titulo: {
        es: "Hipoteca: dentro de 90 días hábiles",
        en: "Mortgage: within 90 business days",
      },
      texto: {
        es: "La hipoteca solo se puede inscribir dentro de los 90 días hábiles siguientes a su otorgamiento. Sus derechos notariales los paga el deudor, que es quien compra con el crédito.",
        en: "A mortgage can only be registered within 90 business days after it is granted. Its notary fees are paid by the debtor, who is the one buying with the loan.",
      },
      norma: {
        es: "Ley 1579 de 2012, art. 28; Ordenanza 039 de 2020, art. 219; Decreto-Ley 960 de 1970, art. 225.",
        en: "Law 1579 of 2012, art. 28; Ordinance 039 of 2020, art. 219; Decree-Law 960 of 1970, art. 225.",
      },
    },
    entrega: {
      titulo: { es: "Entrega", en: "Handover" },
      texto: {
        es: "Se hace con un acta de entrega y el traslado de los servicios públicos. No consultamos un plazo legal: lo fija la promesa.",
        en: "It is done with a handover record and the transfer of utilities. We did not consult a legal deadline: the promise sets it.",
      },
      norma: {
        es: "Práctica: lo que diga la promesa.",
        en: "Practice: whatever the promise says.",
      },
    },
  },

  // La ruta: título de la pestaña y descripción (la ruta no se indexa hasta el hito de producción).
  meta: {
    titulo: {
      es: "El papeleo, sin sorpresas — Innmobiliaria",
      en: "The paperwork, with no surprises — Innmobiliaria",
    },
    descripcion: {
      es: "Cuánto paga el comprador y cuánto el vendedor al escriturar, qué pedir antes de firmar la promesa, cuánto tarda cada paso y qué dice cada documento, con la norma de cada cifra. El precio que escribes se queda en tu teléfono.",
      en: "How much the buyer and the seller each pay at closing, what to ask for before signing the promise, how long each step takes and what each document says, with the rule behind every figure. The price you type stays on your phone.",
    },
  },

  pagina: {
    titulo: {
      es: "El papeleo, sin sorpresas",
      en: "The paperwork, with no surprises",
    },
    bajada: {
      es: "Cada cifra del cierre con su norma, antes de firmar nada. El precio que escribes se queda en tu teléfono: ninguna petición lo lleva.",
      en: "Every figure of the closing with the rule behind it, before you sign anything. The price you type stays on your phone: no request carries it.",
    },
  },

  secciones: {
    grupo: { es: "Sección", en: "Section" },
    gastos: { es: "Gastos", en: "Costs" },
    documentos: { es: "Documentos", en: "Documents" },
    plazos: { es: "Plazos", en: "Timeline" },
    clausulas: {
      es: "Qué dice cada documento",
      en: "What each document says",
    },
  },

  campos: {
    grupo: { es: "Tu compra", en: "Your purchase" },
    invalido: {
      es: "No pudimos leer este número.",
      en: "We couldn't read this number.",
    },
    precio: {
      etiqueta: {
        es: "Precio de la compraventa (COP)",
        en: "Sale price (COP)",
      },
      ejemplo: { es: "Ej: 450.000.000", en: "e.g. 450,000,000" },
      ayudaAnuncio: {
        es: "Viene del anuncio que estabas mirando.",
        en: "Taken from the listing you were looking at.",
      },
    },
    ciudad: {
      etiqueta: { es: "Ciudad del inmueble", en: "City of the property" },
      ayuda: {
        es: "De ella dependen el tope de la vivienda de interés social y si el impuesto de registro está verificado.",
        en: "It sets the social-interest housing cap and whether the registration tax is verified.",
      },
    },
    tipo: {
      etiqueta: { es: "Tipo de vivienda", en: "Type of home" },
      normal: { es: "Vivienda normal", en: "Regular home" },
      vis: {
        es: "VIS (interés social)",
        en: "VIS (social-interest housing)",
      },
      vip: {
        es: "VIP (interés prioritario)",
        en: "VIP (priority-interest housing)",
      },
    },
    subsidio: {
      etiqueta: {
        es: "Tengo un subsidio de vivienda del Estado o de una caja de compensación",
        en: "I have a housing subsidy from the State or a family compensation fund",
      },
      ayuda: {
        es: "Sin subsidio, el registro no tiene la tarifa de VIS ni la exención de VIP.",
        en: "Without a subsidy, registration does not get the VIS rate or the VIP exemption.",
      },
    },
    ajustes: {
      titulo: { es: "Ajustes", en: "Settings" },
      ayuda: {
        es: "Quién vende, cómo se reparten los gastos, el avalúo catastral y si compras con crédito.",
        en: "Who sells, how the costs are split, the cadastral appraisal and whether you buy with a loan.",
      },
    },
    vende: {
      etiqueta: { es: "Quién vende", en: "Who sells" },
      persona: { es: "Una persona natural", en: "A natural person" },
      empresa: {
        es: "Una empresa o constructora",
        en: "A company or a developer",
      },
    },
    reparto: {
      etiqueta: {
        es: "Quién paga la notaría y el impuesto de registro",
        en: "Who pays the notary fees and the registration tax",
      },
      iguales: {
        es: "Por mitades (lo que dice la norma)",
        en: "In halves (what the rule says)",
      },
      comprador: { es: "Todo el comprador", en: "All the buyer" },
      vendedor: { es: "Todo el vendedor", en: "All the seller" },
      ayuda: {
        es: "Otro reparto es un acuerdo de las partes: conviene que conste en la promesa. Los derechos de registro y el CTL los paga quien los pide, el comprador.",
        en: "Any other split is an agreement between the parties, and it is best to have it in the promise. The registration fees and the CTL are paid by whoever requests them, the buyer.",
      },
    },
    avaluo: {
      etiqueta: {
        es: "Avalúo catastral (COP, opcional)",
        en: "Cadastral appraisal (COP, optional)",
      },
      ayuda: {
        es: "Notaría, registro e impuesto se liquidan sobre el mayor entre el precio y el avalúo catastral.",
        en: "Notary fees, registration and tax are computed on the higher of the price and the cadastral appraisal.",
      },
    },
    credito: {
      etiqueta: {
        es: "Compro con crédito hipotecario",
        en: "I am buying with a mortgage loan",
      },
      ayuda: {
        es: "Agrega los documentos del banco, el plazo de la hipoteca y su línea de gastos.",
        en: "It adds the bank's documents, the mortgage deadline and its cost line.",
      },
    },
  },

  salidas: {
    estimado: {
      es: "Tarifas {anio}, de una tabla versionada por año con su norma, consultadas el {fecha}. Es un estimado hasta validarlo con el liquidador de la Superintendencia de Notariado y Registro.",
      en: "{anio} rates, from a table versioned by year with its rule, checked on {fecha}. It is an estimate until checked against the calculator of the Superintendencia de Notariado y Registro (the national notary and land-registry authority).",
    },
    sinPrecio: {
      es: "Escribe el precio de la compraventa y te mostramos cuánto paga cada parte, con su norma.",
      en: "Type the sale price and we show you what each party pays, with its rule.",
    },
    vencidas: {
      es: "Las tarifas que tenemos son de {anioTarifas} y estamos en {anioHoy}: no mostramos cifras de un año que ya pasó. Pregunta en la notaría o usa el liquidador de la Superintendencia de Notariado y Registro.",
      en: "The rates we have are from {anioTarifas} and it is now {anioHoy}: we do not show figures from a year that has passed. Ask at the notary's office or use the Superintendencia de Notariado y Registro calculator.",
    },
    comprador: { es: "Paga el comprador", en: "The buyer pays" },
    vendedor: { es: "Paga el vendedor", en: "The seller pays" },
    total: { es: "Total verificado", en: "Verified total" },
    faltaUno: {
      es: "Falta 1 concepto sin verificar: este total es lo mínimo que pagas.",
      en: "1 item is not verified: this total is the least you pay.",
    },
    faltanVarios: {
      es: "Faltan {n} conceptos sin verificar: este total es lo mínimo que pagas.",
      en: "{n} items are not verified: this total is the least you pay.",
    },
    sinCifra: { es: "Sin cifra", en: "No figure" },
    sinLineas: {
      es: "Este actor no paga nada de lo que calculamos.",
      en: "This party pays nothing of what we compute.",
    },
    cobra: { es: "Lo cobra: {quien}", en: "Charged by: {quien}" },
    normaAnio: { es: "{norma} · tarifa {anio}", en: "{norma} · {anio} rate" },
    tarifa: {
      por_mil: {
        es: "{valor} por mil de {base}",
        en: "{valor} per thousand of {base}",
      },
      porcentaje: { es: "{valor} % de {base}", en: "{valor}% of {base}" },
      fija: { es: "Tarifa fija", en: "Flat fee" },
      escala: {
        es: "Escala por rango de valor sobre {base}",
        en: "Value-bracket scale on {base}",
      },
    },
    parte: {
      es: "Tu parte: {parte} % de {total}",
      en: "Your share: {parte}% of {total}",
    },
    ganancia: {
      es: "La ganancia ocasional, el impuesto sobre la utilidad de la venta, depende de cada caso: aquí no la calculamos.",
      en: "Capital gains tax (ganancia ocasional), the tax on the profit from the sale, depends on each case: we do not compute it here.",
    },
    avisos: {
      es: "Lo que cambió esta cuenta",
      en: "What changed this estimate",
    },
  },

  guia: {
    documentos: {
      titulo: {
        es: "Qué pedir antes de firmar la promesa",
        en: "What to ask for before signing the promise of sale",
      },
      bajada: {
        es: "Marca lo que ya tienes. Las marcas se quedan en esta pantalla: no se guardan.",
        en: "Tick what you already have. The ticks stay on this screen: they are not saved.",
      },
    },
    plazos: {
      titulo: {
        es: "Cuánto tarda cada paso",
        en: "How long each step takes",
      },
      bajada: {
        es: "Cada plazo con la norma de donde sale; donde no hay una norma, lo decimos.",
        en: "Each deadline with the rule it comes from; where there is no rule, we say so.",
      },
    },
    norma: { es: "De dónde sale", en: "Where it comes from" },
  },
} as const satisfies Arbol;
