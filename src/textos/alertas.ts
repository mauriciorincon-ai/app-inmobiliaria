// Alertas por correo (S9, maqueta 08, ADR 017). Aquí el resumen de los criterios de una búsqueda, que usan
// los correos y la pantalla de «Mis alertas». La operación y el tipo salen del vocabulario común
// (`COMUN.dominio`); los marcadores los rellena `engine/alertas/criterios.ts`.
import type { Arbol } from "@/i18n/textos";

export const ALERTAS = {
  criterios: {
    localidad: { es: "en {nombre}", en: "in {nombre}" },
    desde: { es: "desde {precio}", en: "from {precio}" },
    hasta: { es: "hasta {precio}", en: "up to {precio}" },
    habitaciones: { es: "{n}+ habitaciones", en: "{n}+ bedrooms" },
    zona: { es: "zona dibujada", en: "drawn area" },
    // Nombre por omisión de una alerta: «Apartamentos en Chapinero», «Búsqueda en zona dibujada».
    nombreTipoEn: { es: "{tipo} en {lugar}", en: "{tipo} in {lugar}" },
    nombreBusqueda: { es: "Mi búsqueda", en: "My search" },
    lugarZona: { es: "mi zona", en: "my area" },
    tiposPlural: {
      apartamento: { es: "Apartamentos", en: "Apartments" },
      casa: { es: "Casas", en: "Houses" },
      apartaestudio: { es: "Apartaestudios", en: "Studio apartments" },
      otro: { es: "Inmuebles", en: "Properties" },
    },
  },
} as const satisfies Arbol;
