// Las alertas por correo con la llave del servidor (S9, ADR 017). Dos cosas, nada más:
//   · crear una alerta (`crear_alerta` es SOLO del servidor: devuelve el token de confirmar, que va únicamente
//     por correo) y mandar la confirmación;
//   · el resumen diario del cron: la base RECLAMA los resúmenes (a lo sumo uno por alerta y día, con cupo) y
//     aquí se arman y se envían.
// NUNCA lanza: un correo que falla no revierte nada. Los registros llevan conteos, jamás correos ni tokens.
import { armarConfirmacion, armarResumen } from "@/engine/alertas/correos";
import {
  aArgsCriterios,
  enlaceBusqueda,
  filtrosDeAlerta,
  resumenCriterios,
} from "@/engine/alertas/criterios";
import { correoDisponible, topeCorreosAlerta } from "@/engine/alertas/topes";
import type { Filtros } from "@/engine/busqueda/filtros";
import type { ErrorRpc } from "@/engine/visita/errores";
import type { Idioma } from "@/i18n/idiomas";
import { brevoEnMock, enviarCorreo } from "@/lib/brevo";
import { keyThumb, urlPublicaFoto } from "@/lib/fotos-url";
import { reportError } from "@/lib/observability";
import { crearClienteServicio } from "@/lib/supabase/servicio";

function urlApp(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
}

/** Los dos enlaces de la baja: la página (cuerpo del correo) y el POST de un clic (cabecera). */
export function enlacesDeBaja(token: string) {
  const base = urlApp();
  return {
    baja: `${base}/baja#t=${token}`,
    bajaPost: `${base}/api/alertas/baja?t=${token}`,
  };
}

/**
 * El tope de correos de alerta de hoy. En simulacro (CI y pruebas) se puede cambiar con `ALERTAS_TOPE_DIA`, o
 * por petición con `forzado` (solo el cron autorizado lo pasa); con Brevo real, siempre el de producción.
 */
export function topeHoy(forzado?: string | null): number {
  return topeCorreosAlerta(
    brevoEnMock(),
    forzado ?? process.env.ALERTAS_TOPE_DIA,
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Limitar UNA corrida del cron a una sola alerta. Solo con el simulacro explícito (`BREVO_MOCK=1`: CI y pruebas):
 * así una prueba del cron no se lleva los resúmenes de las alertas de otras pruebas que corren a la vez. Con el
 * servicio real jamás se respeta.
 */
export function alertaDeSimulacro(valor?: string | null): string | undefined {
  if (process.env.BREVO_MOCK !== "1" || !valor) return undefined;
  return UUID.test(valor) ? valor : undefined;
}

export type EntradaAlerta = {
  email: string;
  idioma: Idioma;
  nombre: string;
  filtros: Filtros;
  nuevos: boolean;
  bajas: boolean;
  consentimiento: boolean;
  ipHash: string;
};

export type ResultadoCrear =
  | { ok: true; gestionar: string; enviado: boolean }
  | { ok: false; error: ErrorRpc | null };

// Sin correo de verdad (sin llave de Brevo y sin el simulacro explícito) las alertas no operan: ni se crean ni
// se reclaman, porque `enviarCorreo` daría por enviado lo que nadie va a recibir.
function hayCorreo(): boolean {
  return correoDisponible(process.env.BREVO_MOCK, process.env.BREVO_API_KEY);
}

export async function crearAlertaYConfirmar(
  e: EntradaAlerta,
): Promise<ResultadoCrear> {
  const supabase = crearClienteServicio();
  if (!supabase || !hayCorreo()) return { ok: false, error: null };
  const { data, error } = await supabase.rpc("crear_alerta", {
    p_email: e.email,
    p_idioma: e.idioma,
    p_nombre: e.nombre,
    ...aArgsCriterios(e.filtros),
    p_avisar_nuevos: e.nuevos,
    p_avisar_bajas: e.bajas,
    p_consentimiento: e.consentimiento,
    p_ip_hash: e.ipHash,
    p_tope: topeHoy(),
  });
  if (error || !data) return { ok: false, error: error ?? {} };

  try {
    const correo = armarConfirmacion(
      { nombre: e.nombre, criterios: resumenCriterios(e.filtros, e.idioma) },
      {
        confirmar: `${urlApp()}/alertas#c=${data.confirmar}`,
        ...enlacesDeBaja(data.baja),
      },
      e.idioma,
    );
    const r = await enviarCorreo({
      para: { email: e.email, nombre: "" },
      ...correo,
    });
    return { ok: true, gestionar: data.gestionar, enviado: r.ok };
  } catch {
    reportError("alerta_confirmacion_error", {});
    return { ok: true, gestionar: data.gestionar, enviado: false };
  }
}

export type ResultadoResumenes = {
  enviados: number;
  fallidos: number;
  diferidas: number;
  sin_novedad: number;
};

/** El paso «resúmenes» del trabajo diario. null si la base falló (el cron lo reporta). */
export async function enviarResumenes(
  tope: number,
  soloAlerta?: string,
): Promise<ResultadoResumenes | null> {
  const supabase = crearClienteServicio();
  if (!supabase) return null;
  if (!hayCorreo()) {
    reportError("cron_resumenes_sin_correo", {});
    return null;
  }
  const { data, error } = await supabase.rpc("reclamar_resumenes", {
    p_tope: tope,
    ...(soloAlerta ? { p_alerta: soloAlerta } : {}),
  });
  if (error || !data) {
    reportError("cron_resumenes_error", { code: error?.code ?? "sin_datos" });
    return null;
  }
  const base = urlApp();
  const fotos = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "") !== "";
  let enviados = 0;
  let fallidos = 0;
  for (const a of data.alertas) {
    try {
      const f = filtrosDeAlerta(a);
      const correo = armarResumen(
        {
          nombre: a.nombre,
          criterios: resumenCriterios(f, a.idioma),
          nuevos: a.nuevos,
          bajas: a.bajas,
          totalNuevos: a.total_nuevos,
          totalBajas: a.total_bajas,
        },
        {
          mapa: enlaceBusqueda(base, f),
          gestionar: `${base}/alertas#t=${a.token_gestionar}`,
          ...enlacesDeBaja(a.token_baja),
          ficha: (slug) => `${base}/i/${slug}`,
          foto: (key) => (fotos ? urlPublicaFoto(keyThumb(key)) : null),
        },
        a.idioma,
      );
      const r = await enviarCorreo({
        para: { email: a.email, nombre: "" },
        ...correo,
      });
      if (r.ok) enviados++;
      else fallidos++;
    } catch {
      fallidos++;
    }
  }
  if (fallidos > 0) reportError("cron_resumen_envio_error", { fallidos });
  return {
    enviados,
    fallidos,
    diferidas: data.diferidas,
    sin_novedad: data.sin_novedad,
  };
}
