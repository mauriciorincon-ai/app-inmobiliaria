// El lector de CTL (S15, maqueta 11): qué es cada marca, qué hacer y en qué norma se apoya. La estructura (tipos y artículos
// citados) vive en `src/engine/ctl/marcas.ts`; cada artículo está en el registro de lo leído (`src/data/normas-ctl.json`) y
// una prueba ata este texto a esos números. Ninguna frase afirma más de lo que dice el artículo citado.
import type { Arbol } from "@/i18n/textos";

export const CTL = {
  marcas: {
    hipoteca: {
      titulo: { es: "Hipoteca", en: "Mortgage" },
      queEs: {
        es: "Una deuda respaldada con el inmueble. El inmueble sigue en poder del dueño, pero el acreedor puede perseguirlo aunque cambie de dueño.",
        en: "A debt backed by the property. The owner keeps it, but the lender can go after the property even if it changes hands.",
      },
      queHacer: {
        es: "Pregunta cómo y cuándo se va a cancelar, y pídelo por escrito antes de pagar.",
        en: "Ask how and when it will be cancelled, and get it in writing before you pay.",
      },
      norma: {
        es: "Ley 1579 de 2012, art. 8; Código Civil, arts. 2432 y 2452.",
        en: "Law 1579 of 2012, art. 8; Civil Code, arts. 2432 and 2452.",
      },
    },
    // S16 (catálogo oficial): lo del grupo 02 que no es una hipoteca.
    gravamen: {
      titulo: {
        es: "Gravamen (valorización, plusvalía u otro)",
        en: "Charge on the property (betterment levy, capital-gain charge or other)",
      },
      queEs: {
        es: "Una carga inscrita sobre el inmueble que no es una hipoteca, como una contribución de valorización o la participación en plusvalía.",
        en: "A charge registered on the property that is not a mortgage, such as a betterment levy (valorización) or a capital-gain charge (plusvalía).",
      },
      queHacer: {
        es: "Pregunta si ya está pagada y pide ver su cancelación registrada antes de firmar.",
        en: "Ask whether it has been paid and ask to see its registered cancellation before signing.",
      },
      norma: {
        es: "Ley 1579 de 2012, art. 8.",
        en: "Law 1579 of 2012, art. 8.",
      },
    },
    embargo: {
      titulo: { es: "Embargo", en: "Seizure order (embargo)" },
      queEs: {
        es: "Un juez ordenó el embargo del inmueble y quedó inscrito. Venderlo mientras siga embargado tiene objeto ilícito, a menos que el juez lo autorice o el acreedor consienta.",
        en: "A judge ordered the property seized and it was registered. Selling it while it remains seized has an unlawful object, unless the judge authorises it or the creditor consents.",
      },
      queHacer: {
        es: "Antes de firmar, pide ver registrada la cancelación del embargo o la autorización del juez.",
        en: "Before signing, ask to see the registered cancellation of the seizure or the judge's authorisation.",
      },
      norma: {
        es: "Ley 1579 de 2012, art. 8; Código Civil, art. 1521; Código General del Proceso, art. 593.",
        en: "Law 1579 of 2012, art. 8; Civil Code, art. 1521; General Code of Procedure, art. 593.",
      },
    },
    medida_cautelar: {
      titulo: {
        es: "Demanda u otra medida cautelar",
        en: "Lawsuit or other precautionary measure",
      },
      queEs: {
        es: "Una demanda, una prohibición u otra medida cautelar inscrita en el folio. Una demanda inscrita no saca el inmueble del comercio, pero quien lo compre después queda sujeto a lo que diga la sentencia.",
        en: "A lawsuit, a prohibition or another precautionary measure recorded on the title. A recorded lawsuit doesn't take the property off the market, but whoever buys it afterwards is bound by the judgment.",
      },
      queHacer: {
        es: "Pregunta de qué proceso se trata y en qué va, y pide ver su cancelación registrada antes de firmar.",
        en: "Ask what the case is about and where it stands, and ask to see its registered cancellation before signing.",
      },
      norma: {
        es: "Ley 1579 de 2012, art. 8; Código General del Proceso, art. 591.",
        en: "Law 1579 of 2012, art. 8; General Code of Procedure, art. 591.",
      },
    },
    vivienda_familiar: {
      titulo: {
        es: "Afectación a vivienda familiar",
        en: "Registered as the family home",
      },
      queEs: {
        es: "Es la vivienda de una familia: solo se puede vender o gravar con el consentimiento de los dos cónyuges, expresado con su firma.",
        en: "It's a family's home: it can only be sold or mortgaged with the consent of both spouses, expressed by their signature.",
      },
      queHacer: {
        es: "Que los dos cónyuges firmen la promesa y la escritura.",
        en: "Make sure both spouses sign the promise and the deed.",
      },
      norma: {
        es: "Ley 1579 de 2012, art. 8; Ley 258 de 1996, art. 3.",
        en: "Law 1579 of 2012, art. 8; Law 258 of 1996, art. 3.",
      },
    },
    patrimonio_familia: {
      titulo: {
        es: "Patrimonio de familia",
        en: "Family estate (patrimonio de familia)",
      },
      queEs: {
        es: "Un patrimonio de familia: no es embargable y, si el dueño es casado o tiene hijos menores, para venderlo o cancelarlo necesita el consentimiento del cónyuge o el de los hijos, dado por medio de un curador.",
        en: "A family estate: it can't be seized and, if the owner is married or has minor children, selling or cancelling it needs the spouse's consent or the children's, given through a guardian.",
      },
      queHacer: {
        es: "Pregunta quién tiene que consentir y cómo se va a cancelar antes de la escritura.",
        en: "Ask who has to consent and how it will be cancelled before the deed.",
      },
      norma: {
        es: "Ley 1579 de 2012, art. 8; Ley 70 de 1931, arts. 21 y 23.",
        en: "Law 1579 of 2012, art. 8; Law 70 of 1931, arts. 21 and 23.",
      },
    },
    // S16: el código 0362 del catálogo, con su propia norma.
    prohibicion_transferencia: {
      titulo: {
        es: "Prohibición de transferir (vivienda con subsidio)",
        en: "Ban on transfer (home bought with a housing subsidy)",
      },
      queEs: {
        es: "La vivienda se compró con un subsidio familiar de vivienda y quedó inscrita una prohibición de transferirla. Si se transfiere antes del plazo de la ley, el subsidio se puede tener que devolver: hoy, cinco años desde la transferencia cuando el subsidio se dio cien por ciento en especie.",
        en: "The home was bought with a family housing subsidy and a ban on transferring it was registered. If it is transferred before the legal term, the subsidy may have to be paid back: today, five years from the transfer when the subsidy was given one hundred percent in kind.",
      },
      queHacer: {
        es: "Pregunta desde cuándo rige y si ya se levantó o hay permiso; pide verlo registrado antes de firmar.",
        en: "Ask since when it applies and whether it has been lifted or there is a permit; ask to see it registered before signing.",
      },
      norma: {
        es: "Ley 1579 de 2012, art. 8; Ley 1537 de 2012, art. 21, modificado por la Ley 2079 de 2021, art. 13.",
        en: "Law 1579 of 2012, art. 8; Law 1537 of 2012, art. 21, as amended by Law 2079 of 2021, art. 13.",
      },
    },
    // S16: el resto del grupo 03, lo de tenencia (05) y lo del 09 que no es un trámite neutro. Se pregunta, no se acusa.
    limitacion_dominio: {
      titulo: {
        es: "Limitación o afectación del dominio",
        en: "Limitation on ownership",
      },
      queEs: {
        es: "Una anotación que limita lo que el dueño puede hacer con el inmueble o que muestra que no tiene todo el derecho: una cuota, el usufructo o la nuda propiedad, una servidumbre, una condición, una declaratoria u otra.",
        en: "An entry that limits what the owner can do with the property, or shows they don't hold the whole right: a share, a usufruct or bare ownership, an easement, a condition, an official declaration or another.",
      },
      queHacer: {
        es: "Pregunta qué es y si afecta lo que vas a comprar; si no queda claro, pide un estudio de títulos.",
        en: "Ask what it is and whether it affects what you are buying; if it isn't clear, ask for a title study.",
      },
      norma: {
        es: "Ley 1579 de 2012, art. 8.",
        en: "Law 1579 of 2012, art. 8.",
      },
    },
    falsa_tradicion: {
      titulo: {
        es: "Falsa tradición",
        en: "Defective chain of title (falsa tradición)",
      },
      queEs: {
        es: "Una anotación de las que el registro llama falsa tradición: la venta de una cosa ajena o la transferencia de un derecho incompleto o sin antecedente propio.",
        en: "An entry of the kind the registry calls falsa tradición: the sale of someone else's property or the transfer of an incomplete right, or one with no prior title of its own.",
      },
      queHacer: {
        es: "Pide un estudio de títulos a un abogado antes de firmar la promesa.",
        en: "Ask a lawyer for a title study before signing the promise.",
      },
      norma: {
        es: "Ley 1579 de 2012, art. 8.",
        en: "Law 1579 of 2012, art. 8.",
      },
    },
  },

  // La línea de una marca cancelada.
  cancelacion: {
    texto: {
      es: "Cancelada por la anotación {n}: la cancelación deja sin efecto la inscripción.",
      en: "Cancelled by entry {n}: the cancellation leaves the registration without effect.",
    },
    norma: {
      es: "Ley 1579 de 2012, arts. 61, 62 y 63.",
      en: "Law 1579 of 2012, arts. 61, 62 and 63.",
    },
  },

  // La pantalla (5.ª sección de `/papeleo`; F3).
  lector: {
    rotulos: {
      queEs: { es: "Qué es", en: "What it is" },
      queHacer: { es: "Qué hacer", en: "What to do" },
      norma: { es: "Norma", en: "Rule" },
    },
    pestana: { es: "Certificado (CTL)", en: "Title record (CTL)" },
    resultado: { es: "Lo que encontramos", en: "What we found" },
    cancelada: { es: "Cancelada", en: "Cancelled" },
    especificacion: { es: "Dice: {texto}", en: "It says: {texto}" },
    leidas: {
      es: "Normas citadas, leídas en su texto oficial el {fecha}.",
      en: "Rules cited, read in their official text on {fecha}.",
    },
    titulo: {
      es: "Lee tu certificado de tradición",
      en: "Read your title record",
    },
    intro: {
      es: "Pega el texto del certificado de tradición y libertad (CTL). Te marcamos hipotecas y otros gravámenes, embargos, demandas y otras medidas cautelares, limitaciones del dominio, la prohibición de transferir una vivienda con subsidio, la afectación a vivienda familiar, el patrimonio de familia y la falsa tradición, con su anotación y si siguen vigentes.",
      en: "Paste the text of the title record (certificado de tradición y libertad, CTL). We flag mortgages and other charges, seizures, lawsuits and other precautionary measures, limitations on ownership, bans on transferring a subsidised home, family-home registrations, family estates and defective chains of title, with their entry number and whether they still stand.",
    },
    privacidad: {
      es: "El texto se lee en tu teléfono: no sale de aquí, no lo guardamos y no lo vemos.",
      en: "The text is read on your phone: it doesn't leave it, we don't keep it and we don't see it.",
    },
    campo: { es: "Texto del certificado", en: "Title record text" },
    ayuda: {
      es: "Abre el PDF del certificado, copia todo el texto y pégalo aquí.",
      en: "Open the certificate PDF, copy all the text and paste it here.",
    },
    leer: { es: "Leer el certificado", en: "Read the record" },
    borrar: { es: "Borrar el texto", en: "Clear the text" },
    vacio: {
      es: "Pega el texto para leerlo.",
      en: "Paste the text to read it.",
    },
    sinAnotaciones: {
      es: "No encontramos anotaciones en este texto. ¿Es el certificado de tradición y libertad completo?",
      en: "We didn't find any entries in this text. Is it the complete title record?",
    },
    resumen: {
      es: "Anotaciones leídas: {anotaciones} · marcas vigentes: {vigentes} · marcas canceladas: {canceladas}",
      en: "Entries read: {anotaciones} · active flags: {vigentes} · cancelled flags: {canceladas}",
    },
    sinMarcas: {
      es: "En las anotaciones que reconocemos no encontramos nada de lo que este lector marca.",
      en: "In the entries we recognise we found nothing this reader flags.",
    },
    sinMarcasConDudas: {
      es: "Entre las anotaciones que reconocemos no hay nada de lo que este lector marca, pero hay anotaciones que no entendimos: revísalas abajo antes de firmar.",
      en: "None of the entries we recognise is something this reader flags, but there are entries we didn't understand: check them below before signing.",
    },
    vigente: { es: "Vigente", en: "Still standing" },
    anotacion: { es: "Anotación {n}", en: "Entry {n}" },
    fecha: { es: "del {fecha}", en: "dated {fecha}" },
    noReconocidas: {
      titulo: {
        es: "Anotaciones que no reconocemos",
        en: "Entries we don't recognise",
      },
      texto: {
        es: "No sabemos qué dicen: pregúntale al dueño o a un abogado antes de firmar.",
        en: "We don't know what they say: ask the owner or a lawyer before signing.",
      },
    },
    sinNumero: {
      es: "La anotación {n} es una cancelación que no dice qué anotación cancela: no damos nada por cancelado.",
      en: "Entry {n} is a cancellation that doesn't say which entry it cancels: we don't treat anything as cancelled.",
    },
    referenciaRota: {
      es: "La anotación {n} cancela una anotación que no está en el texto pegado: revisa que esté completo.",
      en: "Entry {n} cancels an entry that isn't in the pasted text: check that it's complete.",
    },
    expedido: {
      es: "Días desde que se expidió: {dias}.",
      en: "Days since it was issued: {dias}.",
    },
    viejo: {
      es: "Tiene más de {max} días: pide uno reciente antes de firmar.",
      en: "It's more than {max} days old: ask for a recent one before signing.",
    },
    aviso: {
      es: "Esto es una lectura del texto, no un estudio de títulos: no reemplaza a un abogado.",
      en: "This is a reading of the text, not a title study: it doesn't replace a lawyer.",
    },
    // S16 (decisión 1a del usuario): siempre a la vista, encima del resultado.
    enPrueba: {
      es: "Lectura en prueba: validada con la tabla oficial de códigos y pocos certificados reales. Confírmala en tu certificado; no reemplaza el estudio de títulos.",
      en: "Reading in testing: checked against the official code table and a few real certificates. Confirm it on your certificate; it doesn't replace a title study.",
    },
    incompleto: {
      es: "El texto parece incompleto: el certificado dice {total} anotaciones y faltan las número {faltan}. Copia el certificado entero; una página sin copiar puede esconder la más reciente.",
      en: "The text looks incomplete: the record says {total} entries and numbers {faltan} are missing. Copy the whole record; a page left out can hide the most recent entry.",
    },
    incompletoSinTotal: {
      es: "El texto parece incompleto: faltan las anotaciones número {faltan}. Copia el certificado entero.",
      en: "The text looks incomplete: entries {faltan} are missing. Copy the whole record.",
    },
    sinTotal: {
      es: "El texto no trae el «número total de anotaciones»: no podemos comprobar que esté completo.",
      en: "The text doesn't include the «total number of entries»: we can't check that it's complete.",
    },
    sinCodigo: {
      es: "Sin código: la leímos por sus palabras.",
      en: "No code: we read it by its words.",
    },
    fueraDeCatalogo: {
      es: "El código {codigo} no está en el catálogo de 2016: la leímos por su grupo.",
      en: "Code {codigo} isn't in the 2016 table: we read it by its group.",
    },
  },
} as const satisfies Arbol;
