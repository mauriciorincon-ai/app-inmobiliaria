// Correos de la visita (S8, ADR 016). Innmobiliaria jamás escribe por WhatsApp: los avisos de la visita van
// por correo, cada uno en el idioma de quien lo recibe. NINGUNO lleva la dirección exacta: la da el dueño
// por WhatsApp. Los cuerpos son HTML propio (solo `<p>` y `<strong>`); los marcadores (`{comprador}`,
// `{dueno}`, `{inmueble}`, `{horario}`…) los pone el motor YA ESCAPADOS (`engine/visita/correos.ts`).
// Redactados en cada idioma, no traducidos. Las horas son siempre de Bogotá.
import type { Arbol } from "@/i18n/textos";

export const CORREOS_VISITA = {
  saludo: { es: "Hola {nombre}", en: "Hi {nombre}" },
  pie: {
    es: "Innmobiliaria — compra y vende directo con el dueño. La dirección exacta nunca va por correo.",
    en: "Innmobiliaria — buy and sell directly with the owner. The exact address never goes by email.",
  },
  inmueble: { es: "{tipo} en {barrio}", en: "{tipo} in {barrio}" },
  intencion: {
    vivir: { es: "para vivir", en: "to live in" },
    invertir: { es: "para invertir", en: "as an investment" },
  },
  zonaHoraria: { es: "hora de Bogotá", en: "Bogotá time" },
  cuando: {
    hoy: { es: "Hoy", en: "Today" },
    manana: { es: "Mañana", en: "Tomorrow" },
  },
  correos: {
    solicitudDueno: {
      asunto: {
        es: "{comprador} quiere visitar tu {inmueble}",
        en: "{comprador} would like to see your {inmueble}",
      },
      cuerpo: {
        es: "<p><strong>{comprador}</strong> pidió una visita a tu {inmueble}. Busca {intencion}.</p><p>Abre «Mi anuncio» con el enlace privado que te dimos al publicar: ahí ves su tarjeta y le propones hasta tres horarios.</p>",
        en: "<p><strong>{comprador}</strong> asked to visit your {inmueble}. They're looking {intencion}.</p><p>Open «My listing» with the private link we gave you when you listed it: you'll see their card there and can offer up to three times.</p>",
      },
      enEspera: {
        es: "<p>Pediste recibir solo a compradores identificados y {comprador} todavía no se identificó con su cédula: su solicitud quedó en espera. Si quieres, puedes aceptarla igual.</p>",
        en: "<p>You asked to welcome only ID-checked buyers and {comprador} hasn't checked their cédula yet, so the request is on hold. You can still accept it if you like.</p>",
      },
      cta: { es: "Abrir Mi anuncio →", en: "Open my listing →" },
    },
    solicitudComprador: {
      asunto: {
        es: "Pediste una visita: {inmueble}",
        en: "You asked for a viewing: {inmueble}",
      },
      cuerpo: {
        es: "<p>Le avisamos a {dueno}. Cuando proponga horarios te escribimos a este correo y eliges uno.</p><p>Guarda este correo: el botón abre tu solicitud desde cualquier teléfono o computador.</p>",
        en: "<p>We let {dueno} know. When they offer times we'll write to this email and you pick one.</p><p>Keep this email: the button opens your request from any phone or computer.</p>",
      },
      enEspera: {
        es: "<p>{dueno} recibe primero a compradores identificados, así que tu solicitud quedó en espera. Si te identificas con tu cédula, lo verá en tu tarjeta.</p>",
        en: "<p>{dueno} welcomes ID-checked buyers first, so your request is on hold. If you check your ID with your cédula, they'll see it on your card.</p>",
      },
      cta: { es: "Ver mi solicitud →", en: "See my request →" },
    },
    horarios: {
      asunto: {
        es: "{dueno} propuso horarios para tu visita",
        en: "{dueno} offered times for your viewing",
      },
      cuerpo: {
        es: "<p>{dueno} puede recibirte en su {inmueble} en estos horarios ({zona}):</p>",
        en: "<p>{dueno} can show you their {inmueble} at these times ({zona}):</p>",
      },
      cierre: {
        es: "<p>Elige uno, o dile que ninguno te sirve y te propondrá otros.</p>",
        en: "<p>Pick one, or tell them none of them work and they'll offer others.</p>",
      },
      cta: { es: "Elegir un horario →", en: "Pick a time →" },
    },
    ninguno: {
      asunto: {
        es: "{comprador} necesita otros horarios",
        en: "{comprador} needs other times",
      },
      cuerpo: {
        es: "<p>A {comprador} no le sirve ninguno de los horarios que propusiste para tu {inmueble}. Abre «Mi anuncio» y propón otros.</p>",
        en: "<p>None of the times you offered for your {inmueble} work for {comprador}. Open «My listing» and offer others.</p>",
      },
      cta: { es: "Abrir Mi anuncio →", en: "Open my listing →" },
    },
    confirmadaComprador: {
      asunto: {
        es: "Visita confirmada: {horario}",
        en: "Viewing confirmed: {horario}",
      },
      cuerpo: {
        es: "<p>Quedó confirmada tu visita al {inmueble} de {dueno}: <strong>{horario}</strong> ({zona}).</p><p>{dueno} te enviará la dirección exacta por WhatsApp. Desde tu solicitud puedes agregarla a tu calendario o cancelarla.</p>",
        en: "<p>Your viewing of {dueno}'s {inmueble} is confirmed: <strong>{horario}</strong> ({zona}).</p><p>{dueno} will send you the exact address on WhatsApp. From your request you can add it to your calendar or cancel it.</p>",
      },
      cta: { es: "Ver mi visita →", en: "See my viewing →" },
    },
    confirmadaDueno: {
      asunto: {
        es: "{comprador} confirmó la visita: {horario}",
        en: "{comprador} confirmed the viewing: {horario}",
      },
      cuerpo: {
        es: "<p>{comprador} eligió <strong>{horario}</strong> ({zona}) para visitar tu {inmueble}.</p><p>Envíale la dirección exacta por WhatsApp: en «Mi anuncio» tienes el botón para escribirle.</p>",
        en: "<p>{comprador} picked <strong>{horario}</strong> ({zona}) to see your {inmueble}.</p><p>Send them the exact address on WhatsApp: «My listing» has the button to message them.</p>",
      },
      cta: { es: "Abrir Mi anuncio →", en: "Open my listing →" },
    },
    canceladaParaComprador: {
      asunto: {
        es: "{dueno} canceló la visita",
        en: "{dueno} cancelled the viewing",
      },
      cuerpo: {
        es: "<p>{dueno} canceló la visita a su {inmueble} del {horario} ({zona}). Si te sigue interesando, puedes pedir otra desde el anuncio.</p>",
        en: "<p>{dueno} cancelled the viewing of their {inmueble} on {horario} ({zona}). If you're still interested, you can ask for another one from the listing.</p>",
      },
      cta: { es: "Ver el anuncio →", en: "See the listing →" },
    },
    canceladaParaDueno: {
      asunto: {
        es: "{comprador} canceló su visita",
        en: "{comprador} cancelled their viewing",
      },
      conHorario: {
        es: "<p>{comprador} canceló la visita a tu {inmueble} del {horario} ({zona}).</p>",
        en: "<p>{comprador} cancelled the viewing of your {inmueble} on {horario} ({zona}).</p>",
      },
      sinHorario: {
        es: "<p>{comprador} retiró su solicitud de visita a tu {inmueble}.</p>",
        en: "<p>{comprador} withdrew their request to see your {inmueble}.</p>",
      },
      cta: { es: "Abrir Mi anuncio →", en: "Open my listing →" },
    },
    rechazada: {
      asunto: {
        es: "{dueno} no puede recibirte",
        en: "{dueno} can't show you the property",
      },
      cuerpo: {
        es: "<p>{dueno} no puede recibirte en su {inmueble}. En la búsqueda hay más inmuebles de dueños directos.</p>",
        en: "<p>{dueno} can't show you their {inmueble}. There are more homes from direct owners in the search.</p>",
      },
      cta: { es: "Buscar inmuebles →", en: "Search homes →" },
    },
    recordatorioComprador: {
      asunto: {
        es: "{cuando} es tu visita: {hora}",
        en: "{cuando} is your viewing: {hora}",
      },
      cuerpo: {
        es: "<p>Te recordamos tu visita al {inmueble} de {dueno}: <strong>{horario}</strong> ({zona}).</p><p>Si aún no tienes la dirección, {dueno} te la envía por WhatsApp. Si no puedes ir, cancélala desde tu solicitud para avisarle.</p>",
        en: "<p>A reminder of your viewing of {dueno}'s {inmueble}: <strong>{horario}</strong> ({zona}).</p><p>If you don't have the address yet, {dueno} sends it to you on WhatsApp. If you can't make it, cancel from your request so they know.</p>",
      },
      cta: { es: "Ver mi visita →", en: "See my viewing →" },
    },
    recordatorioDueno: {
      asunto: {
        es: "{cuando} recibes a {comprador}: {hora}",
        en: "{cuando} you're showing your home to {comprador}: {hora}",
      },
      cuerpo: {
        es: "<p>Te recordamos que {comprador} visita tu {inmueble}: <strong>{horario}</strong> ({zona}).</p><p>Si aún no le enviaste la dirección, escríbele por WhatsApp desde «Mi anuncio». Después de la visita, marca si asistió.</p>",
        en: "<p>A reminder that {comprador} is coming to see your {inmueble}: <strong>{horario}</strong> ({zona}).</p><p>If you haven't sent the address yet, message them on WhatsApp from «My listing». After the viewing, mark whether they came.</p>",
      },
      cta: { es: "Abrir Mi anuncio →", en: "Open my listing →" },
    },
  },
} as const satisfies Arbol;
