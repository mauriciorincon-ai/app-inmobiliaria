// «Lo que puedes pagar» también filtra la vivienda nueva (S11, F2; océano azul). Puro. El tope sale del simulador del
// S10 (`precioMaximo`, con el ingreso que vive solo en el teléfono); aquí se compara contra el precio VERDADERO, la cota
// «al menos», no contra el «desde» del aviso. Un proyecto sin precio no cabe ni deja de caber: se dice aparte.
export type ConPrecioVerdadero = { id: string; alMenos: number | null };

export type Alcanza<T> = { caben: T[]; noCaben: T[]; sinPrecio: T[] };

export function alcanza<T extends ConPrecioVerdadero>(
  proyectos: readonly T[],
  tope: number,
): Alcanza<T> {
  const conPrecio = proyectos
    .filter((p) => p.alMenos !== null)
    .sort((a, b) => (a.alMenos as number) - (b.alMenos as number));
  return {
    caben: conPrecio.filter((p) => (p.alMenos as number) <= tope),
    noCaben: conPrecio.filter((p) => (p.alMenos as number) > tope),
    sinPrecio: proyectos.filter((p) => p.alMenos === null),
  };
}
