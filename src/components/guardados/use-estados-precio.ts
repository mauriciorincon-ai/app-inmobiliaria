"use client";

import { useEffect, useState } from "react";
import type { RangoPrecio } from "@/engine/precio/comparables";
import {
  claveGrupo,
  evaluarAnuncios,
  gruposDe,
  type AnuncioPorEvaluar,
} from "@/engine/precio/presentacion";
import { comparablesDe, fuenteHoy } from "@/lib/precio-cliente";
import type { ComparablePrecio } from "@/lib/supabase/types";

export type EstadosPrecio = {
  /** `cargando` mientras llegan los comparables; `error` si la consulta falló. */
  carga: "cargando" | "listo" | "error";
  porSlug: ReadonlyMap<string, RangoPrecio>;
};

// El estado de «¿Está caro?» de cada anuncio de Comparar: una consulta de comparables por grupo (operación, tipo,
// localidad) y el mismo motor que la ficha. Cada anuncio se evalúa contra los comparables de SU grupo.
export function useEstadosPrecio(
  anuncios: readonly AnuncioPorEvaluar[],
): EstadosPrecio {
  const [estados, setEstados] = useState<EstadosPrecio>({
    carga: "cargando",
    porSlug: new Map(),
  });
  // Una llave estable de lo que se evalúa: el efecto solo corre cuando cambia de verdad.
  const llave = anuncios
    .map(
      (a) =>
        `${a.slug}:${a.operacion}:${a.tipo}:${a.localidad ?? ""}:${a.sector_codigo ?? ""}:${a.area_m2}:${a.precio_esperado}`,
    )
    .join(",");

  useEffect(() => {
    let activo = true;
    const grupos = gruposDe(anuncios);
    Promise.all(
      grupos.map(async (g) => [claveGrupo(g), await comparablesDe(g)] as const),
    )
      .then((pares) => {
        if (!activo) return;
        const porGrupo = new Map<string, readonly ComparablePrecio[]>(pares);
        setEstados({
          carga: "listo",
          porSlug: evaluarAnuncios(anuncios, porGrupo, fuenteHoy("")),
        });
      })
      .catch(() => {
        if (activo) setEstados({ carga: "error", porSlug: new Map() });
      });
    return () => {
      activo = false;
    };
    // `llave` resume `anuncios`: así un arreglo nuevo con lo mismo no vuelve a preguntar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llave]);

  return estados;
}
