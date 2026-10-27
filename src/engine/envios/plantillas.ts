// Plantillas de campaña por lotes (C8) — 100% deterministas, cero IA. Cifras EXCLUSIVAMENTE
// citables (comisión 3% · fotos 89 vs 123 días / Redfin · CTL $23.000 SNR · 7–7,5 meses de venta).
// El correo enlaza a la app; el vendedor abre su anuncio con el enlace privado que guardó (no
// metemos su magic link en el correo → sin rotación de tokens por campaña).
//
// S5: el motor ya no lleva frases. La redacción de cada correo vive en `src/textos/correos.ts` en los
// dos idiomas y cada vendedor recibe el suyo (`vendedores.idioma`). El nombre del vendedor es TEXTO
// DEL USUARIO: se escapa antes de entrar al HTML.
import type { Idioma } from "@/i18n/idiomas";
import { esIdioma, IDIOMA_POR_DEFECTO, IDIOMAS } from "@/i18n/idiomas";
import { enIdioma, rellenar } from "@/i18n/textos";
import { CORREOS } from "@/textos/correos";

export type PlantillaId =
  "completa-anuncio" | "gana-sello" | "renueva-vigencia" | "re-verificar";

export type FiltroLote =
  "sin-fotos" | "sin-sello" | "por-vencer" | "re-verificar";

export type Plantilla = {
  id: PlantillaId;
  filtroSugerido: FiltroLote;
};

export const PLANTILLAS: Plantilla[] = [
  { id: "completa-anuncio", filtroSugerido: "sin-fotos" },
  { id: "gana-sello", filtroSugerido: "sin-sello" },
  { id: "renueva-vigencia", filtroSugerido: "por-vencer" },
  // S6 — el sello ahora muestra la fecha del CTL: a los verificados sin fecha se les pide uno nuevo.
  { id: "re-verificar", filtroSugerido: "re-verificar" },
];

export function plantillaPorId(id: string): Plantilla | null {
  return PLANTILLAS.find((p) => p.id === id) ?? null;
}

// Escapa lo que no es HTML nuestro: el nombre del vendedor y la URL (que va dentro de un atributo).
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function etiquetaDe(id: PlantillaId, idioma: Idioma): string {
  return enIdioma(CORREOS.plantillas[id].etiqueta, idioma);
}

export function asuntoDe(id: PlantillaId, idioma: Idioma): string {
  return enIdioma(CORREOS.plantillas[id].asunto, idioma);
}

// Cuerpo HTML del correo en el idioma pedido. `nombre` y `urlApp` se escapan aquí.
export function cuerpoHtml(
  id: PlantillaId,
  idioma: Idioma,
  nombre: string,
  urlApp: string,
): string {
  const t = enIdioma(CORREOS, idioma);
  const plantilla = t.plantillas[id];
  const limpio = escaparHtml(nombre?.trim() ?? "");
  const saludo = limpio
    ? rellenar(t.saludo.conNombre, { nombre: limpio })
    : t.saludo.sinNombre;
  return (
    `<p>${saludo},</p>` +
    plantilla.cuerpo +
    `<p><a href="${escaparHtml(urlApp)}" style="color:#7B5DD6;font-weight:bold">${plantilla.cta}</a></p>` +
    `<p style="color:#6b7280;font-size:12px">${t.pie}</p>`
  );
}

// Reparte una lista por idioma, para armar cada correo una vez por idioma (mismo asunto) y para que
// el panel cuente cuántos reciben cada versión. Un idioma sin destinatarios queda con lista vacía.
export function agruparPorIdioma<T extends { idioma: Idioma }>(
  lista: T[],
): Record<Idioma, T[]> {
  const grupos = Object.fromEntries(
    IDIOMAS.map((i) => [i, [] as T[]]),
  ) as Record<Idioma, T[]>;
  // Un idioma fuera de es/en (la columna lo impide) cae en el español: nadie se queda sin correo.
  for (const item of lista) {
    grupos[esIdioma(item.idioma) ? item.idioma : IDIOMA_POR_DEFECTO].push(item);
  }
  return grupos;
}
