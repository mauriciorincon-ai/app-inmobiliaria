// Lo que las páginas de vivienda nueva leen en el servidor (S12, F2): la edición publicada que toca HOY, por la única RPC
// que el anónimo puede llamar (`nuevos_publicados`, lista blanca de columnas, solo ediciones publicadas). Un fallo de la
// base nunca tumba la página: se vuelve `error` y la pantalla lo dice. Ni el ingreso ni el arriendo del comprador pasan
// por aquí: ninguna petición los lleva.
import { hoyBogota } from "@/engine/agenda/bogota";
import type { TarifasEscrituracion } from "@/engine/vivienda-nueva/escrituracion";
import { deFila, type FilaProyecto } from "@/engine/vivienda-nueva/filas";
import type { EdicionLeida } from "@/engine/vivienda-nueva/vista";
import tarifas from "@/data/tarifas-escrituracion.json";
import { crearClienteAnon } from "@/lib/supabase/server";

/** Las tarifas de escrituración de este año, con su norma y su fecha (validadas en la CI por `vivienda-nueva-normas`). */
export const TARIFAS = tarifas as unknown as TarifasEscrituracion;

export type LecturaNuevos =
  | { estado: "ok"; leida: EdicionLeida }
  | { estado: "sin_publicar" }
  | { estado: "error" };

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * La fecha de hoy en Bogotá. Las pruebas la fijan con la cabecera `x-hoy-simulado` (regla 23: la fecha es una perilla,
 * nunca el reloj), que SOLO se respeta con `NUEVOS_SIMULACRO=1` (el job de e2e); en producción no existe.
 */
export function hoyNuevos(
  cabeceras: Pick<Headers, "get">,
  ahora: Date = new Date(),
): string {
  if (process.env.NUEVOS_SIMULACRO === "1") {
    const simulado = cabeceras.get("x-hoy-simulado");
    if (simulado && RE_FECHA.test(simulado)) return simulado;
  }
  return hoyBogota(ahora);
}

function esFila(x: unknown): x is FilaProyecto {
  const f = x as Partial<FilaProyecto> | null;
  return (
    typeof f === "object" &&
    f !== null &&
    typeof f.slug === "string" &&
    typeof f.clave === "string" &&
    Array.isArray(f.apariciones) &&
    Array.isArray(f.ilegibles) &&
    Array.isArray(f.en_conflicto) &&
    Array.isArray(f.rotulos)
  );
}

/** La edición que la base da para `hoy` (la vigente o, si ninguna, la última publicada), ya en la forma de los motores. */
export async function cargarNuevos(hoy: string): Promise<LecturaNuevos> {
  try {
    const { data, error } = await crearClienteAnon().rpc("nuevos_publicados", {
      p_hoy: hoy,
    });
    if (error) return { estado: "error" };
    if (data === null) return { estado: "sin_publicar" };
    if (!Array.isArray(data.proyectos) || !data.proyectos.every(esFila)) {
      return { estado: "error" };
    }
    return {
      estado: "ok",
      leida: {
        edicion: data.edicion,
        proyectos: data.proyectos.map((f) => ({ ...deFila(f), slug: f.slug })),
      },
    };
  } catch {
    return { estado: "error" };
  }
}
