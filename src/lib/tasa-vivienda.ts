// El paso «tasa» del cron diario (S10, G-Plan 1a, ADR 018): lee UNA consulta agregada del conjunto abierto de la
// Superfinanciera y la guarda con su fecha de corte. Nunca tumba el cron: si la lectura falla, la interfaz sigue con la
// última guardada. El cliente de servicio llega por parámetro (lo crea la ruta del cron), así que este módulo no importa
// la llave del servidor. Con `TASA_SIMULACRO=1` (CI y pruebas) no sale a la red: usa una respuesta fija, o un fallo si la
// prueba lo pide, para que ningún e2e dependa de un tercero.
import { parsearTasa, urlConsultaTasa } from "@/engine/simulador/tasa";

export type ResultadoTasa =
  "guardada" | "sin_datos" | "fallo_red" | "fallo_base";

const TIEMPO_LIMITE_MS = 8_000;

/** Lo único que este paso necesita del cliente de servicio: la RPC que guarda la tasa. */
export type ClienteTasa = {
  rpc(
    fn: "guardar_tasa_vivienda",
    args: {
      p_fecha_corte: string;
      p_tasa_ea: number;
      p_creditos: number;
      p_entidades: number;
      p_fuente: string;
    },
  ): PromiseLike<{ error: unknown }>;
};

/** La respuesta fija del simulacro: la misma forma que devuelve el conjunto. */
export const RESPUESTA_SIMULACRO = [
  {
    fecha_corte: "2026-10-09T00:00:00.000",
    tasa: "15.4801495470544664",
    creditos: "686",
    entidades: "13",
  },
];

/** `x-tasa-simulacro: fallo` solo se respeta con `TASA_SIMULACRO=1`. */
export function fetchDeTasa(modoPrueba: string | null): typeof fetch {
  if (process.env.TASA_SIMULACRO !== "1") return fetch;
  return async () =>
    modoPrueba === "fallo"
      ? new Response("no disponible", { status: 503 })
      : Response.json(RESPUESTA_SIMULACRO);
}

export async function actualizarTasa(
  supabase: ClienteTasa,
  fetchFn: typeof fetch = fetch,
): Promise<ResultadoTasa> {
  let cuerpo: unknown;
  try {
    const res = await fetchFn(urlConsultaTasa(), {
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
      headers: { accept: "application/json" },
    });
    if (!res.ok) return "fallo_red";
    cuerpo = await res.json();
  } catch {
    return "fallo_red";
  }
  const tasa = parsearTasa(cuerpo);
  if (!tasa) return "sin_datos";
  try {
    const { error } = await supabase.rpc("guardar_tasa_vivienda", {
      p_fecha_corte: tasa.fechaCorte,
      p_tasa_ea: tasa.tasaEA,
      p_creditos: tasa.creditos,
      p_entidades: tasa.entidades,
      p_fuente: tasa.fuente,
    });
    return error ? "fallo_base" : "guardada";
  } catch {
    // La promesa de la RPC puede rechazarse (red caída): el paso «tasa» jamás tumba la corrida.
    return "fallo_base";
  }
}
