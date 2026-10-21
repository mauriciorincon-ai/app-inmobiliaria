// «¿Nuevo o usado?» (S11, F2). Puro. Con el mismo presupuesto y en la misma zona: qué proyectos nuevos caben por su
// precio VERDADERO (la cota «al menos») frente a los usados verificados de Innmobiliaria, con el motor de comparables del
// S10 y la fuente como dato. Sin 5 usados comparables tras el recorte no hay comparación: «sin datos suficientes».
import {
  MINIMO_COMPARABLES,
  percentil,
  precioPorM2,
  recortarAtipicos,
  type FuentePrecio,
} from "../precio/comparables.ts";

export type NuevoParaComparar = {
  id: string;
  alMenos: number | null;
  m2Privado: number | null;
};

export type UsadoParaComparar = { area_m2: number; precio_esperado: number };

export type LadoUsado =
  | { estado: "sin_datos"; n: number; minimo: number; fuente: FuentePrecio }
  | {
      estado: "con_datos";
      n: number;
      medianaM2: number;
      p25M2: number;
      p75M2: number;
      fuente: FuentePrecio;
    };

export type NuevoOUsado = {
  presupuesto: number;
  nuevos: {
    caben: string[];
    n: number;
    /** Mediana del m² privado aproximado de los que caben; `null` con menos de 5. */
    medianaM2: number | null;
  };
  usados: LadoUsado;
  /** Cuánto más (o menos) cuesta el m² nuevo frente al usado, en %; solo si los dos lados tienen mediana. */
  diferencia: number | null;
};

export function nuevoOUsado(
  presupuesto: number,
  nuevos: readonly NuevoParaComparar[],
  usados: readonly UsadoParaComparar[],
  fuente: FuentePrecio,
): NuevoOUsado {
  const caben = nuevos
    .filter((n) => n.alMenos !== null && n.alMenos <= presupuesto)
    .sort((a, b) => (a.alMenos as number) - (b.alMenos as number));
  const m2Nuevos = recortarAtipicos(
    caben
      .map((n) => n.m2Privado)
      .filter((x): x is number => typeof x === "number"),
  );
  const medianaNuevos =
    m2Nuevos.length >= MINIMO_COMPARABLES
      ? Math.round(percentil(m2Nuevos, 0.5))
      : null;

  const m2Usados = recortarAtipicos(
    usados
      .filter((u) => u.precio_esperado <= presupuesto && u.area_m2 > 0)
      .map((u) => precioPorM2(u.precio_esperado, u.area_m2)),
  );
  const lado: LadoUsado =
    m2Usados.length < MINIMO_COMPARABLES
      ? {
          estado: "sin_datos",
          n: m2Usados.length,
          minimo: MINIMO_COMPARABLES,
          fuente,
        }
      : {
          estado: "con_datos",
          n: m2Usados.length,
          medianaM2: Math.round(percentil(m2Usados, 0.5)),
          p25M2: Math.round(percentil(m2Usados, 0.25)),
          p75M2: Math.round(percentil(m2Usados, 0.75)),
          fuente,
        };

  return {
    presupuesto,
    nuevos: {
      caben: caben.map((n) => n.id),
      n: caben.length,
      medianaM2: medianaNuevos,
    },
    usados: lado,
    diferencia:
      medianaNuevos !== null && lado.estado === "con_datos"
        ? Math.round((medianaNuevos / lado.medianaM2 - 1) * 100)
        : null,
  };
}
