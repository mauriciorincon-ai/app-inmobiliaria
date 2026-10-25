// Las marcas del lector de CTL (S15, maqueta 11): qué busca en el certificado y con qué norma lo explica. Solo la ESTRUCTURA
// (tipo, artículos citados); el texto de cada marca, con su norma en palabras, vive en `src/textos/ctl.ts` bajo el mismo tipo.
// Cada artículo citado está en el registro de lo que se leyó en su texto oficial (`src/data/normas-ctl.json`); una prueba ata
// el texto a esos números. Puro y sin zod: corre en el teléfono.
export type IdNormaCtl =
  | "ley_1579_2012"
  | "codigo_civil"
  | "codigo_general_proceso"
  | "ley_258_1996"
  | "ley_70_1931";

export const TIPOS_MARCA = [
  "hipoteca",
  "embargo",
  "medida_cautelar",
  "vivienda_familiar",
  "patrimonio_familia",
  "falsa_tradicion",
] as const;
export type TipoMarca = (typeof TIPOS_MARCA)[number];

export const NORMAS_MARCA: Record<
  TipoMarca,
  Partial<Record<IdNormaCtl, readonly number[]>>
> = {
  hipoteca: { ley_1579_2012: [8], codigo_civil: [2432, 2452] },
  embargo: { ley_1579_2012: [8], codigo_civil: [1521], codigo_general_proceso: [593] },
  medida_cautelar: { ley_1579_2012: [8], codigo_general_proceso: [591] },
  vivienda_familiar: { ley_1579_2012: [8], ley_258_1996: [3] },
  patrimonio_familia: { ley_1579_2012: [8], ley_70_1931: [21, 23] },
  falsa_tradicion: { ley_1579_2012: [8] },
};

/** La cancelación de una anotación: lo que el lector usa para decir si una marca sigue vigente. */
export const NORMAS_CANCELACION: Partial<Record<IdNormaCtl, readonly number[]>> = {
  ley_1579_2012: [61, 62, 63],
};
