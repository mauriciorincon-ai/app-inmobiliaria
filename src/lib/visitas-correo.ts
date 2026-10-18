// Los avisos por correo de la visita (S8, ADR 016). Lee con la llave del servidor lo que ninguna RPC
// pública entrega (los correos de los dos y sus idiomas), arma los correos con el motor puro y los manda
// por Brevo. NUNCA lanza ni revierte nada: si un correo falla, la acción que lo provocó ya quedó hecha.
// Los registros llevan conteos, jamás correos, nombres ni tokens.
import {
  necesitaEnlaceComprador,
  planearCorreos,
  type DatosSolicitud,
  type EventoVisita,
} from "@/engine/visita/avisos";
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
    if (!token && datos.comprador.email && necesitaEnlaceComprador(evento)) {
      const r = await supabase.rpc("nuevo_enlace_visita", {
        p_solicitud_id: solicitudId,
      });
      token = r.data ?? null;
    }
    const base = urlApp();
    const ficha = `${base}/i/${datos.inmueble.slug}`;
    const correos = planearCorreos(
      evento,
      datos,
      {
        comprador: token ? enlaceVisita(token) : ficha,
        dueno: `${base}/mi-anuncio`,
        ficha,
        buscar: `${base}/buscar`,
      },
      new Date(),
    );
    let enviados = 0;
    let fallidos = 0;
    for (const correo of correos) {
      const r = await enviarCorreo(correo);
      if (r.ok) enviados++;
      else fallidos++;
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
