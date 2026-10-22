// Vivienda nueva real (S11). La edición de la revista se muestra siempre con su fuente; el nombre de la publicación y su
// número no se traducen. Lo demás de este módulo (pantallas) llega con la maqueta aprobada en el S12.
import type { Arbol } from "@/i18n/textos";

export const VIVIENDA_NUEVA = {
  fuente: {
    es: "Fuente: Estrenar Vivienda, edición 187",
    en: "Source: Estrenar Vivienda, edition 187",
  },
} as const satisfies Arbol;
