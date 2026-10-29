// El formulario del simulador (S10, maqueta 10) sin la pantalla: lo que la persona escribe (texto) → los números que
// entran a `simular`, y de vuelta. Puro. Los ingresos solo existen en el teléfono; lo que sale de aquí hacia un enlace
// es un PRECIO MÁXIMO, nunca los ingresos.
import { esEnteroEscrito, parsearCOP } from "@/engine/format/cop";
import type { Capacidad } from "./capacidad-local";
import {
  PLAZO_MAX_ANOS,
  PLAZO_MIN_ANOS,
  precioMaximo,
  type EntradaSimulador,
} from "./cuota";

/** Lo que la persona escribe, tal cual. */
export type CamposSimulador = {
  precio: string;
  /** En porcentaje del precio («30»). */
  inicial: string;
  /** Años. */
  plazo: string;
  /** Vacío = usar la tasa de referencia. */
  tasa: string;
  ingresos: string;
};

export const CAMPOS_INICIALES: CamposSimulador = {
  precio: "",
  inicial: "30",
  plazo: "20",
  tasa: "",
  ingresos: "",
};

/**
 * El precio más alto que acepta la búsqueda (el mismo `PRECIO_MAX` de `@/engine/busqueda/filtros`, que una prueba compara).
 * No se importa de allí: `filtros` arrastra zod y esta pieza viaja en la ficha pública.
 */
export const TOPE_PRECIO = 900_000_000_000;

/** Los plazos que ofrece la lista: de 5 a 30 años, de 5 en 5 (la norma da el mínimo y el máximo). */
export const PLAZOS: readonly number[] = Array.from(
  { length: (PLAZO_MAX_ANOS - PLAZO_MIN_ANOS) / 5 + 1 },
  (_, i) => PLAZO_MIN_ANOS + i * 5,
);

/** «14,5» o «14.5» → 14.5; null si no es un número decimal sencillo. */
export function parsearDecimal(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(limpio)) return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

export type OrigenTasa = "escrita" | "referencia" | "ninguna";

export type LecturaFormulario = {
  entrada: EntradaSimulador;
  /** La tasa que se aplica (la escrita o la de referencia), o null. */
  tasaEA: number | null;
  origenTasa: OrigenTasa;
  /** Los campos con algo escrito que no se pudo leer. */
  invalidos: ReadonlySet<keyof CamposSimulador>;
};

/** Lee los campos. Un campo ilegible no lanza: marca el campo y deja el número en NaN (o null) para que `simular` lo diga. */
export function leerFormulario(
  c: CamposSimulador,
  tasaReferencia: number | null,
): LecturaFormulario {
  const invalidos = new Set<keyof CamposSimulador>();

  const precio =
    c.precio.trim() !== "" && esEnteroEscrito(c.precio)
      ? (parsearCOP(c.precio) ?? Number.NaN)
      : Number.NaN;
  if (c.precio.trim() !== "" && Number.isNaN(precio)) invalidos.add("precio");

  const pct = parsearDecimal(c.inicial);
  const inicial = pct === null ? Number.NaN : pct / 100;
  if (Number.isNaN(inicial) || inicial < 0 || inicial >= 1) {
    invalidos.add("inicial");
  }

  const plazoAnos = /^\d{1,2}$/.test(c.plazo.trim())
    ? Number(c.plazo.trim())
    : Number.NaN;
  if (Number.isNaN(plazoAnos)) invalidos.add("plazo");

  let tasaEA: number | null = null;
  let origenTasa: OrigenTasa = "ninguna";
  if (c.tasa.trim() !== "") {
    const escrita = parsearDecimal(c.tasa);
    if (escrita !== null && escrita > 0 && escrita <= 60) {
      tasaEA = escrita;
      origenTasa = "escrita";
    } else {
      invalidos.add("tasa");
    }
  } else if (tasaReferencia !== null) {
    tasaEA = tasaReferencia;
    origenTasa = "referencia";
  }

  let ingresos: number | null = null;
  if (c.ingresos.trim() !== "") {
    if (esEnteroEscrito(c.ingresos)) ingresos = parsearCOP(c.ingresos);
    if (ingresos === null || ingresos <= 0) {
      ingresos = null;
      invalidos.add("ingresos");
    }
  }

  return {
    entrada: { precio, inicial, plazoAnos, tasaEA, ingresos },
    tasaEA,
    origenTasa,
    invalidos,
  };
}

