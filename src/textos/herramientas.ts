// El selector que une las dos herramientas del comprador (S14, maqueta 11): el simulador de cuota y el asistente del papeleo.
// Va en las dos páginas, por eso vive aparte de los diccionarios de cada una.
import type { Arbol } from "@/i18n/textos";

export const HERRAMIENTAS = {
  grupo: { es: "Herramienta", en: "Tool" },
  simulador: { es: "Simulador", en: "Calculator" },
  papeleo: { es: "Papeleo", en: "Paperwork" },
} as const satisfies Arbol;
