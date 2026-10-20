"use client";

import { useEffect, useMemo, useState } from "react";
import { formatearCOP } from "@/engine/format/cop";
import { formatearFecha } from "@/engine/format/fecha";
import { MINIMO_COMPARABLES, rangoDePrecio } from "@/engine/precio/comparables";
import { ESTILO_ESTADO } from "@/components/precio/estilos";
import type { Operacion, TipoInmueble } from "@/engine/registro/schema";
import { sectorPorCodigo } from "@/engine/zonas/sectores";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import { comparablesDe, fuenteHoy } from "@/lib/precio-cliente";
import type { ComparablePrecio } from "@/lib/supabase/types";
import type { PRECIO } from "@/textos/precio";

export type TextosRangoDueno = {
  dueno: Proyectado<typeof PRECIO.dueno>;
  /** El nombre de la fuente de los comparables («anuncios vivos en Innmobiliaria»). */
  fuente: string;
};

type Estado =
  | { clave: string; comparables: ComparablePrecio[] }
  | { clave: string; error: true };

// El mismo rango de «¿Está caro?», para el DUEÑO que fija su precio (maqueta 09: «El dueño ve este mismo rango cuando
// publica»). Corre en el navegador: consulta los comparables públicos y aplica el mismo motor, así el dueño ve lo que
// verá el comprador. Es lo que piden otros dueños, no un avalúo. Se carga diferido: solo pesa cuando se llega al paso.
export default function RangoDueno({
  lang,
  t,
  operacion,
  tipo,
  localidad,
  sectorCodigo,
  area,
  precio,
  slug = null,
  sinGuia = false,
}: {
  lang: Idioma;
  t: TextosRangoDueno;
  operacion: Operacion | "";
  tipo: TipoInmueble | "";
  /** La localidad, o null para sacarla del barrio (`sectorCodigo`). */
  localidad: string | null;
  sectorCodigo: string | null;
  area: number | null;
  /** El precio que el dueño pide, o null si aún no lo escribió. */
  precio: number | null;
  /** El anuncio ya publicado (Mi anuncio): no se compara consigo mismo. */
  slug?: string | null;
  /** Mi anuncio: si falta algo no hay nada que explicar. */
  sinGuia?: boolean;
}) {
  const zona =
    localidad ??
    (sectorCodigo ? sectorPorCodigo(sectorCodigo)?.localidad : null);
  const listo = Boolean(operacion && tipo && zona && area && area > 0);
  const clave = listo ? `${operacion}|${tipo}|${zona}` : "";
  const [estado, setEstado] = useState<Estado | null>(null);

  useEffect(() => {
    if (!operacion || !tipo || !zona || !listo) return;
    let activo = true;
    comparablesDe({ operacion, tipo, localidad: zona })
      .then((comparables) => activo && setEstado({ clave, comparables }))
      .catch(() => activo && setEstado({ clave, error: true }));
    return () => {
      activo = false;
    };
  }, [clave, operacion, tipo, zona, listo]);

  const rango = useMemo(() => {
    if (!listo || !area || !estado || estado.clave !== clave) return null;
    if ("error" in estado) return null;
    return rangoDePrecio(
      {
        slug,
        sector_codigo: sectorCodigo,
        area_m2: area,
        // Sin precio escrito solo se usa el rango; el estado se ignora (ver `precio` abajo).
        precio_esperado: precio ?? 1,
      },
      estado.comparables,
      fuenteHoy(t.fuente),
    );
  }, [listo, area, estado, clave, sectorCodigo, precio, slug, t.fuente]);

  if (!listo) {
    return sinGuia ? null : (
      <p className="rounded-2xl bg-cream p-4 text-sm text-gray">
        {t.dueno.falta}
      </p>
    );
  }

  return (
    <div
      aria-live="polite"
      className="space-y-2 rounded-2xl bg-cream p-4 text-sm text-gray"
    >
      <p className="font-semibold text-ink">{t.dueno.titulo}</p>
      {estado === null || estado.clave !== clave ? (
        <p role="status">{t.dueno.cargando}</p>
      ) : "error" in estado ? (
        <p>{t.dueno.error}</p>
      ) : rango === null ? null : rango.estado === "sin_datos" ? (
        <p>
          {rellenar(t.dueno.sinDatos, {
            n: rango.n,
            minimo: MINIMO_COMPARABLES,
          })}
        </p>
      ) : (
        <>
          <p>
            {rellenar(t.dueno.rango, {
              zona:
                rango.ambito === "barrio" ? t.dueno.barrio : t.dueno.localidad,
              p25: formatearCOP(rango.p25, lang),
              p75: formatearCOP(rango.p75, lang),
              area: area ?? 0,
              n: rango.n,
              fecha: formatearFecha(rango.fuente.fecha, lang),
            })}
          </p>
          {precio !== null && (
            <p
              className={`flex gap-2 rounded-xl px-3 py-2 font-semibold ${ESTILO_ESTADO[rango.estado].clase}`}
            >
              <span aria-hidden="true">
                {ESTILO_ESTADO[rango.estado].simbolo}
              </span>
              {
                t.dueno.tuPrecio[
                  rango.estado === "en_rango" && rango.debajo
                    ? "debajo"
                    : rango.estado
                ]
              }
            </p>
          )}
          <p className="text-xs text-mute">{t.dueno.nota}</p>
        </>
      )}
    </div>
  );
}
