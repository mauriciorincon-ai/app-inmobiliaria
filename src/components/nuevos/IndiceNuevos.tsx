import { formatearM2, formatearMillones } from "@/engine/format/cop";
import type { Grupo, Indice } from "@/engine/vivienda-nueva/indice";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar } from "@/i18n/textos";
import { etiqueta, type TextosNuevos } from "./etiquetas";

// El índice de la vivienda nueva (maqueta 01): la mediana del m² privado «desde» por zona, franja y segmento. Sin 5
// proyectos con área privada no hay mediana y la pantalla lo dice. Las cifras vienen hechas del motor (`vistaIndice`).

function nombreGrupo(
  clave: string,
  t: TextosNuevos,
  lang: Idioma,
  topeVis: number,
): string {
  const franjas: Record<string, string> = t.indice.franjas;
  if (clave in franjas) {
    return rellenar(franjas[clave], { tope: formatearMillones(topeVis, lang) });
  }
  if (clave === "bogota:sin_localidad") return t.indice.sinLocalidad;
  if (clave === "no_lo_dice") return t.indice.noDiceVis;
  const i = clave.indexOf(":");
  if (i >= 0) return clave.slice(i + 1);
  return etiqueta(t.segmento, clave);
}

function detalle(g: Grupo, t: TextosNuevos): string {
  const base =
    g.estado === "mediana"
      ? rellenar(t.indice.detalleMediana, {
          n: g.n,
          conArea: g.conArea,
          usados: g.usados,
        })
      : rellenar(
          g.n === 1 ? t.indice.detalleSinUno : t.indice.detalleSinVarios,
          { n: g.n, conArea: g.conArea, minimo: g.minimo },
        );
  if (g.enConflicto === 0) return base;
  return `${base} · ${rellenar(
    g.enConflicto === 1 ? t.indice.enConflictoUno : t.indice.enConflictoVarios,
    { n: g.enConflicto },
  )}`;
}

function Tabla({
  titulo,
  grupos,
  t,
  lang,
  topeVis,
}: {
  titulo: string;
  grupos: Grupo[];
  t: TextosNuevos;
  lang: Idioma;
  topeVis: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" aria-label={titulo}>
        <thead>
          <tr className="border-b border-purple-200 text-mute">
            <th scope="col" className="py-2 pr-3 font-semibold">
              {titulo}
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              {t.indice.m2Mediana}
            </th>
            <th scope="col" className="py-2 font-semibold">
              {t.indice.conQue}
            </th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((g) => (
            <tr key={g.clave} className="border-b border-purple-100 align-top">
              <th scope="row" className="py-2 pr-3 font-semibold text-ink">
                {nombreGrupo(g.clave, t, lang, topeVis)}
              </th>
              <td className="py-2 pr-3 font-extrabold text-ink">
                {g.estado === "mediana" ? (
                  formatearM2(g.medianaM2, lang)
                ) : (
                  <span className="font-normal text-mute">
                    {t.indice.sinDatos}
                  </span>
                )}
              </td>
              <td className="py-2 text-mute">{detalle(g, t)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function IndiceNuevos({
  indice,
  t,
  lang,
  topeVis,
}: {
  indice: Indice;
  t: TextosNuevos;
  lang: Idioma;
  topeVis: number;
}) {
  return (
    <section aria-labelledby="indice-titulo">
      <h2 id="indice-titulo" className="text-xl font-extrabold text-ink">
        {t.indice.titulo}
      </h2>
      <p className="mt-1 text-sm text-mute">{t.indice.nota}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {(["bogota", "sabana"] as const).map((k) => {
          const g = indice[k];
          return (
            <div
              key={k}
              className="rounded-2xl border border-purple-200 bg-white p-4 shadow-soft"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-mute">
                {t.region[k]}
              </p>
              {g.estado === "mediana" ? (
                <>
                  <p className="text-2xl font-extrabold text-ink">
                    {formatearM2(g.medianaM2, lang)}
                  </p>
                  <p className="text-sm text-mute">
                    {rellenar(t.indice.medianaDe, {
                      usados: g.usados,
                      n: g.n,
                    })}
                  </p>
                </>
              ) : (
                <p className="font-semibold text-mute">{t.indice.sinDatos}</p>
              )}
            </div>
          );
        })}
      </div>
      <details className="mt-3 rounded-2xl border border-purple-200 bg-cream">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-ink">
          {t.indice.desglose}
        </summary>
        <div className="space-y-4 px-4 pb-4">
          <Tabla
            titulo={t.indice.zona}
            grupos={indice.porZona}
            t={t}
            lang={lang}
            topeVis={topeVis}
          />
          <Tabla
            titulo={t.indice.franja}
            grupos={indice.porFranja}
            t={t}
            lang={lang}
            topeVis={topeVis}
          />
          <Tabla
            titulo={t.indice.segmento}
            grupos={indice.porSegmento}
            t={t}
            lang={lang}
            topeVis={topeVis}
          />
          <p className="text-sm text-mute">
            {rellenar(
              indice.entregasInmediatas === 1
                ? t.indice.entregasUno
                : t.indice.entregasVarios,
              { n: indice.entregasInmediatas },
            )}
          </p>
        </div>
      </details>
    </section>
  );
}
