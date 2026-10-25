// «Qué dice cada documento» (S14, en el lugar del lector de CTL de la maqueta 11): las cláusulas típicas de la promesa, la escritura y
// el registro en palabras simples. Texto fijo y versionado, sin IA y sin leer el documento de nadie. La estructura (qué documento,
// cuándo aplica y qué artículos cita, por número) vive en `src/engine/papeleo/guia.ts` bajo el mismo id, y cada artículo citado está
// en el registro de lo leído (`src/data/normas-clausulas.json`). Dice solo lo que el artículo dice: ninguna frase absoluta, y donde
// la regla cambia si vende una constructora (Código de Comercio), lo dice.
import type { Arbol } from "@/i18n/textos";

export const PAPELEO_CLAUSULAS = {
  titulo: { es: "Qué dice cada documento", en: "What each document says" },
  bajada: {
    es: "Las cláusulas que más se ven al comprar vivienda, en palabras simples y con el artículo de donde sale cada una. Es un texto fijo: no leemos tu documento.",
    en: "The clauses you see most when buying a home, in plain words and with the article each one comes from. It is a fixed text: we do not read your document.",
  },
  // Va en cada documento, no una sola vez al final.
  aviso: {
    es: "Esto explica lo que dice la norma; no es asesoría legal. Para tu caso, consulta a un abogado o en la notaría.",
    en: "This explains what the rule says; it is not legal advice. For your own case, ask a lawyer or the notary's office.",
  },
  leidas: {
    es: "Normas leídas en su texto oficial el {fecha}.",
    en: "Rules read in their official text on {fecha}.",
  },
  rotulos: {
    queDice: { es: "Qué dice", en: "What it says" },
    queMirar: { es: "Qué mirar", en: "What to check" },
    norma: { es: "De dónde sale", en: "Where it comes from" },
  },

  documentos: {
    promesa: {
      titulo: { es: "Promesa de compraventa", en: "Promise of sale" },
      bajada: {
        es: "Se firma antes de la escritura: las partes se comprometen a firmarla en una fecha y una notaría.",
        en: "It is signed before the deed: the parties commit to signing the deed on a set date at a notary's office.",
      },
    },
    escritura: {
      titulo: { es: "Escritura pública", en: "Public deed" },
      bajada: {
        es: "Se firma ante notario y es la venta. El dominio pasa al comprador con el registro.",
        en: "It is signed before a notary and it is the sale itself. Ownership passes to the buyer with registration.",
      },
    },
    registro: {
      titulo: { es: "Registro", en: "Registration" },
      bajada: {
        es: "La escritura se inscribe en la Oficina de Registro de Instrumentos Públicos, en el folio de matrícula del inmueble.",
        en: "The deed is recorded at the Public Instruments Registry Office, in the property's registration folio.",
      },
    },
  },

  clausulas: {
    requisitos: {
      titulo: { es: "Lo que la hace valer", en: "What makes it binding" },
      queDice: {
        es: "Una promesa solo produce obligaciones si reúne cuatro cosas: consta por escrito; el contrato prometido no es de los que la ley declara ineficaces; trae un plazo o una condición que fija la época en que se firmará la escritura; y deja el contrato tan determinado que solo faltan la tradición o las formalidades legales.",
        en: "A promise only creates obligations if it meets four conditions: it is in writing; the promised contract is not one the law declares ineffective; it has a term or a condition that sets when the deed will be signed; and it defines the contract so fully that only the transfer or the legal formalities are missing.",
      },
      queMirar: {
        es: "Que identifique el inmueble (dirección, matrícula inmobiliaria y linderos), el precio y la forma de pago. Si falta uno de los cuatro requisitos, la promesa no produce obligación.",
        en: "That it identifies the property (address, real-estate registration number and boundaries), the price and the payment terms. If one of the four conditions is missing, the promise creates no obligation.",
      },
      norma: {
        es: "Ley 153 de 1887, art. 89.",
        en: "Law 153 of 1887, art. 89.",
      },
    },
    plazo_y_notaria: {
      titulo: {
        es: "Fecha y notaría de la escritura",
        en: "Date and notary's office for the deed",
      },
      queDice: {
        es: "La promesa tiene que traer un plazo o una condición que fije la época en que se firmará la escritura.",
        en: "The promise has to include a term or a condition that sets when the deed will be signed.",
      },
      queMirar: {
        es: "Día, hora y notaría por escrito, para que las dos partes lleguen al mismo sitio el mismo día; la ley pide la época, la notaría la pactan las partes. Si dependes de un crédito, que la fecha deje tiempo para el desembolso.",
        en: "Day, time and notary's office in writing, so both parties show up at the same place on the same day; the law asks for the date, the parties agree on the office. If you depend on a loan, make sure the date leaves time for the disbursement.",
      },
      norma: {
        es: "Ley 153 de 1887, art. 89, numeral 3.",
        en: "Law 153 of 1887, art. 89, item 3.",
      },
    },
    arras: {
      titulo: { es: "Arras", en: "Deposit (arras)" },
      queDice: {
        es: "Son algo que una parte entrega, por lo general dinero, como prenda de que el negocio se hará. Si no consta por escrito que se dan como parte del precio o como señal de quedar convenidos, la ley entiende que cada parte puede retractarse: quien las dio las pierde y quien las recibió las devuelve dobladas.",
        en: "Something one party hands over, usually money, as a pledge that the deal will happen. Unless it is stated in writing that it is given as part of the price or as a sign that the parties have agreed, the law understands that each party may back out: whoever gave it loses it, and whoever received it pays it back doubled.",
      },
      queMirar: {
        es: "Si dicen «de retracto» o «como parte del precio», y hasta cuándo se puede retractar: si no se fijó un plazo, el retracto se acaba a los dos meses del acuerdo, al otorgar la escritura o al empezar la entrega, lo que ocurra primero. Si la venta es un acto mercantil para quien vende, como una constructora, rige el Código de Comercio: celebrado el contrato prometido ya no hay retracto, y las arras se abonan a lo que se debe o se devuelven. Los artículos hablan de la venta con arras: si tu promesa las pacta, pide que diga con qué reglas y que un abogado lo confirme.",
        en: "Whether they are called «withdrawal» arras or «part of the price», and until when a party may back out: if no term was set, that right ends two months after the agreement, when the deed is granted or when the handover starts, whichever comes first. If the sale is a commercial act for the seller, such as a developer, the Commercial Code applies: once the promised contract is signed there is no backing out, and the deposit is credited to what is owed or returned. The articles speak of a sale with arras: if your promise sets one, ask it to say under which rules and have a lawyer confirm it.",
      },
      norma: {
        es: "Código Civil, arts. 1859, 1860 y 1861. Si la venta es un acto mercantil para quien vende: Código de Comercio, arts. 22 y 866.",
        en: "Civil Code, arts. 1859, 1860 and 1861. If the sale is a commercial act for the seller: Commercial Code, arts. 22 and 866.",
      },
    },
    clausula_penal: {
      titulo: {
        es: "Cláusula penal (la multa)",
        en: "Penalty clause (the fine)",
      },
      queDice: {
        es: "Es la pena que se compromete a pagar quien no cumpla o se demore. Se puede cobrar aunque el incumplimiento no haya causado perjuicio. La pena y la indemnización de perjuicios no se piden a la vez, salvo que se haya pactado así de forma expresa.",
        en: "It is the penalty a party agrees to pay if it does not perform or is late. It can be claimed even if the breach caused no damage. The penalty and compensation for damages are not claimed together, unless that was expressly agreed.",
      },
      queMirar: {
        es: "Cuánto es y a quién obliga: a las dos partes o solo a una. Si la pena es enorme frente a lo que se debe, se puede pedir que se rebaje según el límite del Código Civil. Si la venta es un acto mercantil para quien vende, la pena no puede superar el monto de la obligación, y con ella pactada las partes ya no pueden retractarse.",
        en: "How much it is and whom it binds: both parties or only one. If the penalty is enormous compared with what is owed, a reduction can be requested under the Civil Code's limit. If the sale is a commercial act for the seller, the penalty cannot exceed the amount of the obligation, and once it is agreed the parties can no longer back out.",
      },
      norma: {
        es: "Código Civil, arts. 1592, 1599, 1600 y 1601. Si la venta es un acto mercantil para quien vende: Código de Comercio, art. 867.",
        en: "Civil Code, arts. 1592, 1599, 1600 and 1601. If the sale is a commercial act for the seller: Commercial Code, art. 867.",
      },
    },
    incumplimiento: {
      titulo: {
        es: "Si una parte no cumple",
        en: "If one party does not perform",
      },
      queDice: {
        es: "En un contrato entre dos partes va implícita esta condición: si una no cumple lo pactado, la otra puede pedir a su elección que se cumpla o que se resuelva, en los dos casos con indemnización de perjuicios.",
        en: "A contract between two parties carries this implied condition: if one does not do what was agreed, the other may choose to demand performance or to have the contract terminated, with compensation for damages either way.",
      },
      queMirar: {
        es: "Que la promesa diga qué cuenta como incumplir (no pagar a tiempo, no ir a la notaría, no entregar) y cómo se avisa. Si trae cláusula penal, léelas juntas.",
        en: "That the promise says what counts as a breach (not paying on time, not showing up at the notary's office, not handing over) and how notice is given. If it has a penalty clause, read them together.",
      },
      norma: {
        es: "Código Civil, art. 1546.",
        en: "Civil Code, art. 1546.",
      },
    },
    perfecciona: {
      titulo: {
        es: "La venta queda perfecta con la escritura",
        en: "The sale is complete with the deed",
      },
      queDice: {
        es: "La venta de un inmueble no se tiene por perfecta ante la ley mientras no se otorgue la escritura pública. La promesa es el compromiso de firmarla; la escritura es la venta.",
        en: "A sale of real estate is not deemed complete before the law until the public deed is granted. The promise is the commitment to sign it; the deed is the sale.",
      },
      queMirar: {
        es: "Que el inmueble, el precio y las partes coincidan con la promesa y con el certificado de tradición y libertad.",
        en: "That the property, the price and the parties match the promise and the title record certificate.",
      },
      norma: {
        es: "Código Civil, art. 1857, inciso 2.",
        en: "Civil Code, art. 1857, paragraph 2.",
      },
    },
    precio_real: {
      titulo: { es: "El precio, bajo juramento", en: "The price, under oath" },
      queDice: {
        es: "En la escritura las partes declaran bajo juramento que el precio es real, que no hay pactos privados por un valor distinto y que no hay sumas convenidas por fuera; si las hay, se declara su valor. Sin esas declaraciones, el impuesto sobre la renta, la ganancia ocasional, el impuesto de registro y los derechos notariales y de registro se liquidan sobre cuatro veces el valor de la escritura.",
        en: "In the deed the parties declare under oath that the price is real, that there are no private agreements for a different amount and no sums agreed outside the deed; if there are, their amount is declared. Without those statements, income tax, capital-gains tax, the registration tax and the notary and registration fees are computed on four times the value in the deed.",
      },
      queMirar: {
        es: "Que el precio de la escritura sea el que de verdad pagas, con lo que se pague aparte por mejoras, construcciones o intermediación.",
        en: "That the price in the deed is what you actually pay, including anything paid separately for improvements, construction or brokerage.",
      },
      norma: {
        es: "Estatuto Tributario, art. 90, en la redacción de la Ley 2010 de 2019.",
        en: "Tax Code (Estatuto Tributario), art. 90, as worded by Law 2010 of 2019.",
      },
    },
    gastos: {
      titulo: {
        es: "Quién paga la escritura y el registro",
        en: "Who pays for the deed and the registration",
      },
      queDice: {
        es: "Las costas de la escritura se dividen entre vendedor y comprador, salvo que pacten otra cosa, y la notaría cobra sus derechos por mitades en un contrato entre dos partes. En Bogotá y Cundinamarca el impuesto de registro también se paga por partes iguales, salvo que las partes digan otra cosa.",
        en: "The deed's costs are split between seller and buyer unless they agree otherwise, and the notary's office charges its fees in halves in a contract between two parties. In Bogotá and Cundinamarca the registration tax is also paid in equal parts, unless the parties say otherwise.",
      },
      queMirar: {
        es: "Si la promesa reparte distinto, esa es la cuenta: cámbiala en los ajustes de Gastos.",
        en: "If the promise splits them differently, that is the split that counts: change it in the Costs settings.",
      },
      norma: {
        es: "Código Civil, art. 1862; Decreto-Ley 960 de 1970, art. 223; Ordenanza 039 de 2020 de Cundinamarca, art. 212.",
        en: "Civil Code, art. 1862; Decree-Law 960 of 1970, art. 223; Cundinamarca Ordinance 039 of 2020, art. 212.",
      },
    },
    saneamiento: {
      titulo: {
        es: "Saneamiento: el vendedor responde",
        en: "Warranty of title: the seller answers for it",
      },
      queDice: {
        es: "El vendedor se obliga a entregar y a sanear. Sanear es amparar al comprador en el dominio y la posesión pacífica (si un juez lo priva del inmueble por una causa anterior a la venta, esa evicción la responde el vendedor) y responder por los defectos ocultos, llamados vicios redhibitorios.",
        en: "The seller is bound to hand over the property and to warrant it. That means protecting the buyer's ownership and peaceful possession (if a court takes the property away for a cause that predates the sale, the seller answers for that eviction) and answering for hidden defects, called redhibitory defects.",
      },
      queMirar: {
        es: "Que la escritura diga que se vende libre de hipotecas, embargos, demandas y otros gravámenes, y compáralo con el certificado de tradición. Ojo con una cláusula que libere al vendedor del saneamiento por evicción: la ley lo admite si se pacta, y ese pacto es nulo si hubo mala fe del vendedor.",
        en: "That the deed says it is sold free of mortgages, liens, lawsuits and other encumbrances, and check it against the title record certificate. Watch for a clause that releases the seller from the warranty against eviction: the law allows it if it is agreed, and that agreement is void if the seller acted in bad faith.",
      },
      norma: {
        es: "Código Civil, arts. 1880, 1893, 1894, 1895 y 1898.",
        en: "Civil Code, arts. 1880, 1893, 1894, 1895 and 1898.",
      },
    },
    vivienda_familiar: {
      titulo: {
        es: "Afectación a vivienda familiar",
        en: "Family-home protection (afectación a vivienda familiar)",
      },
      queDice: {
        es: "El notario le pregunta al vendedor si tiene sociedad conyugal, matrimonio o unión marital de hecho, y él declara bajo juramento si la vivienda está afectada: si lo está, solo se vende con el consentimiento de los dos, que se expresa con su firma. Al comprador le pregunta lo mismo y si ya tiene otra vivienda afectada; si tiene pareja y no tiene otra afectada, la que compra queda afectada por ministerio de la ley, salvo que la pareja declare de común acuerdo que no la somete.",
        en: "The notary asks the seller whether they have a marital partnership, a marriage or a de facto union, and the seller declares under oath whether the home is protected: if it is, it can only be sold with the consent of both, expressed by their signatures. The notary asks the buyer the same and whether they already have another protected home; if the buyer has a partner and no other protected home, the one they buy becomes protected by operation of law, unless the couple jointly declares that they do not subject it to the protection.",
      },
      queMirar: {
        es: "Que la escritura deje constancia de esas respuestas. Los actos que desconozcan la afectación quedan viciados de nulidad absoluta. Cuenta también para compañeros permanentes con al menos dos años de unión.",
        en: "That the deed records those answers. Acts that ignore the protection are void (absolute nullity). It also covers permanent partners whose union has lasted at least two years.",
      },
      norma: {
        es: "Ley 258 de 1996, arts. 3, 6 y 12.",
        en: "Law 258 of 1996, arts. 3, 6 and 12.",
      },
    },
    dueno_al_registrar: {
      titulo: {
        es: "Eres dueño al registrar, no al firmar",
        en: "You become the owner on registration, not on signing",
      },
      queDice: {
        es: "La tradición del dominio de un inmueble se hace con la inscripción del título en la Oficina de Registro de Instrumentos Públicos: el registro es el medio para que el dominio pase. Con la escritura firmada y sin registrar, el dominio no ha pasado.",
        en: "Ownership of real estate is transferred by recording the title at the Public Instruments Registry Office: registration is the means by which ownership passes. With the deed signed but not recorded, ownership has not passed.",
      },
      queMirar: {
        es: "Pide el registro pronto y, cuando salga, un certificado de tradición nuevo: tu compraventa debe aparecer como una anotación a tu nombre (si compraste con crédito o la vivienda queda afectada, después pueden venir la hipoteca o la afectación).",
        en: "Ask for registration soon and, once it is done, get a new title record certificate: your purchase should appear as an entry in your name (if you bought with a loan or the home becomes protected, the mortgage or the protection can come after it).",
      },
      norma: {
        es: "Código Civil, art. 756; Ley 1579 de 2012, art. 2, literal a.",
        en: "Civil Code, art. 756; Law 1579 of 2012, art. 2, letter a.",
      },
    },
    prioridad: {
      titulo: {
        es: "Quien radica primero, va primero",
        en: "First to file, first in line",
      },
      queDice: {
        es: "El acto que primero se radica en la Oficina de Registro tiene preferencia sobre cualquier otro que se radique después, aunque ese otro documento tenga una fecha anterior, salvo las excepciones de la ley.",
        en: "The act filed first at the Registry Office takes precedence over any other filed later, even if that other document bears an earlier date, save for the exceptions in the law.",
      },
      queMirar: {
        es: "No dejes pasar días entre la escritura y la radicación: un embargo u otra venta que se radique antes que tu escritura puede quedar delante.",
        en: "Do not let days go by between the deed and the filing: a lien or another sale filed before your deed can end up ahead of it.",
      },
      norma: {
        es: "Ley 1579 de 2012, art. 3, literal c.",
        en: "Law 1579 of 2012, art. 3, letter c.",
      },
    },
    hipoteca: {
      titulo: { es: "La hipoteca del crédito", en: "The loan's mortgage" },
      queDice: {
        es: "La hipoteca se otorga por escritura pública, que puede ser la misma de la compra, y sin inscribirse en el registro no tiene valor alguno: su fecha cuenta desde la inscripción. Solo se puede inscribir dentro de los 90 días hábiles siguientes a su otorgamiento.",
        en: "A mortgage is granted by public deed, which can be the same deed as the purchase, and without being recorded it has no value at all: its date counts from the recording. It can only be recorded within 90 business days after it is granted.",
      },
      queMirar: {
        es: "Que la escritura de compra y la de hipoteca se radiquen juntas y a tiempo: pasados los 90 días hábiles, la hipoteca ya no se puede inscribir.",
        en: "That the purchase deed and the mortgage deed are filed together and on time: after 90 business days, the mortgage can no longer be recorded.",
      },
      norma: {
        es: "Código Civil, arts. 2434 y 2435; Ley 1579 de 2012, art. 28.",
        en: "Civil Code, arts. 2434 and 2435; Law 1579 of 2012, art. 28.",
      },
    },
  },
} as const satisfies Arbol;
