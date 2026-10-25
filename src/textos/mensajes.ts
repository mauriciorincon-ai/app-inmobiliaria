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
  // S15 — lo que el operador le escribe al dueño desde la cola antifraude. Sin acusar: dice qué pasa y qué sigue.
  // `{nombre}` es el primer nombre; `{inmueble}`, «tu apartamento en El Retiro».
  pedirCtl: {
    es: "Hola {nombre}, te saludamos de Innmobiliaria. Para mantener al día el anuncio de {inmueble}, ¿nos muestras un certificado de tradición y libertad expedido hace 30 días o menos? Lo vemos y no lo guardamos.",
    en: "Hi {nombre}, this is Innmobiliaria. To keep the listing for {inmueble} up to date, could you show us a title record issued 30 days ago or less? We look at it and don't keep it.",
  },
  pausa: {
    es: "Hola {nombre}, te saludamos de Innmobiliaria. Pausamos el anuncio de {inmueble} mientras revisamos unos datos: mientras tanto no aparece en la búsqueda. Respóndenos por aquí y lo resolvemos contigo.",
    en: "Hi {nombre}, this is Innmobiliaria. We've paused the listing for {inmueble} while we check a few details: in the meantime it doesn't show in search. Reply here and we'll sort it out with you.",
  },
  inmueble: { es: "tu {tipo} en {barrio}", en: "your {tipo} in {barrio}" },
} as const satisfies Arbol;
