// «Invita a otro dueño» (C7). Copy honesto: atribución y crecimiento, sin escasez fabricada (no
// promete reservar cupos). Redactado en cada idioma, no traducido (S5).
import type { Arbol } from "@/i18n/textos";

export const REFERIDO = {
  titulo: { es: "Invita a otro dueño", en: "Invite another owner" },
  texto: {
    es: "Comparte tu enlace con otros dueños de Bogotá. Cada uno que publique con él se suma a tu red de fundadores.",
    en: "Share your link with other owners in Bogotá. Each one who lists through it joins your network of founding sellers.",
  },
  boton: { es: "Invitar por WhatsApp", en: "Invite on WhatsApp" },
  conteoUno: {
    es: "Ya se registró {n} dueño con tu enlace.",
    en: "{n} owner has already signed up with your link.",
  },
  conteoVarios: {
    es: "Ya se registraron {n} dueños con tu enlace.",
    en: "{n} owners have already signed up with your link.",
  },
} as const satisfies Arbol;
