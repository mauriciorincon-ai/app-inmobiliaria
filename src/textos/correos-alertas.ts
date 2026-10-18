// Correos de las alertas (S9, maqueta 08, ADR 017), en el idioma en que se creó la alerta. Dos correos: la
// confirmación (lo ÚNICO que sale antes de confirmar) y el resumen diario. Los dos llevan la baja en un clic.
// Los cuerpos son HTML propio (solo `<p>`, `<strong>`, `<s>`, `<a>`, `<br>`); los marcadores los pone el motor
// YA ESCAPADOS (`engine/alertas/correos.ts`). Redactados en cada idioma, no traducidos. Ningún correo lleva
// la dirección de un inmueble: la base no la entrega.
import type { Arbol } from "@/i18n/textos";

export const CORREOS_ALERTAS = {
  saludo: { es: "Hola,", en: "Hi there," },
  pie: {
    es: "Innmobiliaria — compra y vende directo con el dueño, sin intermediarios.",
    en: "Innmobiliaria — buy and sell directly with the owner, no middlemen.",
  },
  confirmacion: {
    asunto: {
      es: "Confirma tu alerta «{nombre}»",
      en: "Confirm your alert «{nombre}»",
    },
    cuerpo: {
      es: "<p>Alguien —ojalá tú— pidió recibir en este correo un resumen diario de Innmobiliaria con los anuncios nuevos y las bajas de precio de esta búsqueda:</p><p><strong>{criterios}</strong></p>",
      en: "<p>Someone —hopefully you— asked Innmobiliaria to send this address a daily digest of new listings and price drops for this search:</p><p><strong>{criterios}</strong></p>",
    },
    cta: { es: "Confirmar mi alerta →", en: "Confirm my alert →" },
    espera: {
      es: "<p>Hasta que la confirmes no te escribiremos nada más. El enlace sirve 7 días.</p>",
      en: "<p>We won't write again until you confirm. The link works for 7 days.</p>",
    },
    noFuiYo: {
      es: '<p>¿No la pediste? <a href="{baja}">Bórrala con un clic</a> y este correo no recibirá otra en 30 días.</p>',
      en: "<p>Didn't ask for this? <a href=\"{baja}\">Delete it in one click</a> and this address won't get another one for 30 days.</p>",
    },
  },
  resumen: {
    asunto: {
      nuevosUno: {
        es: "1 anuncio nuevo en «{nombre}»",
        en: "1 new listing in «{nombre}»",
      },
      nuevosVarios: {
        es: "{n} anuncios nuevos en «{nombre}»",
        en: "{n} new listings in «{nombre}»",
      },
      bajasUno: {
        es: "1 anuncio bajó de precio en «{nombre}»",
        en: "1 price drop in «{nombre}»",
      },
      bajasVarios: {
        es: "{n} anuncios bajaron de precio en «{nombre}»",
        en: "{n} price drops in «{nombre}»",
      },
      ambos: {
        es: "{n} nuevos y {m} con precio más bajo en «{nombre}»",
        en: "{n} new and {m} cheaper in «{nombre}»",
      },
    },
    intro: {
      es: "<p>Esto es lo nuevo en tu alerta <strong>«{nombre}»</strong> ({criterios}):</p>",
      en: "<p>Here's what's new in your alert <strong>«{nombre}»</strong> ({criterios}):</p>",
    },
    nuevos: { es: "Anuncios nuevos", en: "New listings" },
    bajas: { es: "Bajaron de precio", en: "Price drops" },
    lugar: {
      es: "{tipo} en {barrio} · {area} m²",
      en: "{tipo} in {barrio} · {area} m²",
    },
    verificado: { es: "⭐ Propietario verificado", en: "⭐ Verified owner" },
    mas: {
      es: "Y {n} más: míralos en el mapa.",
      en: "And {n} more: see them on the map.",
    },
    cta: { es: "Ver en el mapa →", en: "See on the map →" },
    porque: {
      es: '<p>Recibes esto porque creaste la alerta «{nombre}». Te llega un resumen al día, solo si hay algo nuevo. <a href="{baja}">Dejar de recibirla: un clic</a> · <a href="{gestionar}">Gestionar mis alertas</a></p>',
      en: '<p>You get this because you created the alert «{nombre}». One digest a day, only when there\'s something new. <a href="{baja}">Stop receiving it: one click</a> · <a href="{gestionar}">Manage my alerts</a></p>',
    },
  },
} as const satisfies Arbol;
