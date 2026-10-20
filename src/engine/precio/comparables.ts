// «¿Está caro este anuncio?» (S10, maqueta 09, ADR 018). Puro: recibe el anuncio, sus comparables y la FUENTE como
// dato, y devuelve un RANGO, jamás un valor único ni un «avalúo». Hoy la fuente son los anuncios activos de la búsqueda
// pública (`comparables_precio`, que ya filtra la misma operación, tipo y localidad); el día que el dueño traiga los
// datos del año, entran por el mismo parámetro.
//
// Método, en orden y declarado al usuario:
//   1. precio por m² de cada comparable con área dentro de ±30 % del anuncio, sin el anuncio mismo;
//   2. primero los de su barrio; si no alcanzan, los de toda la localidad (con su rótulo);
//   3. recorte de atípicos por vallas de Tukey (1,5 × rango intercuartílico) ANTES de contar;
//   4. con menos de 5 tras el recorte NO hay rango: «sin datos suficientes»;
//   5. P25–P75 interpolado (tipo 7) y aplicado al área del anuncio.
// Estados: «caro» por encima de P75; «sospechosamente barato» 30 % o más por debajo de la MEDIANA (investigación del
// lado comprador, § D); el resto «en rango», con su marca honesta si está por debajo de P25.

/** Un anuncio comparable: lo que entrega `comparables_precio` (la misma lista blanca de `/buscar`). */
export type Comparable = {
  slug: string;
  sector_codigo: string | null;
  area_m2: number;
  precio_esperado: number;
};

/** El anuncio que se evalúa. Sin slug cuando el dueño aún no lo publica. */
export type AnuncioEvaluado = {
  slug?: string | null;
  sector_codigo: string | null;
  area_m2: number;
  precio_esperado: number;
};

/** De dónde salen los comparables y de cuándo: se muestra junto al rango, siempre. */
export type FuentePrecio = { nombre: string; fecha: string };

export type Ambito = "barrio" | "localidad";
export type EstadoPrecio = "en_rango" | "caro" | "sospechoso" | "sin_datos";

export type RangoPrecio =
  | {
      estado: "sin_datos";
      /** Cuántos comparables hubo (los de la localidad, tras el recorte). */
      n: number;
      minimo: number;
      fuente: FuentePrecio;
    }
  | {
      estado: Exclude<EstadoPrecio, "sin_datos">;
      ambito: Ambito;
      n: number;
      fuente: FuentePrecio;
      /** Precio por m² del anuncio y del conjunto (enteros, en pesos). */
      precioM2: number;
      p25M2: number;
      p75M2: number;
      medianaM2: number;
      minM2: number;
      maxM2: number;
      /** El rango aplicado al área del anuncio. */
      p25: number;
      p75: number;
      /** En rango pero por debajo de P25 (sin llegar a sospechoso). */
      debajo: boolean;
      /** «caro»: cuánto pasa de P75, en %. «sospechoso»: cuánto baja de la mediana, en %. */
      porcentaje: number;
    };

export const MINIMO_COMPARABLES = 5;
export const MARGEN_AREA = 0.3;
export const FACTOR_TUKEY = 1.5;
export const UMBRAL_SOSPECHOSO = 0.3;

/** Precio por m², entero. */
export function precioPorM2(precio: number, area: number): number {
  return Math.round(precio / area);
}

/** Percentil `p` (0–1) de una lista YA ORDENADA, con interpolación lineal (tipo 7). */
export function percentil(ordenados: readonly number[], p: number): number {
  const n = ordenados.length;
  if (n === 0) return NaN;
  const h = (n - 1) * p;
  const piso = Math.floor(h);
  const techo = Math.ceil(h);
  return ordenados[piso] + (h - piso) * (ordenados[techo] - ordenados[piso]);
}

/** Quita los atípicos por vallas de Tukey. Devuelve la lista ordenada. Con menos de 4 no recorta. */
export function recortarAtipicos(valores: readonly number[]): number[] {
  const v = [...valores].sort((a, b) => a - b);
  if (v.length < 4) return v;
  const q1 = percentil(v, 0.25);
  const q3 = percentil(v, 0.75);
  const iqr = q3 - q1;
  const bajo = q1 - FACTOR_TUKEY * iqr;
  const alto = q3 + FACTOR_TUKEY * iqr;
  return v.filter((x) => x >= bajo && x <= alto);
}

function areaComparable(area: number, areaAnuncio: number): boolean {
  return Math.abs(area - areaAnuncio) <= MARGEN_AREA * areaAnuncio;
}

function valido(c: { area_m2: number; precio_esperado: number }): boolean {
  return (
    Number.isFinite(c.area_m2) &&
    c.area_m2 > 0 &&
    Number.isFinite(c.precio_esperado) &&
    c.precio_esperado > 0
  );
}

export function rangoDePrecio(
  anuncio: AnuncioEvaluado,
  comparables: readonly Comparable[],
  fuente: FuentePrecio,
): RangoPrecio {
  const candidatos = comparables.filter(
    (c) =>
      valido(c) &&
      (!anuncio.slug || c.slug !== anuncio.slug) &&
      areaComparable(c.area_m2, anuncio.area_m2),
  );
  const m2 = (lista: readonly Comparable[]) =>
    recortarAtipicos(
      lista.map((c) => precioPorM2(c.precio_esperado, c.area_m2)),
    );

  const delBarrio = anuncio.sector_codigo
    ? m2(candidatos.filter((c) => c.sector_codigo === anuncio.sector_codigo))
    : [];
  const deLaLocalidad = m2(candidatos);

  let ambito: Ambito;
  let conjunto: number[];
  if (delBarrio.length >= MINIMO_COMPARABLES) {
    ambito = "barrio";
    conjunto = delBarrio;
  } else if (deLaLocalidad.length >= MINIMO_COMPARABLES) {
    ambito = "localidad";
    conjunto = deLaLocalidad;
  } else {
    return {
      estado: "sin_datos",
      n: deLaLocalidad.length,
      minimo: MINIMO_COMPARABLES,
      fuente,
    };
  }

  const p25M2 = Math.round(percentil(conjunto, 0.25));
  const p75M2 = Math.round(percentil(conjunto, 0.75));
  const medianaM2 = Math.round(percentil(conjunto, 0.5));
  const precioM2 = precioPorM2(anuncio.precio_esperado, anuncio.area_m2);
  const area = anuncio.area_m2;

  let estado: Exclude<EstadoPrecio, "sin_datos">;
  let porcentaje = 0;
  // El umbral se redondea al peso: 5 500 000 × 0,7 da 3 849 999,999… en coma flotante y un precio EXACTAMENTE 30 %
  // bajo la mediana dejaría de ser sospechoso.
  if (precioM2 <= Math.round(medianaM2 * (1 - UMBRAL_SOSPECHOSO))) {
    estado = "sospechoso";
    porcentaje = Math.round((1 - precioM2 / medianaM2) * 100);
  } else if (precioM2 > p75M2) {
    estado = "caro";
    porcentaje = Math.round((precioM2 / p75M2 - 1) * 100);
  } else {
    estado = "en_rango";
  }

  return {
    estado,
    ambito,
    n: conjunto.length,
    fuente,
    precioM2,
    p25M2,
    p75M2,
    medianaM2,
    minM2: conjunto[0],
    maxM2: conjunto[conjunto.length - 1],
    p25: Math.round(p25M2 * area),
    p75: Math.round(p75M2 * area),
    debajo: estado === "en_rango" && precioM2 < p25M2,
    porcentaje,
  };
}
