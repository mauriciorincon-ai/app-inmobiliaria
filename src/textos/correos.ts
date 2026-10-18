// Correos de campaña por lotes (C8). Cada vendedor recibe el suyo en el idioma que guardó al publicar
// (`vendedores.idioma`). Redactados en cada idioma, no traducidos; cifras EXCLUSIVAMENTE citables
// (comisión 3 % · fotos 89 vs 123 días, Redfin · CTL $23.000, SNR · 7–7,5 meses de venta). En inglés, el
// término local se nombra y se explica en una línea.
//
// Los cuerpos son HTML propio (solo `<p>`, `<strong>`): `{nombre}` y `{url}` los pone el motor ya
// ESCAPADOS, jamás se concatena texto del vendedor sin escapar (`engine/envios/plantillas.ts`).
import type { Arbol } from "@/i18n/textos";

export const CORREOS = {
  saludo: {
    conNombre: { es: "Hola {nombre}", en: "Hi {nombre}" },
    sinNombre: { es: "Hola", en: "Hi" },
  },
  pie: {
    es: "Innmobiliaria — vende tu casa directo, sin comisión.",
    en: "Innmobiliaria — sell your home direct, with no commission.",
  },
  plantillas: {
    "completa-anuncio": {
      etiqueta: {
        es: "Completa tu anuncio (fotos)",
        en: "Complete your listing (photos)",
      },
      asunto: {
        es: "Tu anuncio luce mejor con fotos",
        en: "Your listing looks better with photos",
      },
      cuerpo: {
        es: "<p>Los inmuebles con buenas fotos se venden más rápido: <strong>89 días en el mercado frente a 123</strong> sin buenas fotos (Redfin).</p><p>Abre tu anuncio con el enlace privado que te dimos al publicar y súbele fotos desde el teléfono.</p>",
        en: "<p>Properties with good photos sell faster: <strong>89 days on the market versus 123</strong> without good photos (Redfin).</p><p>Open your listing with the private link we gave you when you listed it, and upload photos from your phone.</p>",
      },
      cta: {
        es: "Completar mi anuncio →",
        en: "Complete my listing →",
      },
    },
    "gana-sello": {
      etiqueta: {
        es: "Gana tu sello ⭐ (verificación)",
        en: "Earn your ⭐ seal (verification)",
      },
      asunto: {
        es: "Gana tu sello de propietario verificado ⭐",
        en: "Earn your verified-owner seal ⭐",
      },
      cuerpo: {
        es: "<p>Saca tu <strong>Certificado de Tradición y Libertad</strong> (cuesta <strong>$23.000</strong> en línea, emisión inmediata) y gana el sello ⭐ de propietario verificado.</p><p>Da más confianza a los interesados en un mercado golpeado por estafas. Nosotros nunca almacenamos el documento: solo confirmamos.</p>",
        en: "<p>Get your <strong>Certificado de Tradición y Libertad</strong> (CTL, the official record of who owns a property; it costs <strong>COP 23,000</strong> online and is issued immediately) and earn the ⭐ verified-owner seal.</p><p>It gives interested people more confidence in a market hit by scams. We never store the document: we only confirm it.</p>",
      },
      cta: { es: "Cómo ganar mi sello →", en: "How to earn my seal →" },
    },
    "renueva-vigencia": {
      etiqueta: { es: "Renueva tu vigencia", en: "Renew your listing" },
      asunto: {
        es: "Tu anuncio está por vencer — renuévalo",
        en: "Your listing is about to expire — renew it",
      },
      cuerpo: {
        es: "<p>Tu anuncio está por vencer. Renuévalo con un clic desde tu enlace privado para que siga visible.</p><p>Vender toma en promedio <strong>7 a 7,5 meses</strong>: mantén tu anuncio vivo mientras llega el comprador.</p>",
        en: "<p>Your listing is about to expire. Renew it with one click from your private link so it stays visible.</p><p>Selling takes <strong>7 to 7.5 months</strong> on average: keep your listing live until the buyer arrives.</p>",
      },
      cta: { es: "Renovar mi anuncio →", en: "Renew my listing →" },
    },
  },
} as const satisfies Arbol;
