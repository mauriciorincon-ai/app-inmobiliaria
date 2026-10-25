// El interruptor del lector de CTL (S15). Apagado salvo `LECTOR_CTL_ACTIVO=1` (variable del servidor; `/papeleo` la lee al
// construirse). Se enciende solo con 3 certificados reales o más validados por `scripts/ctl-validar.mjs` y cero desacuerdos; sin
// esa validación, el lector existe en el código y en sus pruebas, pero nadie lo ve.
export function lectorCtlActivo(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.LECTOR_CTL_ACTIVO === "1";
}
