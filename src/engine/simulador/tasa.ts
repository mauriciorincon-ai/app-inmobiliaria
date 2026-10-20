// La tasa de vivienda con su fecha (S10, G-Plan 1a, ADR 018). Puro: arma la consulta al conjunto abierto de la
// Superfinanciera, valida la respuesta y decide qué tasa mostrar. La lectura de red la hace `@/lib/tasa-vivienda` desde el
// cron diario; aquí no hay `fetch`.
//
// Conjunto `qzsc-9esp` de datos.gov.co («Tasas de interés activas por tipo de crédito — últimos dos meses», semanal,
// CC BY-SA 4.0). Producto «Adquisición de vivienda no VIS (colocación en pesos)», tasa fija («FS»), última fecha de corte,
// PONDERADA por el monto desembolsado de cada entidad (una entidad con un solo crédito no pesa como el mercado).
import { z } from "zod";
// Los valores de la consulta (dirección del conjunto, nombre exacto del producto y campos) son DATOS del conjunto de la
// Superfinanciera, no texto de la interfaz: viven en un JSON para que el barrido de literales siga sin excepciones.
import consulta from "./consulta-tasa.json";

export const CONJUNTO_TASAS = consulta.conjunto;
export const PRODUCTO_TASA = consulta.producto;
/** Identificador de la fuente que se guarda en la base. El nombre legible y la licencia los pone el diccionario. */
export const FUENTE_TASA = "superfinanciera:qzsc-9esp";

/** Más vieja que esto, la interfaz avisa que puede estar desactualizada. */
export const DIAS_TASA_VIEJA = 30;

export type Tasa = {
  /** AAAA-MM-DD. */
  fechaCorte: string;
  /** Efectiva anual, en porcentaje con 3 decimales. */
  tasaEA: number;
  creditos: number;
  entidades: number;
  fuente: string;
};

/**
 * La última tasa leída a mano el 2026-10-19 con la misma consulta (686 créditos, 13 entidades). Se usa SOLO si la base no
 * tiene ninguna guardada; la interfaz la muestra con su fecha y avisa si está vieja. Jamás se presenta como de hoy.
 */
export const TASA_RESPALDO: Tasa = {
  fechaCorte: "2026-10-09",
  tasaEA: 15.48,
  creditos: 686,
  entidades: 13,
  fuente: FUENTE_TASA,
};

/** La consulta SoQL: una sola petición agregada, la semana de corte más reciente. */
export function urlConsultaTasa(): string {
  const params = new URLSearchParams({
    $select: consulta.select,
    $where: `producto_de_cr_dito='${PRODUCTO_TASA}' AND tipo_de_tasa='${consulta.tipoTasa}'`,
    $group: "fecha_corte",
    $order: "fecha_corte DESC",
    $limit: "1",
  });
  return `${CONJUNTO_TASAS}?${params.toString()}`;
}

const numero = z.union([z.string(), z.number()]).transform((v) => Number(v));
const filaSFC = z.object({
  fecha_corte: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  tasa: numero,
  creditos: numero,
  entidades: numero,
});

/** Valida la respuesta del conjunto. Null si no trae una fila usable (vacía, malformada o con cifras imposibles). */
export function parsearTasa(respuesta: unknown): Tasa | null {
  if (!Array.isArray(respuesta) || respuesta.length === 0) return null;
  const r = filaSFC.safeParse(respuesta[0]);
  if (!r.success) return null;
  const { fecha_corte, tasa, creditos, entidades } = r.data;
  const fechaCorte = fecha_corte.slice(0, 10);
  if (Number.isNaN(Date.parse(fechaCorte))) return null;
  if (!Number.isFinite(tasa) || tasa < 1 || tasa > 60) return null;
  if (!Number.isInteger(creditos) || creditos <= 0) return null;
  if (!Number.isInteger(entidades) || entidades <= 0) return null;
  return {
    fechaCorte,
    tasaEA: Math.round(tasa * 1000) / 1000,
    creditos,
    entidades,
    fuente: FUENTE_TASA,
  };
}

export type TasaElegida = Tasa & {
  origen: "guardada" | "respaldo";
  diasDesdeCorte: number;
  vieja: boolean;
};

/** La tasa a mostrar: la guardada por el cron o, si no hay, la del repo. Siempre con su fecha y su antigüedad. */
export function elegirTasa(guardada: Tasa | null, hoy: string): TasaElegida {
  const tasa = guardada ?? TASA_RESPALDO;
  const dias = Math.floor(
    (Date.parse(hoy) - Date.parse(tasa.fechaCorte)) / 86_400_000,
  );
  return {
    ...tasa,
    origen: guardada ? "guardada" : "respaldo",
    diasDesdeCorte: dias,
    vieja: dias > DIAS_TASA_VIEJA,
  };
}