/** ¿Lo escrito ya no dice un ingreso legible? Entonces la capacidad guardada se olvida (S16; antes solo al vaciar el campo, y un
 * ingreso ilegible dejaba vivo el de antes en la búsqueda y en «¿te alcanza?»). */
export function ingresoIlegible(
  c: CamposSimulador,
  tasaReferencia: number | null,
): boolean {
  return leerFormulario(c, tasaReferencia).entrada.ingresos === null;
}

/** Lo que se guarda en el teléfono, o null si todavía no hay ingresos o algo no se puede leer. */
export function capacidadDe(
  c: CamposSimulador,
  tasaReferencia: number | null,
): Capacidad | null {
  const { entrada, origenTasa } = leerFormulario(c, tasaReferencia);
  if (
    entrada.ingresos === null ||
    Number.isNaN(entrada.inicial) ||
    entrada.inicial < 0 ||
    entrada.inicial >= 1 ||
    Number.isNaN(entrada.plazoAnos) ||
    entrada.plazoAnos < PLAZO_MIN_ANOS ||
    entrada.plazoAnos > PLAZO_MAX_ANOS
  ) {
    return null;
  }
  return {
    ingresos: entrada.ingresos,
    inicial: entrada.inicial,
    plazoAnos: entrada.plazoAnos,
    // Solo la tasa que la persona escribió: la de referencia se vuelve a leer del día en cada visita.
    tasaEA: origenTasa === "escrita" ? entrada.tasaEA : null,
  };
}

/** Los campos con lo que había guardado en el teléfono (los demás quedan como estaban). */
export function camposDesdeCapacidad(
  base: CamposSimulador,
  cap: Capacidad | null,
): CamposSimulador {
  if (!cap) return base;
  return {
    ...base,
    ingresos: String(cap.ingresos),
    inicial: String(Math.round(cap.inicial * 1000) / 10),
    plazo: String(cap.plazoAnos),
    tasa: cap.tasaEA === null ? "" : String(cap.tasaEA),
  };
}

/** El precio máximo que se puede pagar con esos campos, redondeado HACIA ABAJO al millón (nunca promete de más). */
export function precioMaximoDe(
  c: CamposSimulador,
  tasaReferencia: number | null,
): number | null {
  const { entrada, tasaEA } = leerFormulario(c, tasaReferencia);
  const max = precioMaximo(
    entrada.ingresos,
    entrada.inicial,
    entrada.plazoAnos,
    tasaEA,
  );
  if (max === null) return null;
  const redondeado = Math.floor(max / 1_000_000) * 1_000_000;
  return redondeado > 0 ? Math.min(redondeado, TOPE_PRECIO) : null;
}

// Los enlaces se arman a mano, en el mismo orden fijo que `aParams` (op, max): una prueba comprueba que la búsqueda los
// lee como filtros. Solo llevan el precio máximo, jamás los ingresos.

/** `/buscar` con el precio máximo; `pago=1` hace que la página diga de dónde sale ese tope. */
export function enlaceBuscar(precioMax: number): string {
  return `/buscar?op=venta&max=${Math.round(precioMax)}&pago=1`;
}

/** La alerta nueva ya llena con el precio máximo. */
export function enlaceAlerta(precioMax: number): string {
  return `/alertas/nueva?op=venta&max=${Math.round(precioMax)}`;
}

/** La ficha manda a `/herramientas` con el precio del anuncio. */
export function enlaceCalculo(precio: number): string {
  return `/herramientas?precio=${Math.round(precio)}`;
}
