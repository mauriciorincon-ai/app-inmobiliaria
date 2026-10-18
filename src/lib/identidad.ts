// Adaptador de identidad (S8, ADR 016), con el patrón conmutable de `brevo.ts`, pero CERRADO por defecto:
//   · `IDENTIDAD_MOCK=1`            → simulador determinista (desarrollo, CI, e2e). No cuesta nada.
//   · `DIDIT_API_KEY` configurada   → Didit, el proveedor real (se ejerce en el ensayo general de H-2).
//   · ninguna de las dos            → «no disponible». Un simulador encendido por olvido daría el sello de
//                                     identificado a cualquiera: por eso sin llave NO se simula.
// El orden reservar → llamar → registrar lo impone `engine/identidad/flujo`. La cédula y la fecha viajan
// al proveedor dentro de esta función y se descartan; jamás se registran ni se guardan.
import type { DatosIdentidad } from "@/engine/identidad/datos";
import {
  identificar,
  type Reserva,
  type RespuestaIdentidad,
} from "@/engine/identidad/flujo";
import {
  formularioDidit,
  interpretarDidit,
  simular,
  URL_DIDIT,
  type ResultadoProveedor,
} from "@/engine/identidad/proveedor";
import { topesEfectivos } from "@/engine/identidad/topes";
import { crearClienteServicio } from "@/lib/supabase/servicio";

export type ModoIdentidad = "simulador" | "didit" | "apagado";

const ESPERA_MAXIMA_MS = 10_000;

export function modoIdentidad(): ModoIdentidad {
  if (process.env.IDENTIDAD_MOCK === "1") return "simulador";
  if (process.env.DIDIT_API_KEY) return "didit";
  return "apagado";
}

async function consultarDidit(
  datos: DatosIdentidad,
): Promise<ResultadoProveedor> {
  const formulario = new FormData();
  for (const [clave, valor] of Object.entries(formularioDidit(datos))) {
    formulario.append(clave, valor);
  }
  const res = await fetch(URL_DIDIT, {
    method: "POST",
    headers: {
      "x-api-key": process.env.DIDIT_API_KEY ?? "",
      accept: "application/json",
    },
    body: formulario,
    signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
  });
  const cuerpo: unknown = await res.json().catch(() => null);
  return interpretarDidit(res.status, cuerpo, datos.nombre);
}

/**
 * Identifica al comprador de una sesión verificada. Lanza solo si la base falla (la ruta lo convierte en
 * «no disponible»); el proveedor caído ya se traduce a `no_disponible` en el flujo.
 */
export async function identificarComprador(
  sesionHash: string,
  datos: DatosIdentidad,
): Promise<RespuestaIdentidad> {
  const modo = modoIdentidad();
  if (modo === "apagado") return "no_disponible";
  const supabase = crearClienteServicio();
  if (!supabase) return "no_disponible";
  const simulador = modo === "simulador";
  const topes = topesEfectivos(simulador, {
    dia: process.env.IDENTIDAD_TOPE_DIA,
    mes: process.env.IDENTIDAD_TOPE_MES,
  });

  return identificar(
    {
      reservar: async () => {
        const { data, error } = await supabase.rpc(
          "reservar_consulta_identidad",
          {
            p_sesion_hash: sesionHash,
            p_tope_mes: topes.mes,
            p_tope_dia: topes.dia,
            p_tope_comprador: topes.comprador,
          },
        );
        if (error || !data) throw new Error(error?.code ?? "reserva_vacia");
        return data as Reserva;
      },
      consultar: simulador ? async (d) => simular(d) : consultarDidit,
      registrar: async (consultaId, resultado) => {
        const { error } = await supabase.rpc("registrar_identificacion", {
          p_consulta_id: consultaId,
          p_resultado: resultado,
          p_proveedor: simulador ? "simulador" : "didit",
        });
        if (error) throw new Error(error.code ?? "registro");
      },
    },
    datos,
  );
}
