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
      titulo: { es: "Patrimonio de familia", en: "Family estate (patrimonio de familia)" },
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
    falsa_tradicion: {
      titulo: { es: "Falsa tradición", en: "Defective chain of title (falsa tradición)" },
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
    titulo: { es: "Lee tu certificado de tradición", en: "Read your title record" },
    intro: {
      es: "Pega el texto del certificado de tradición y libertad (CTL). Te marcamos hipotecas, embargos, demandas y otras medidas cautelares, la afectación a vivienda familiar, el patrimonio de familia y la falsa tradición, con su anotación y si siguen vigentes.",
      en: "Paste the text of the title record (certificado de tradición y libertad, CTL). We flag mortgages, seizures, lawsuits and other precautionary measures, family-home registrations, family estates and defective chains of title, with their entry number and whether they still stand.",
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
    vacio: { es: "Pega el texto para leerlo.", en: "Paste the text to read it." },
    sinAnotaciones: {
      es: "No encontramos anotaciones en este texto. ¿Es el certificado de tradición y libertad completo?",
      en: "We didn't find any entries in this text. Is it the complete title record?",
    },
    resumen: {
      es: "{anotaciones} anotaciones leídas · {vigentes} marcas vigentes · {canceladas} canceladas",
      en: "{anotaciones} entries read · {vigentes} active flags · {canceladas} cancelled",
    },
    sinMarcas: {
      es: "En las anotaciones que reconocemos no encontramos nada de lo que este lector marca.",
      en: "In the entries we recognise we found nothing this reader flags.",
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
      es: "Expedido hace {dias} días.",
      en: "Issued {dias} days ago.",
    },
    viejo: {
      es: "Tiene más de {max} días: pide uno reciente antes de firmar.",
      en: "It's more than {max} days old: ask for a recent one before signing.",
    },
    aviso: {
      es: "Esto es una lectura del texto, no un estudio de títulos: no reemplaza a un abogado.",
      en: "This is a reading of the text, not a title study: it doesn't replace a lawyer.",
    },
  },
} as const satisfies Arbol;
