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
  franja: {
    entre_semana: { es: "entre semana", en: "on weekdays" },
    sabado: { es: "el sábado", en: "on Saturday" },
    domingo: { es: "el domingo", en: "on Sunday" },
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
        es: "<p>Tu solicitud ya está con {dueno}. Cuando proponga horarios te escribimos a este correo y eliges uno.</p><p>Guarda este correo: el botón abre tu solicitud desde cualquier teléfono o computador.</p>",
        en: "<p>Your request is now with {dueno}. When they offer times we'll write to this email and you pick one.</p><p>Keep this email: the button opens your request from any phone or computer.</p>",
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

  // S13 — la visita a la sala de ventas de un proyecto nuevo. Mientras la constructora no esté en la plataforma, el equipo de
  // Innmobiliaria coordina con la sala: solo el comprador recibe correo (el equipo trabaja desde su panel). Ninguno lleva la
  // dirección ni el teléfono de la sala: la dirección la manda el equipo por WhatsApp, a mano.
  // S16 (deuda del S13): el operador coordina la visita a la sala y nadie le avisaba de una solicitud nueva; el plazo de dos días
  // hábiles corría sin que lo supiera. Lleva solo el proyecto y la franja: ningún dato del comprador viaja en este correo.
  operadorSala: {
    asunto: {
      es: "Nueva visita a una sala: {proyecto}",
      en: "New sales-room visit: {proyecto}",
    },
    cuerpo: {
      es: "<p>Un comprador verificado pidió visitar la sala de ventas de <strong>{proyecto}</strong> ({franja}).</p><p>Tienes dos días hábiles para escribirle a la sala y proponerle horarios desde el panel.</p>",
      en: "<p>A verified buyer asked to visit the sales room of <strong>{proyecto}</strong> ({franja}).</p><p>You have two business days to contact the room and offer times from the panel.</p>",
    },
    cta: { es: "Abrir las salas del panel →", en: "Open the panel's sales rooms →" },
  },
  sala: {
    solicitud: {
      asunto: {
        es: "Pediste una visita a {proyecto}",
        en: "You asked to visit {proyecto}",
      },
      cuerpo: {
        es: "<p>Recibimos tu solicitud para visitar la sala de ventas de <strong>{proyecto}</strong> ({franja}).</p><p>Le escribimos a la sala y te proponemos horarios. Si en dos días hábiles no responden, te avisamos por este correo.</p><p>Guarda este correo: el botón abre tu solicitud desde cualquier teléfono o computador.</p>",
        en: "<p>We got your request to visit the sales room of <strong>{proyecto}</strong> ({franja}).</p><p>We will contact the room and offer you times. If they do not answer within two business days, we will tell you in this email.</p><p>Keep this email: the button opens your request from any phone or computer.</p>",
      },
      cta: { es: "Ver mi solicitud →", en: "See my request →" },
    },
    horarios: {
      asunto: {
        es: "Horarios para tu visita a {proyecto}",
        en: "Times for your visit to {proyecto}",
      },
      cuerpo: {
        es: "<p>La sala de ventas de <strong>{proyecto}</strong> puede recibirte en estos horarios ({zona}):</p>",
        en: "<p>The sales room of <strong>{proyecto}</strong> can see you at these times ({zona}):</p>",
      },
      cierre: {
        es: "<p>Elige uno, o dinos que ninguno te sirve y pedimos otros.</p>",
        en: "<p>Pick one, or tell us none of them work and we will ask for others.</p>",
      },
      cta: { es: "Elegir un horario →", en: "Pick a time →" },
    },
    confirmada: {
      asunto: {
        es: "Visita confirmada: {horario}",
        en: "Visit confirmed: {horario}",
      },
      cuerpo: {
        es: "<p>Quedó confirmada tu visita a la sala de ventas de <strong>{proyecto}</strong>: <strong>{horario}</strong> ({zona}).</p><p>Innmobiliaria te envía la dirección de la sala por WhatsApp. Desde tu solicitud puedes agregarla a tu calendario o cancelarla.</p>",
        en: "<p>Your visit to the sales room of <strong>{proyecto}</strong> is confirmed: <strong>{horario}</strong> ({zona}).</p><p>Innmobiliaria sends you the sales room's address on WhatsApp. From your request you can add it to your calendar or cancel it.</p>",
      },
      cta: { es: "Ver mi visita →", en: "See my visit →" },
    },
    cancelada: {
      asunto: {
        es: "Se canceló tu visita a {proyecto}",
        en: "Your visit to {proyecto} was cancelled",
      },
      cuerpo: {
        es: "<p>Tuvimos que cancelar tu visita a la sala de ventas de <strong>{proyecto}</strong> del {horario} ({zona}). Si te sigue interesando, puedes pedir otra desde la ficha del proyecto.</p>",
        en: "<p>We had to cancel your visit to the sales room of <strong>{proyecto}</strong> on {horario} ({zona}). If you are still interested, you can ask for another from the project sheet.</p>",
      },
      cta: { es: "Ver el proyecto →", en: "See the project →" },
    },
    rechazada: {
      asunto: {
        es: "No pudimos concretar tu visita a {proyecto}",
        en: "We could not arrange your visit to {proyecto}",
      },
      cuerpo: {
        es: "<p>No logramos concretar la visita a la sala de ventas de <strong>{proyecto}</strong>. En la edición hay más proyectos: puedes verlos y pedir otra visita.</p>",
        en: "<p>We could not arrange the visit to the sales room of <strong>{proyecto}</strong>. The edition has more projects: you can browse them and ask for another visit.</p>",
      },
      cta: { es: "Ver vivienda nueva →", en: "See new homes →" },
    },
    recordatorio: {
      asunto: {
        es: "{cuando} es tu visita: {hora}",
        en: "{cuando} is your visit: {hora}",
      },
      cuerpo: {
        es: "<p>Te recordamos tu visita a la sala de ventas de <strong>{proyecto}</strong>: <strong>{horario}</strong> ({zona}).</p><p>Si aún no tienes la dirección, Innmobiliaria te la envía por WhatsApp. Si no puedes ir, cancélala desde tu solicitud para avisarnos.</p>",
        en: "<p>A reminder of your visit to the sales room of <strong>{proyecto}</strong>: <strong>{horario}</strong> ({zona}).</p><p>If you do not have the address yet, Innmobiliaria sends it to you on WhatsApp. If you cannot make it, cancel from your request so we know.</p>",
      },
      cta: { es: "Ver mi visita →", en: "See my visit →" },
    },
    sinRespuesta: {
      asunto: {
        es: "Aún sin respuesta de la sala de {proyecto}",
        en: "No answer yet from the sales room of {proyecto}",
      },
      cuerpo: {
        es: "<p>Pasaron dos días hábiles y la sala de ventas de <strong>{proyecto}</strong> todavía no responde a tu solicitud.</p><p>Tu solicitud sigue abierta: en cuanto tengamos horarios de la sala te escribimos a este correo. Si ya no te interesa, puedes retirarla desde el botón.</p>",
        en: "<p>Two business days have passed and the sales room of <strong>{proyecto}</strong> has not answered your request yet.</p><p>Your request is still open: as soon as we have times from the room we will write to this email. If you are no longer interested, you can withdraw it from the button.</p>",
      },
      cta: { es: "Ver mi solicitud →", en: "See my request →" },
    },
  },
} as const satisfies Arbol;
