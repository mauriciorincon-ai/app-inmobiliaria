"use client";

import Aviso from "@/components/papeleo/Aviso";
import Sello from "@/components/papeleo/Sello";
import type { TextosPapeleo } from "@/components/papeleo/Papeleo";
import { formatearCOP } from "@/engine/format/cop";
import type {
  Actor,
  AvisoGasto,
  Gastos,
  LineaGasto,
} from "@/engine/papeleo/gastos";
import { localeIntl, type Idioma } from "@/i18n/idiomas";
import { rellenar } from "@/i18n/textos";

// Los avisos que dicen algo que NO se calculó (un triángulo); los demás explican por qué la cuenta cambió (una «i»).
const SIN_CALCULAR: ReadonlySet<AvisoGasto["id"]> = new Set([
  "vis_tarifa_unica",
  "vip_notarial_no_verificado",
  "impuesto_otro_departamento",
  "vende_empresa",
  "hojas_adicionales",
]);

const ACTORES: readonly Actor[] = ["comprador", "vendedor"];

export default function PapeleoGastos({
  r,
  lang,
  t,
  anio,
  consultado,
}: {
  r: Gastos;
  lang: Idioma;
  t: TextosPapeleo;
  anio: number;
  consultado: string;
}) {
  const numero = new Intl.NumberFormat(localeIntl(lang), {
    maximumFractionDigits: 2,
  });
  const dinero = (n: number) => formatearCOP(n, lang);

  function textoAviso(a: AvisoGasto): string {
    return rellenar(t.avisos[a.id], {
      tope:
        a.id === "supera_tope_vis" || a.id === "supera_tope_vip"
          ? dinero(a.tope)
          : "",
      avaluo: a.id === "avaluo_mayor" ? dinero(a.avaluo) : "",
    });
  }

  function detalle(l: LineaGasto): string[] {
    const partes: string[] = [];
    if (l.estado === "no_verificado") {
      if (l.cobra)
        partes.push(rellenar(t.salidas.cobra, { quien: l.cobra[lang] }));
    } else if (l.tarifa) {
      const base = l.base === null ? "—" : dinero(l.base);
      const tarifa = l.tarifa;
      partes.push(
        tarifa.tipo === "fija"
          ? t.salidas.tarifa.fija
          : tarifa.tipo === "escala"
            ? rellenar(t.salidas.tarifa.escala, { base })
            : rellenar(t.salidas.tarifa[tarifa.tipo], {
                valor: numero.format(tarifa.valor),
                base,
              }),
      );
    }
    if (l.estado === "vigente" && l.parte < 1 && l.total !== null) {
      partes.push(
        rellenar(t.salidas.parte, {
          parte: numero.format(l.parte * 100),
          total: dinero(l.total),
        }),
      );
    }
    if (l.norma) {
      partes.push(
        rellenar(t.salidas.normaAnio, { norma: l.norma[lang], anio: l.anio }),
      );
    }
    return partes;
  }

  if (r.estado === "sin_precio") {
    return (
      <Aviso clase="bg-sky text-ink" simbolo="i">
        {t.salidas.sinPrecio}
      </Aviso>
    );
  }
  if (r.estado === "vencidas") {
    return (
      <Aviso
        clase="border border-aviso-borde bg-aviso-tint text-aviso"
        simbolo="▲"
      >
        {rellenar(t.salidas.vencidas, {
          anioTarifas: r.anioTarifas,
          anioHoy: r.anioHoy,
        })}
      </Aviso>
    );
  }

  return (
    <div className="space-y-4">
      <Aviso clase="bg-sky text-ink" simbolo="i">
        {rellenar(t.salidas.estimado, {
          anio,
          fecha: new Intl.DateTimeFormat(localeIntl(lang), {
            dateStyle: "long",
            timeZone: "UTC",
          }).format(new Date(`${consultado}T00:00:00Z`)),
        })}
      </Aviso>

      <div className="grid gap-4 md:grid-cols-2">
        {ACTORES.map((actor) => {
          const lineas = r.lineas.filter((l) => l.actor === actor);
          const { suma, faltan } = r.totales[actor];
          return (
            <section
              key={actor}
              aria-labelledby={`papeleo-${actor}`}
              className="rounded-2xl border border-purple-200 bg-white p-5"
            >
              <h3
                id={`papeleo-${actor}`}
                className="text-lg font-bold text-ink"
              >
                {t.salidas[actor]}
              </h3>
              {lineas.length === 0 ? (
                <p className="mt-2 text-sm text-gray">{t.salidas.sinLineas}</p>
              ) : (
                <table className="mt-2 w-full border-collapse text-sm">
                  <tbody>
                    {lineas.map((l) => (
                      <tr
                        key={`${l.id}-${l.actor}`}
                        className="border-t border-purple-100 align-top"
                      >
                        <th
                          scope="row"
                          className="py-2 pr-3 text-left font-normal text-ink"
                        >
                          <span className="font-semibold">
                            {t.lineas[l.id]}
                          </span>
                          {detalle(l).map((d) => (
                            <span
                              key={d}
                              className="block text-xs leading-snug text-mute"
                            >
                              {d}
                            </span>
                          ))}
                        </th>
                        <td className="py-2 text-right text-ink">
                          {l.valor !== null ? (
                            dinero(l.valor)
                          ) : (
                            <Sello
                              estado="no_verificado"
                              etiqueta={t.salidas.sinCifra}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-purple-200">
                      <th
                        scope="row"
                        className="py-2 pr-3 text-left font-bold text-ink"
                      >
                        {t.salidas.total}
                      </th>
                      <td className="py-2 text-right text-lg font-bold text-purple">
                        {dinero(suma)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
              {faltan > 0 && (
                <p className="mt-1 text-xs font-semibold text-aviso">
                  <span aria-hidden="true">▲ </span>
                  {faltan === 1
                    ? t.salidas.faltaUno
                    : rellenar(t.salidas.faltanVarios, { n: faltan })}
                </p>
              )}
            </section>
          );
        })}
      </div>

      {r.avisos.length > 0 && (
        <section aria-label={t.salidas.avisos} className="space-y-2">
          <div aria-live="polite" className="space-y-2">
            {r.avisos.map((a) => (
              <Aviso
                key={a.id}
                clase={
                  SIN_CALCULAR.has(a.id)
                    ? "border border-aviso-borde bg-aviso-tint text-aviso"
                    : "bg-sky text-ink"
                }
                simbolo={SIN_CALCULAR.has(a.id) ? "▲" : "i"}
              >
                {textoAviso(a)}
              </Aviso>
            ))}
          </div>
        </section>
      )}

      <p className="text-sm text-gray">{t.salidas.ganancia}</p>
    </div>
  );
}
