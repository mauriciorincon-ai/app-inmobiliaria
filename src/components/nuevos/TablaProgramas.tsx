import { formatearCOP, formatearMillones } from "@/engine/format/cop";
import { formatearFecha } from "@/engine/format/fecha";
import type { ProgramaVisible } from "@/engine/vivienda-nueva/vista";
import type { ResultadoPrograma } from "@/engine/vivienda-nueva/subsidio";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar } from "@/i18n/textos";
import { etiqueta, type TextosNuevos } from "./etiquetas";

export type TextosTabla = TextosNuevos["teAlcanza"];

const SIMBOLO: Record<ResultadoPrograma["estado"], string> = {
  aplica: "✓",
  por_confirmar: "?",
  no_aplica: "✕",
  sin_cupos: "!",
};

/**
 * Los programas de subsidio, cada uno con su norma, su monto de este año, lo que dice para el hogar y la fecha de su estado.
 * Presentacional y sin estado: lo usan la página del servidor (los hogares de ejemplo) y la isla del teléfono (tu hogar). El
 * estado de cada programa lleva símbolo + texto, nunca solo color.
 */
export default function TablaProgramas({
  programas,
  resultados,
  t,
  lang,
}: {
  programas: readonly ProgramaVisible[];
  resultados: readonly Pick<ResultadoPrograma, "id" | "estado" | "motivos">[];
  t: TextosTabla;
  lang: Idioma;
}) {
  const tp = t.programas;
  const porId = new Map(resultados.map((r) => [r.id, r]));
  const estados: Record<string, string> = t.estado;
  const motivos: Record<string, string> = t.motivo;
  return (
    <div className="mt-3 overflow-x-auto rounded-2xl border border-purple-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-cream text-xs uppercase tracking-wide text-mute">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              {tp.cabeceras.programa}
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              {tp.cabeceras.paraTi}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-purple-200">
          {programas.map((p) => {
            const r = porId.get(p.id);
            const monto =
              p.minimo !== null
                ? rellenar(tp.monto.rango, {
                    minimo: formatearCOP(p.minimo, lang),
                    maximo: formatearCOP(p.maximo, lang),
                  })
                : rellenar(tp.monto.hasta, {
                    maximo: formatearCOP(p.maximo, lang),
                  });
            return (
              <tr key={p.id}>
                <th
                  scope="row"
                  className="px-4 py-3 align-top font-semibold text-ink"
                >
                  {p.nombre[lang]}
                  <span className="mt-0.5 block text-xs font-normal text-mute">
                    {p.normas.join(" · ")}
                  </span>
                  <span className="mt-1 block text-sm font-normal text-gray">
                    {tp.cabeceras.monto}: {monto}
                  </span>
                  <span className="block text-xs font-normal text-mute">
                    {p.restaAlPrecio ? tp.baja.compra : tp.baja.cuota}
                  </span>
                  <span className="block text-xs font-normal text-mute">
                    {rellenar(tp.estadoAl, {
                      fecha: formatearFecha(p.estadoAl, lang),
                    })}
                  </span>
                </th>
                <td className="px-4 py-3 align-top">
                  {r ? (
                    <>
                      <span className="font-semibold text-ink">
                        <span aria-hidden="true">{SIMBOLO[r.estado]} </span>
                        {etiqueta(estados, r.estado)}
                      </span>
                      {r.motivos.length > 0 && (
                        <span className="mt-0.5 block text-xs text-mute">
                          {r.motivos
                            .map((m) => etiqueta(motivos, m))
                            .join(" · ")}
                        </span>
                      )}
                    </>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** «Desde $X M»: el precio del proyecto de ejemplo, en millones. */
export function precioCorto(pesos: number, lang: Idioma): string {
  return formatearMillones(pesos, lang);
}
