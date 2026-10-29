// Lo que las páginas de vivienda nueva leen en el servidor (S12, F2): la edición publicada que toca HOY, por la única RPC
// que el anónimo puede llamar (`nuevos_publicados`, lista blanca de columnas, solo ediciones publicadas), y desde el S13
// el área y el precio de los apartamentos usados en venta (`usados_para_comparar`, sin slug). Un fallo de la base nunca
// tumba la página: se vuelve `error` (o `null`) y la pantalla lo dice. Ni el ingreso ni el arriendo del comprador pasan
// por aquí: ninguna petición los lleva.
import { hoyBogota } from "@/engine/agenda/bogota";
import {
  tarifasDelAnio,
  type TarifasEscrituracion,
} from "@/engine/vivienda-nueva/escrituracion";
import { deFila, type FilaProyecto } from "@/engine/vivienda-nueva/filas";
import type { Subsidios } from "@/engine/vivienda-nueva/normas";
import type { UsadoParaComparar } from "@/engine/vivienda-nueva/nuevo-o-usado";
import type { EdicionLeida } from "@/engine/vivienda-nueva/vista";
import subsidios from "@/data/subsidios-vivienda.json";
import tarifas from "@/data/tarifas-escrituracion.json";
import { crearClienteAnon } from "@/lib/supabase/server";

/** Las tarifas de escrituración de este año, con su norma y su fecha (validadas en la CI por `vivienda-nueva-normas`). */
export const TARIFAS = tarifas as unknown as TarifasEscrituracion;

/** Las tarifas como valen a `hoy`: pasado su año, el registro y la notaría se nombran sin monto (S16). */
export function tarifasPara(hoy: string): TarifasEscrituracion {
  return tarifasDelAnio(TARIFAS, hoy);
}

/** Los programas de subsidio, con su norma, su estado y su fecha (validados en la CI por `vivienda-nueva-normas`). */
export const SUBSIDIOS = subsidios as unknown as Subsidios;

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

const esUsado = (x: unknown): x is UsadoParaComparar => {
  const u = x as Partial<UsadoParaComparar> | null;
  return (
    typeof u === "object" &&
    u !== null &&
    typeof u.area_m2 === "number" &&
    u.area_m2 > 0 &&
    typeof u.precio_esperado === "number" &&
    u.precio_esperado > 0
  );
};

/**
 * Los apartamentos usados en venta que hoy se ven en la búsqueda: solo área y precio (`usados_para_comparar`). `null` si la
 * base no responde o responde algo que no se entiende: la pantalla dice «no disponible», jamás «0 usados».
 */
export async function cargarUsados(): Promise<UsadoParaComparar[] | null> {
  try {
    const { data, error } = await crearClienteAnon().rpc(
      "usados_para_comparar",
      { p_operacion: "venta", p_tipo: "apartamento" },
    );
    if (error || !Array.isArray(data) || !data.every(esUsado)) return null;
    return data;
  } catch {
    return null;
  }
}
