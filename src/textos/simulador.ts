// Simulador de cuota y capacidad (S10, maqueta 10, ADR 018). Redactado en cada idioma, no traducido. Las cifras de los
// topes viven en `@/engine/simulador/cuota`; aquí van la cita de cada norma y el nombre de las fuentes, que el usuario
// ve junto a la cifra. Los nombres de las normas colombianas se dejan en español también en inglés.
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
  fuentes: {
    tasa: {
      es: "Superintendencia Financiera de Colombia, tasas de interés activas (datos.gov.co, CC BY-SA 4.0)",
      en: "Colombia's Financial Superintendence, lending interest rates (datos.gov.co, CC BY-SA 4.0)",
    },
  },
} as const satisfies Arbol;
