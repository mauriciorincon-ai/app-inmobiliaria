// Alertas por correo (S9, maqueta 08, ADR 017). Los criterios de una búsqueda en palabras (los usan los correos
// y «Mis alertas»; la operación y el tipo salen del vocabulario común `COMUN.dominio` y los marcadores los
// rellena `engine/alertas/criterios.ts`) y las pantallas: Mis alertas, Nueva alerta y la baja en un clic.
// Un solo resumen al día a las 8:00 de Bogotá: la maqueta dibujaba también «en cuanto aparezca», que el G-Plan 1a
// no incluye. Innmobiliaria JAMÁS escribe por WhatsApp: las alertas son solo por correo.
import type { Arbol } from "@/i18n/textos";

export const ALERTAS = {
  criterios: {
    localidad: { es: "en {nombre}", en: "in {nombre}" },
    desde: { es: "desde {precio}", en: "from {precio}" },
    hasta: { es: "hasta {precio}", en: "up to {precio}" },
    habitaciones: { es: "{n}+ habitaciones", en: "{n}+ bedrooms" },
    zona: { es: "zona dibujada", en: "drawn area" },
    // Nombre por omisión de una alerta: «Apartamentos en Chapinero», «Búsqueda en zona dibujada».
    nombreTipoEn: { es: "{tipo} en {lugar}", en: "{tipo} in {lugar}" },
    nombreBusqueda: { es: "Mi búsqueda", en: "My search" },
    lugarZona: { es: "mi zona", en: "my area" },
    tiposPlural: {
      apartamento: { es: "Apartamentos", en: "Apartments" },
      casa: { es: "Casas", en: "Houses" },
      apartaestudio: { es: "Apartaestudios", en: "Studio apartments" },
      otro: { es: "Inmuebles", en: "Properties" },
    },
  },

  mias: {
    meta: {
      titulo: {
        es: "Alertas — Innmobiliaria",
        en: "Alerts — Innmobiliaria",
      },
    },
    titulo: { es: "Alertas", en: "Alerts" },
    bajada: {
      es: "Te escribimos cuando aparece lo que buscas o cuando baja de precio. Por correo, un resumen al día a las 8:00 (hora de Bogotá), solo si hay algo.",
      en: "We write to you when what you're looking for shows up or drops in price. By email, one digest a day at 8:00 (Bogotá time), only when there's something.",
    },
    cargando: { es: "Un momento…", en: "One moment…" },
    error: {
      es: "No pudimos cargar tus alertas. Recarga la página o inténtalo en un momento.",
      en: "We couldn't load your alerts. Reload the page or try again in a moment.",
    },
    estado: {
      activa: { es: "Activa", en: "On" },
      pausada: { es: "En pausa", en: "Paused" },
      sin_confirmar: { es: "Falta confirmar", en: "Needs confirming" },
    },
    sinConfirmar: {
      es: "Te enviamos un correo a {correo}. Ábrelo y toca «Confirmar»: hasta entonces no te avisamos de nada.",
      en: "We sent an email to {correo}. Open it and tap “Confirm”: until then we won't tell you anything.",
    },
    ultimo: {
      es: "En el último resumen: {nuevos} nuevos · {bajas} con baja de precio.",
      en: "In the latest digest: {nuevos} new · {bajas} price drops.",
    },
    nunca: {
      es: "Aún no te hemos enviado ningún resumen.",
      en: "We haven't sent you a digest yet.",
    },
    nuevos: {
      es: "Avisarme de anuncios nuevos",
      en: "Tell me about new listings",
    },
    bajas: {
      es: "Avisarme también si baja de precio",
      en: "Also tell me about price drops",
    },
    verResultados: { es: "Ver resultados", en: "See results" },
    pausar: { es: "Pausar", en: "Pause" },
    reanudar: { es: "Reanudar", en: "Resume" },
    borrar: { es: "Borrar", en: "Delete" },
    borrarConfirma: { es: "Sí, borrar la alerta", en: "Yes, delete the alert" },
    nueva: { es: "Nueva alerta", en: "New alert" },
    // Llegar por el enlace del correo NO confirma: hay que tocar el botón. Un escáner de correo que abra el enlace
    // y ejecute la página no puede suscribir a quien nunca pidió la alerta.
    porConfirmar: {
      titulo: { es: "Confirma tu correo", en: "Confirm your email" },
      texto: {
        es: "Toca el botón para empezar a recibir el resumen diario de esta alerta. Si no la pediste, no toques nada: sin confirmar no te escribimos.",
        en: "Tap the button to start getting this alert's daily digest. If you didn't ask for it, don't tap anything: until you confirm, we won't write to you.",
      },
      boton: { es: "Confirmar mi correo", en: "Confirm my email" },
      confirmando: { es: "Confirmando…", en: "Confirming…" },
    },
    confirmada: {
      titulo: { es: "Correo confirmado", en: "Email confirmed" },
      texto: {
        es: "Listo, «{nombre}» queda activa: te escribimos en el resumen del día cuando aparezca algo.",
        en: "Done, “{nombre}” is on: we'll write to you in the daily digest when something shows up.",
      },
    },
    confirmarError: {
      es: "Este enlace de confirmación ya no sirve. Crea la alerta de nuevo desde la búsqueda.",
      en: "This confirmation link no longer works. Create the alert again from the search.",
    },
    agregada: {
      es: "Abrimos tus alertas en este teléfono.",
      en: "We opened your alerts on this phone.",
    },
    borrada: { es: "Alerta borrada.", en: "Alert deleted." },
    vacio: {
      titulo: { es: "No tienes alertas", en: "You have no alerts" },
      texto: {
        es: "Busca en el mapa, dibuja tu zona y toca «Guardar como alerta». Te escribimos cuando aparezca algo.",
        en: "Search the map, draw your area and tap “Save as an alert”. We'll write when something shows up.",
      },
      boton: { es: "Ir a buscar", en: "Go search" },
    },
    errores: {
      sin_aviso: {
        es: "Deja al menos un aviso encendido, o borra la alerta.",
        en: "Keep at least one notice on, or delete the alert.",
      },
      servidor: {
        es: "No pudimos hacerlo. Inténtalo de nuevo en un momento.",
        en: "We couldn't do that. Try again in a moment.",
      },
    },
  },

  nueva: {
    meta: {
      titulo: {
        es: "Nueva alerta — Innmobiliaria",
        en: "New alert — Innmobiliaria",
      },
    },
    titulo: { es: "Crear una alerta", en: "Create an alert" },
    tuBusqueda: { es: "Tu búsqueda:", en: "Your search:" },
    nombre: { es: "Nombre de la alerta", en: "Alert name" },
    queAvisamos: { es: "Qué te avisamos", en: "What we tell you about" },
    nuevos: { es: "Anuncios nuevos", en: "New listings" },
    bajas: {
      es: "Bajas de precio en lo que coincide",
      en: "Price drops on matching listings",
    },
    frecuencia: {
      es: "Un resumen al día, a las 8:00 (hora de Bogotá), solo si hay algo.",
      en: "One digest a day, at 8:00 (Bogotá time), only when there's something.",
    },
    correo: { es: "Tu correo", en: "Your email" },
    correoAyuda: {
      es: "Te enviamos un enlace para confirmar que es tuyo. Cada correo trae cómo dejar de recibirlo.",
      en: "We'll send you a link to confirm it's yours. Every email shows how to stop receiving it.",
    },
    consentimiento: {
      es: "Acepto que Innmobiliaria guarde mi correo y los criterios de esta búsqueda para enviarme el resumen. Puedo dejar de recibirlo con un clic.",
      en: "I agree that Innmobiliaria keeps my email and this search's criteria to send me the digest. I can stop receiving it with one click.",
    },
    politica: { es: "Política de datos", en: "Data policy" },
    honeypot: { es: "No llenar", en: "Do not fill in" },
    soloCorreo: {
      es: "Te escribimos solo por correo; esta alerta nunca usa WhatsApp.",
      en: "We write to you by email only; this alert never uses WhatsApp.",
    },
    crear: { es: "Crear alerta", en: "Create alert" },
    creando: { es: "Creando…", en: "Creating…" },
    sinCriterios: {
      titulo: {
        es: "Primero elige qué buscas",
        en: "First choose what you're looking for",
      },
      texto: {
        es: "Una alerta necesita al menos un filtro: la operación, el tipo, la localidad, el precio, las habitaciones o una zona.",
        en: "An alert needs at least one filter: the deal type, property type, locality, price, bedrooms or an area.",
      },
      boton: { es: "Ir a buscar", en: "Go search" },
    },
    enviada: {
      titulo: { es: "Revisa tu correo", en: "Check your email" },
      texto: {
        es: "Te escribimos a {correo}. Abre el correo y toca «Confirmar»: hasta entonces no te avisamos de nada.",
        en: "We wrote to {correo}. Open the email and tap “Confirm”: until then we won't tell you anything.",
      },
      spam: {
        es: "Si no lo ves en unos minutos, mira en la carpeta de spam.",
        en: "If you don't see it in a few minutes, check your spam folder.",
      },
      verAlertas: { es: "Ver mis alertas", en: "See my alerts" },
    },
    errores: {
      nombre: {
        es: "Ponle un nombre a la alerta.",
        en: "Give the alert a name.",
      },
      correo: {
        es: "Escribe un correo válido.",
        en: "Enter a valid email address.",
      },
      avisos: {
        es: "Elige al menos un aviso.",
        en: "Pick at least one notice.",
      },
      consentimiento: {
        es: "Necesitamos tu autorización para guardar tu correo.",
        en: "We need your consent to keep your email.",
      },
      demasiadas_alertas: {
        es: "Ya creaste varias alertas con este correo hoy. Inténtalo mañana o borra alguna.",
        en: "You already created several alerts with this email today. Try tomorrow or delete one.",
      },
      sin_cupo: {
        es: "Hoy no podemos enviar más correos de alertas. Inténtalo mañana.",
        en: "We can't send more alert emails today. Try again tomorrow.",
      },
      no_configurado: {
        es: "Las alertas no están disponibles en este momento. Inténtalo más tarde.",
        en: "Alerts aren't available right now. Try again later.",
      },
      correo_no_enviado: {
        es: "Creamos la alerta, pero no pudimos enviarte el correo de confirmación. Inténtalo de nuevo en un momento.",
        en: "We created the alert, but we couldn't send you the confirmation email. Try again in a moment.",
      },
      servidor: {
        es: "No pudimos crear la alerta. Inténtalo de nuevo en un momento.",
        en: "We couldn't create the alert. Try again in a moment.",
      },
    },
  },

  baja: {
    meta: {
      titulo: {
        es: "Dejar de recibir avisos — Innmobiliaria",
        en: "Stop receiving alerts — Innmobiliaria",
      },
    },
    cargando: { es: "Un momento…", en: "One moment…" },
    listo: {
      titulo: {
        es: "Listo: no recibirás más avisos",
        en: "Done: you won't get more alerts",
      },
      texto: {
        es: "Cerramos la alerta «{nombre}». No te escribiremos más por ella.",
        en: "We closed the alert “{nombre}”. We won't write to you about it again.",
      },
    },
    invalido: {
      titulo: { es: "Este enlace no funciona", en: "This link doesn't work" },
      texto: {
        es: "Puede estar incompleto. Para dejar de recibir avisos, abre el enlace del último correo o entra a Alertas y borra la alerta.",
        en: "It may be incomplete. To stop receiving alerts, open the link in the latest email or go to Alerts and delete the alert.",
      },
    },
    error: {
      es: "No pudimos darte de baja ahora. Inténtalo de nuevo en un momento.",
      en: "We couldn't unsubscribe you right now. Try again in a moment.",
    },
    reintentar: { es: "Intentar de nuevo", en: "Try again" },
    verAlertas: { es: "Ir a Alertas", en: "Go to Alerts" },
  },
} as const satisfies Arbol;
