// Los topes de la identificación (S8, G-Plan 1a, ADR 016). Didit cobra US$0,20 por consulta exitosa y
// regala US$10 al mes: 40 consultas al mes caben en lo gratis. El tope del día reparte el mes; el del
// comprador evita que una persona gaste el cupo de todos. La base los aplica (`reservar_consulta_identidad`)
// ANTES de llamar al proveedor; estos son los números que la ruta le pasa.
export const TOPES_IDENTIDAD = { mes: 40, dia: 5, comprador: 3 } as const;

export type Topes = { mes: number; dia: number; comprador: number };

function entero(valor: string | undefined): number | null {
  if (!valor || !/^[0-9]{1,7}$/.test(valor)) return null;
  return Number(valor);
}

/**
 * Los topes efectivos. Con el proveedor REAL son siempre los de arriba: ninguna variable los sube. Solo
 * con el simulador (que no cuesta) las pruebas pueden ampliar el del día y el del mes, para que una
 * corrida larga de e2e no se quede sin cupo; el del comprador nunca cambia.
 */
export function topesEfectivos(
  conSimulador: boolean,
  entorno: { dia?: string; mes?: string } = {},
): Topes {
  if (!conSimulador) return { ...TOPES_IDENTIDAD };
  return {
    mes: entero(entorno.mes) ?? TOPES_IDENTIDAD.mes,
    dia: entero(entorno.dia) ?? TOPES_IDENTIDAD.dia,
    comprador: TOPES_IDENTIDAD.comprador,
  };
}
