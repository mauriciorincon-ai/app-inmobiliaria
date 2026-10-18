// Mensajes que la app arma para que OTRA persona los envíe: la invitación de referido que el fundador
// manda por WhatsApp y el mensaje de re-contacto que el operador manda al fundador. Cada mensaje sale
// en el idioma de quien lo recibe o lo emite según el caso (S5): la invitación, en el idioma de quien
// invita; el re-contacto, en el idioma guardado del vendedor (`vendedores.idioma`). Redactados en cada
// idioma, no traducidos; sin cifras no citables.
import type { Arbol } from "@/i18n/textos";

export const MENSAJES = {
  invitacion: {
    es: "Estoy publicando mi inmueble como fundador en Innmobiliaria — sin comisión. Publica el tuyo con mi enlace y aseguras tu cupo de fundador: {link}",
    en: "I'm listing my property as a founding seller on Innmobiliaria — no commission. List yours through my link and secure your founding spot: {link}",
  },
  recontacto: {
    // `{nombre}` es el primer nombre del vendedor, o «hola»/«there» si no lo hay.
    es: "Hola {nombre}, te saludamos de Innmobiliaria. Tu inmueble ya está publicado como fundador. Ahora puedes completarlo con fotos y descripción para que luzca mejor — entra desde este enlace (es solo tuyo, guárdalo): {link}",
    en: "Hi {nombre}, this is Innmobiliaria. Your property is already listed as a founding listing. You can now complete it with photos and a description so it looks its best — open it from this link (it's yours alone, keep it safe): {link}",
  },
  sinNombre: { es: "hola", en: "there" },
} as const satisfies Arbol;
