// Los avisos por correo de la visita (S8, ADR 016). Lee con la llave del servidor lo que ninguna RPC
// pública entrega (los correos de los dos y sus idiomas), arma los correos con el motor puro y los manda
// por Brevo. NUNCA lanza ni revierte nada: si un correo falla, la acción que lo provocó ya quedó hecha.
// Los registros llevan conteos, jamás correos, nombres ni tokens.
import {
  esDeSala,
  necesitaEnlaceComprador,
  planearCorreos,
  type DatosSolicitud,
  type EventoVisita,
} from "@/engine/visita/avisos";
import { armarAvisoOperadorSala } from "@/engine/visita/correos";
import { IDIOMA_POR_DEFECTO } from "@/i18n/idiomas";
import { enviarCorreo } from "@/lib/brevo";
import { crearClienteServicio } from "@/lib/supabase/servicio";
import { reportError } from "@/lib/observability";

export type ResultadoAviso = { enviados: number; fallidos: number };

const NADA: ResultadoAviso = { enviados: 0, fallidos: 0 };

function urlApp(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
}

/** El enlace del comprador a su solicitud. El token va en el fragmento: no viaja en ninguna petición. */
export function enlaceVisita(token: string): string {
  return `${urlApp()}/visita#t=${token}`;
}

export async function avisarVisita(
  evento: EventoVisita,
  solicitudId: string,
  opciones: { tokenComprador?: string } = {},
): Promise<ResultadoAviso> {
  try {
    const supabase = crearClienteServicio();
    if (!supabase) return NADA;
    const { data } = await supabase.rpc("datos_correo_visita", {
      p_solicitud_id: solicitudId,
    });
    if (!data) return NADA;
    const datos = data as DatosSolicitud;

    let token = opciones.tokenComprador ?? null;
    if (
      !token &&
      datos.comprador.email &&
      necesitaEnlaceComprador(evento, esDeSala(datos))
    ) {
      const r = await supabase.rpc("nuevo_enlace_visita", {
        p_solicitud_id: solicitudId,
      });
      token = r.data ?? null;
    }
    const base = urlApp();
    // Una sala de ventas lleva a la ficha del proyecto nuevo y a la búsqueda de «Nuevos»; un anuncio, a su ficha.
    const deSala = esDeSala(datos);
    const ficha = deSala
      ? `${base}/nuevos/${datos.proyecto.slug}`
      : `${base}/i/${datos.inmueble.slug}`;
    const correos = planearCorreos(
      evento,
      datos,
      {
        comprador: token ? enlaceVisita(token) : ficha,
        dueno: `${base}/mi-anuncio`,
        ficha,
        buscar: deSala ? `${base}/buscar?v=nuevos` : `${base}/buscar`,
      },
      new Date(),
    );
    let enviados = 0;
    let fallidos = 0;
    // Una solicitud nueva a una sala: el operador la coordina, así que también le llega un aviso (S16). Sin datos del comprador.
    const operador = process.env.OPERADOR_EMAIL?.trim();
    if (evento === "solicitud" && deSala && operador) {
      const { asunto, html } = armarAvisoOperadorSala(
        { proyecto: datos.proyecto.nombre, franja: datos.proyecto.franja },
        IDIOMA_POR_DEFECTO,
        `${base}/operador/salas`,
      );
      correos.push({ para: { email: operador, nombre: "" }, asunto, html });
    }
    for (const correo of correos) {
      const r = await enviarCorreo(correo);
      if (r.ok) enviados++;
      else fallidos++;
    }
    // S9 (ADR 017): el cupo diario de correos es uno para todo; los de la visita se CUENTAN (para que las
    // alertas cedan el sitio), jamás se bloquean. Si contar falla, el correo ya salió: no pasa nada.
    if (enviados > 0) {
      await supabase.rpc("sumar_correos_dia", {
        p_clase: "visita",
        p_n: enviados,
      });
    }
    return { enviados, fallidos };
  } catch {
    // Un correo que falla no revierte la acción, pero tampoco puede pasar en silencio.
    reportError("aviso_visita_error", { evento });
    return NADA;
  }
}

/** De qué solicitud es el token del comprador (para avisarle al dueño). */
export async function solicitudDeToken(token: string): Promise<string | null> {
  const supabase = crearClienteServicio();
  if (!supabase) return null;
  const { data } = await supabase.rpc("solicitud_de_token", { p_token: token });
  return data ?? null;
}
