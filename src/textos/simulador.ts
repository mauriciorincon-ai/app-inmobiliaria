// Simulador de cuota y capacidad (S10, maqueta 10, ADR 018). Redactado en cada idioma, no traducido. Las cifras de los
// topes viven en `@/engine/simulador/cuota`; aquí van la cita de cada norma y el nombre de las fuentes, que el usuario
// ve junto a la cifra, y los textos de la pantalla. Los nombres de las normas colombianas se dejan en español también
// en inglés. «Un cálculo, no una aprobación»: nada de esto es una oferta de crédito.
import type { Arbol } from "@/i18n/textos";

export const SIMULADOR = {
  normas: {
    cuota: {
      es: "Decreto 583 de 2025 (Decreto 1077 de 2015, art. 2.1.11.1, lit. b)",
      en: "Colombian Decreto 583 de 2025 (Decreto 1077 de 2015, art. 2.1.11.1(b))",
    },
    financiable: {
      es: "Decreto 1077 de 2015, art. 2.1.11.1, lit. a",
      en: "Colombian Decreto 1077 de 2015, art. 2.1.11.1(a)",
    },
    plazo: {
      es: "Ley 546 de 1999, art. 17",
      en: "Colombian Ley 546 de 1999, art. 17",
    },
  },
  meta: {
    titulo: {
      es: "Simulador de cuota — Innmobiliaria",
      en: "Payment calculator — Innmobiliaria",
    },
    descripcion: {
      es: "Calcula tu cuota mensual y hasta qué precio puedes comprar, con la tasa de referencia y su fecha. Tus ingresos no salen de tu teléfono.",
      en: "Work out your monthly payment and the highest price you can buy, with the reference rate and its date. Your income never leaves your phone.",
    },
  },

  pagina: {
    titulo: {
      es: "¿Cuánto pagarías al mes?",
      en: "What would you pay per month?",
    },
    bajada: {
      es: "Cuota fija en pesos. Mueve los números: el cálculo es tuyo y no sale de tu teléfono.",
      en: "Fixed monthly payment in Colombian pesos. Change the numbers: the math is yours and never leaves your phone.",
    },
    grupo: { es: "Tus números", en: "Your numbers" },
  },

  campos: {
    invalido: {
      es: "No pudimos leer este número.",
      en: "We couldn't read this number.",
    },
    precio: {
      etiqueta: { es: "Precio del inmueble (COP)", en: "Property price (COP)" },
      ayudaAnuncio: {
        es: "Viene del anuncio que estabas mirando.",
        en: "Taken from the listing you were looking at.",
      },
      ejemplo: { es: "Ej: 450.000.000", en: "e.g. 450,000,000" },
    },
    inicial: {
      etiqueta: { es: "Cuota inicial (%)", en: "Down payment (%)" },
      ayuda: {
        es: "La norma permite financiar hasta el 70 % del valor: con menos del 30 % de cuota inicial el crédito pasaría de ahí.",
        en: "The rule lets you finance up to 70% of the value: with less than 30% down the loan would go over that.",
      },
    },
    plazo: { etiqueta: { es: "Plazo (años)", en: "Term (years)" } },
    tasa: {
      etiqueta: {
        es: "Tasa efectiva anual (%)",
        en: "Effective annual rate (%)",
      },
      ayuda: {
        es: "Déjala vacía para usar la de referencia o escribe la que te ofrece tu banco.",
        en: "Leave it empty to use the reference rate, or type the one your bank offers you.",
      },
      ejemplo: { es: "Ej: 14,5", en: "e.g. 14.5" },
    },
    ingresos: {
      etiqueta: {
        es: "Ingresos mensuales del hogar (COP)",
        en: "Monthly household income (COP)",
      },
      ayuda: {
        es: "Se queda en tu teléfono: ninguna petición lo lleva.",
        en: "It stays on your phone: no request carries it.",
      },
      ejemplo: { es: "Ej: 15.000.000", en: "e.g. 15,000,000" },
    },
  },

  tasa: {
    referencia: {
      es: "Tasa de referencia: {tasa} % EA, con corte al {fecha} ({fuente}).",
      en: "Reference rate: {tasa}% effective annual, as of {fecha} ({fuente}).",
    },
    muestra: {
      es: "Promedio ponderado de {creditos} créditos de {entidades} entidades.",
      en: "Weighted average of {creditos} loans from {entidades} lenders.",
    },
    vieja: {
      es: "Esa tasa tiene más de {dias} días: puede estar desactualizada. Escribe la que te ofrece tu banco.",
      en: "That rate is over {dias} days old: it may be out of date. Type the one your bank offers you.",
    },
    respaldo: {
      es: "Aún no hemos guardado una tasa propia: mostramos la última que leímos, del {fecha}.",
      en: "We haven't stored a rate of our own yet: we're showing the last one we read, from {fecha}.",
    },
    tuya: {
      es: "Estás usando tu tasa: {tasa} % EA.",
      en: "You're using your own rate: {tasa}% effective annual.",
    },
  },

  salidas: {
    grupo: { es: "Tu cálculo", en: "Your result" },
    cuota: { es: "Tu cuota mensual", en: "Your monthly payment" },
    cuotaInicial: { es: "Cuota inicial", en: "Down payment" },
    credito: { es: "Crédito", en: "Loan" },
    total: { es: "Pagas en total", en: "Total you repay" },
    proporcion: {
      es: "La cuota sería de tus ingresos",
      en: "Payment as a share of income",
    },
    ingresoNecesario: {
      es: "Ingresos para que no pase del 40 %",
      en: "Income needed to stay under 40%",
    },
  },

  avisos: {
    cabe: {
      es: "La cuota no pasa del 40 % de tus ingresos.",
      en: "The payment stays under 40% of your income.",
    },
    noCabeTitulo: {
      es: "La cuota pasa del 40 % de tus ingresos",
      en: "The payment is over 40% of your income",
    },
    noCabeTexto: {
      es: "Prueba con una cuota inicial más alta o un plazo más largo.",
      en: "Try a bigger down payment or a longer term.",
    },
    sinIngresos: {
      es: "Escribe los ingresos de tu hogar para ver si la cuota cabe.",
      en: "Enter your household income to see whether the payment fits.",
    },
    sinTasa: {
      es: "Escribe la tasa que te ofrece tu banco para ver la cuota.",
      en: "Type the rate your bank offers you to see the payment.",
    },
    invalido: {
      es: "Revisa los números: el precio, la cuota inicial y el plazo deben ser válidos.",
      en: "Check the numbers: the price, down payment and term must be valid.",
    },
    excede: {
      es: "Con esa cuota inicial el crédito pasa del 70 % del valor, el máximo que permite la norma para vivienda que no es de interés social. Sube la cuota inicial al 30 % o más.",
      en: "With that down payment the loan goes over 70% of the value, the maximum the rule allows for housing that isn't social-interest housing. Raise the down payment to 30% or more.",
    },
  },

  capacidad: {
    titulo: { es: "Lo que puedes pagar", en: "What you can afford" },
    hasta: {
      es: "Con esos ingresos, ese plazo, esa tasa y tu cuota inicial (de al menos 30 %), puedes pagar hasta {precio}.",
      en: "With that income, term, rate and your down payment (at least 30%), you can afford up to {precio}.",
    },
    ver: { es: "Ver lo que puedo pagar", en: "See what I can afford" },
    avisame: {
      es: "Avísame de lo que puedo pagar",
      en: "Alert me about what I can afford",
    },
    privado: {
      es: "En el enlace viaja solo ese precio máximo, no tus ingresos.",
      en: "Only that maximum price travels in the link, not your income.",
    },
    olvidar: {
      es: "Borrar mis números de este teléfono",
      en: "Erase my numbers from this phone",
    },
    sinCalculo: {
      es: "Escribe tus ingresos y una tasa para ver hasta qué precio puedes comprar.",
      en: "Enter your income and a rate to see the highest price you can buy.",
    },
  },

  descargo: {
    titulo: {
      es: "Un cálculo, no una aprobación",
      en: "A calculation, not an approval",
    },
    texto: {
      es: "Es una estimación para decidir con números. No es una oferta ni una aprobación de crédito: tu banco fija la tasa y las condiciones reales.",
      en: "It's an estimate to help you decide with numbers. It is not a loan offer or approval: your bank sets the real rate and terms.",
    },
    cuota: {
      es: "La primera cuota no puede pasar del 40 % de los ingresos familiares ({norma}).",
      en: "The first payment can't exceed 40% of family income ({norma}).",
    },
    financiable: {
      es: "Se puede financiar hasta el 70 % del valor del inmueble ({norma}); en vivienda de interés social, hasta el 80 %. Este cálculo no decide si un inmueble es de interés social.",
      en: "You can finance up to 70% of the property's value ({norma}); up to 80% for social-interest housing. This calculation doesn't decide whether a property is social-interest housing.",
    },
    plazo: {
      es: "El plazo va de 5 a 30 años ({norma}).",
      en: "The term runs from 5 to 30 years ({norma}).",
    },
    fuenteTasa: {
      es: "Tasa: {fuente}.",
      en: "Rate: {fuente}.",
    },
  },

  fuentes: {
    tasa: {
      es: "Superintendencia Financiera de Colombia, tasas de interés activas (datos.gov.co, CC BY-SA 4.0)",
      en: "Colombia's Financial Superintendence, lending interest rates (datos.gov.co, CC BY-SA 4.0)",
    },
  },
} as const satisfies Arbol;
