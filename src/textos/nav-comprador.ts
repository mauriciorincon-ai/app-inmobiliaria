// Navegación del comprador (S9, maqueta 07/08, decisión de diseño 6): Buscar · Guardados · Alertas. La cuarta
// sección de la maqueta (Herramientas) llega con su sprint. En el teléfono es una barra inferior.
import type { Arbol } from "@/i18n/textos";

export const NAV_COMPRADOR = {
  grupo: { es: "Secciones del comprador", en: "Buyer sections" },
  buscar: { es: "Buscar", en: "Search" },
  guardados: { es: "Guardados", en: "Saved" },
  alertas: { es: "Alertas", en: "Alerts" },
} as const satisfies Arbol;
