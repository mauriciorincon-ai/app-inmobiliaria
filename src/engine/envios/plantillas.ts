// Plantillas de campaña por lotes (C8) — 100% deterministas, cero IA. Cifras EXCLUSIVAMENTE
// citables (comisión 3% · fotos 89 vs 123 días / Redfin · CTL $23.000 SNR · 7–7,5 meses de venta).
// El correo enlaza a la app; el vendedor abre su anuncio con el enlace privado que guardó (no
// metemos su magic link en el correo → sin rotación de tokens por campaña).

export type PlantillaId =
  "completa-anuncio" | "gana-sello" | "renueva-vigencia";

export type Plantilla = {
  id: PlantillaId;
  etiqueta: string;
  filtroSugerido: "sin-fotos" | "sin-sello" | "por-vencer";
  asunto: string;
  cuerpoHtml: (nombre: string, urlApp: string) => string;
};

const saludo = (nombre: string) =>
  nombre?.trim() ? `Hola ${nombre.trim()}` : "Hola";

const cerrar = (urlApp: string, cta: string) =>
  `<p><a href="${urlApp}" style="color:#7B5DD6;font-weight:bold">${cta}</a></p>` +
  `<p style="color:#888;font-size:12px">Innmobiliaria — vende tu casa directo, sin comisión.</p>`;

export const PLANTILLAS: Plantilla[] = [
  {
    id: "completa-anuncio",
    etiqueta: "Completa tu anuncio (fotos)",
    filtroSugerido: "sin-fotos",
    asunto: "Tu anuncio luce mejor con fotos",
    cuerpoHtml: (nombre, urlApp) =>
      `<p>${saludo(nombre)},</p>` +
      `<p>Los inmuebles con buenas fotos se venden más rápido: <strong>89 días en el mercado frente a 123</strong> sin buenas fotos (Redfin).</p>` +
      `<p>Abre tu anuncio con el enlace privado que te dimos al publicar y súbele fotos desde el teléfono.</p>` +
      cerrar(urlApp, "Completar mi anuncio →"),
  },
  {
    id: "gana-sello",
    etiqueta: "Gana tu sello ⭐ (verificación)",
    filtroSugerido: "sin-sello",
    asunto: "Gana tu sello de propietario verificado ⭐",
    cuerpoHtml: (nombre, urlApp) =>
      `<p>${saludo(nombre)},</p>` +
      `<p>Saca tu <strong>Certificado de Tradición y Libertad</strong> (cuesta <strong>$23.000</strong> en línea, emisión inmediata) y gana el sello ⭐ de propietario verificado.</p>` +
      `<p>Da más confianza a los interesados en un mercado golpeado por estafas. Nosotros nunca almacenamos el documento: solo confirmamos.</p>` +
      cerrar(urlApp, "Cómo ganar mi sello →"),
  },
  {
    id: "renueva-vigencia",
    etiqueta: "Renueva tu vigencia",
    filtroSugerido: "por-vencer",
    asunto: "Tu anuncio está por vencer — renuévalo",
    cuerpoHtml: (nombre, urlApp) =>
      `<p>${saludo(nombre)},</p>` +
      `<p>Tu anuncio está por vencer. Renuévalo con un clic desde tu enlace privado para que siga visible.</p>` +
      `<p>Vender toma en promedio <strong>7 a 7,5 meses</strong>: mantén tu anuncio vivo mientras llega el comprador.</p>` +
      cerrar(urlApp, "Renovar mi anuncio →"),
  },
];

export function plantillaPorId(id: string): Plantilla | null {
  return PLANTILLAS.find((p) => p.id === id) ?? null;
}
