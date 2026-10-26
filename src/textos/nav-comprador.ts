// Navegación del comprador (S9–S10, maqueta 07/08/10, decisión de diseño 6): Buscar · Guardados · Alertas ·
// Herramientas (el simulador de cuota y, desde el S14, el papeleo). En el teléfono es una barra inferior.
import type { Arbol } from "@/i18n/textos";

export const NAV_COMPRADOR = {
  grupo: { es: "Secciones del comprador", en: "Buyer sections" },
  buscar: { es: "Buscar", en: "Search" },
  guardados: { es: "Guardados", en: "Saved" },
  alertas: { es: "Alertas", en: "Alerts" },
  herramientas: { es: "Herramientas", en: "Tools" },
} as const satisfies Arbol;
