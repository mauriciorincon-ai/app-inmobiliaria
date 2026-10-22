import Link from "next/link";
import { formatearMillones } from "@/engine/format/cop";
import {
  FRANJAS_NUEVOS,
  ETAPAS_NUEVOS,
  paramsNuevos,
  type FiltrosNuevos as Filtros,
  type VistaLista,
} from "@/engine/vivienda-nueva/vista";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar } from "@/i18n/textos";
import { etiqueta, type TextosNuevos } from "./etiquetas";

// Los filtros de «Nuevos»: zona, franja de precio, VIS o No VIS, etapa y entrega. Un formulario GET que funciona sin
// JavaScript. El tope de «lo que puedes pagar» (`max`, `pago`) viaja oculto: lo trajo el teléfono y aquí solo se conserva.
const claseControl =
  "mt-1.5 w-full rounded-2xl border border-purple-200 bg-white px-4 py-3 text-base text-ink focus:border-purple focus:outline-none";
const SEGMENTOS = ["vis", "vip", "no_vis", "no_lo_dice"] as const;

function nombreLugar(clave: string, n: number, t: TextosNuevos): string {
  const nombre =
    clave === "bogota" || clave === "sabana"
      ? t.region[clave]
      : clave === "bogota:sin_localidad"
        ? t.indice.sinLocalidad
        : clave.slice(clave.indexOf(":") + 1);
  return `${nombre} (${n})`;
}

export default function FiltrosNuevos({
  filtros,
  lugares,
  anios,
  topeVis,
  t,
  lang,
}: {
  filtros: Filtros;
  lugares: VistaLista["lugares"];
  anios: number[];
  topeVis: number;
  t: TextosNuevos;
  lang: Idioma;
}) {
  const tf = t.filtros;
  const nFiltros = [
    filtros.lugar,
    filtros.franja,
    filtros.segmento,
    filtros.etapa,
    filtros.entrega,
  ].filter((x) => x !== undefined).length;
  const soloTope: Filtros = { pago: filtros.pago, max: filtros.max };
  const franjas: Record<string, string> = t.indice.franjas;
  const segmentos: Record<string, string> = tf.segmentos;
  const etapas: Record<string, string> = tf.etapas;
  return (
    <form
      method="get"
      action="/buscar"
      role="search"
      aria-label={tf.grupo}
      className="mt-4"
    >
      <input type="hidden" name="v" value="nuevos" />
      {filtros.max !== undefined && (
        <input type="hidden" name="max" value={filtros.max} />
      )}
      {filtros.pago && <input type="hidden" name="pago" value="1" />}
      <details
        open={nFiltros > 0}
        className="rounded-2xl border border-purple-200 bg-cream"
      >
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-ink">
          {nFiltros > 0 ? rellenar(tf.abrirCon, { n: nFiltros }) : tf.abrir}
        </summary>
        <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="n-lugar"
              className="block text-sm font-semibold text-ink"
            >
              {tf.lugar}
            </label>
            <select
              id="n-lugar"
              name="lugar"
              defaultValue={filtros.lugar ?? ""}
              className={claseControl}
            >
              <option value="">{tf.lugarTodas}</option>
              {lugares.map((l) => (
                <option key={l.clave} value={l.clave}>
                  {nombreLugar(l.clave, l.n, t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="n-franja"
              className="block text-sm font-semibold text-ink"
            >
              {tf.franja}
            </label>
            <select
              id="n-franja"
              name="franja"
              defaultValue={filtros.franja ?? ""}
              className={claseControl}
            >
              <option value="">{tf.cualquiera}</option>
              {FRANJAS_NUEVOS.map((f) => (
                <option key={f} value={f}>
                  {rellenar(etiqueta(franjas, f), {
                    tope: formatearMillones(topeVis, lang),
                  })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="n-segmento"
              className="block text-sm font-semibold text-ink"
            >
              {tf.segmento}
            </label>
            <select
              id="n-segmento"
              name="segmento"
              defaultValue={filtros.segmento ?? ""}
              className={claseControl}
            >
              <option value="">{tf.cualquiera}</option>
              {SEGMENTOS.map((s) => (
                <option key={s} value={s}>
                  {etiqueta(segmentos, s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="n-etapa"
              className="block text-sm font-semibold text-ink"
            >
              {tf.etapa}
            </label>
            <select
              id="n-etapa"
              name="etapa"
              defaultValue={filtros.etapa ?? ""}
              className={claseControl}
            >
              <option value="">{tf.cualquiera}</option>
              {ETAPAS_NUEVOS.map((e) => (
                <option key={e} value={e}>
                  {etiqueta(etapas, e)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="n-entrega"
              className="block text-sm font-semibold text-ink"
            >
              {tf.entrega}
            </label>
            <select
              id="n-entrega"
              name="entrega"
              defaultValue={
                filtros.entrega === undefined ? "" : String(filtros.entrega)
              }
              className={claseControl}
            >
              <option value="">{tf.cualquiera}</option>
              <option value="inmediata">{tf.entregaInmediata}</option>
              {anios.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <button
              type="submit"
              className="rounded-full bg-purple px-5 py-2 text-sm font-semibold text-white hover:bg-purple-600"
            >
              {tf.aplicar}
            </button>
            <Link
              href={`/buscar?${paramsNuevos(soloTope).toString()}`}
              prefetch={false}
              className="rounded-full px-4 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-tint"
            >
              {tf.quitar}
            </Link>
          </div>
        </div>
      </details>
    </form>
  );
}
