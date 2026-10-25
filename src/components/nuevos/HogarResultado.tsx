import { formatearCOP } from "@/engine/format/cop";
import { formatearFecha } from "@/engine/format/fecha";
import type {
  HogarTeAlcanza,
  ProyectoSubsidio,
} from "@/engine/vivienda-nueva/te-alcanza";
import type { ProgramaVisible } from "@/engine/vivienda-nueva/vista";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar } from "@/i18n/textos";
import { esVacio, etiqueta, numero, type TextosNuevos } from "./etiquetas";
import TablaProgramas, { precioCorto } from "./TablaProgramas";

export type TextosHogar = Pick<
  TextosNuevos,
  "teAlcanza" | "segmento" | "region" | "tarjeta"
>;

/**
 * El resultado de UN hogar: lo que puede pagar, cuántos proyectos le caben sin subsidio y con el mejor caso, y los programas
 * para el proyecto de ejemplo. Presentacional: lo usan la página (los tres hogares de ejemplo, calculados en el servidor) y la
 * isla del teléfono (tu hogar, con el mismo motor). `fechaCorte` es la de la tasa de referencia; `null` si el hogar escribió
 * su propia tasa.
 */
export default function HogarResultado({
  h,
  ejemplo,
  programas,
  fechaCorte,
  t,
  lang,
}: {
  h: HogarTeAlcanza;
  ejemplo: ProyectoSubsidio | null;
  programas: readonly ProgramaVisible[];
  fechaCorte: string | null;
  t: TextosHogar;
  lang: Idioma;
}) {
  const tt = t.teAlcanza;
  const resumen =
    h.tope === null ? (
      <p className="text-gray">{tt.sinTope}</p>
    ) : (
      <p className="text-gray">
        {rellenar(fechaCorte ? tt.resumen : tt.resumenPropia, {
          ingresos: formatearCOP(h.ingresos, lang),
          tope: formatearCOP(h.tope, lang),
          inicial: Math.round(h.inicial * 100),
          plazo: h.plazoAnos,
          tasa: `${numero(h.tasaEA, lang)} %`,
          fecha: fechaCorte ? formatearFecha(fechaCorte, lang) : "",
        })}
      </p>
    );
  const segmentos: Record<string, string> = t.segmento;
  const regiones: Record<string, string> = t.region;
  const filaEjemplo = ejemplo
    ? h.porProyecto.find((x) => x.slug === ejemplo.slug)
    : undefined;
  return (
    <div>
      {resumen}
      {h.tope !== null && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section className="flex flex-col gap-1 rounded-2xl border border-purple-200 bg-white p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-mute">
              {tt.sinSubsidio.eyebrow}
            </h3>
            <p className="text-3xl font-extrabold text-ink">{h.sinSubsidio}</p>
            <p className="text-sm text-gray">
              {rellenar(tt.sinSubsidio.pie, { total: h.total })}
            </p>
          </section>
          <section className="flex flex-col gap-1 rounded-2xl border border-purple-200 bg-white p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-mute">
              {tt.conSubsidio.eyebrow}
            </h3>
            <p className="text-3xl font-extrabold text-ink">{h.conSubsidio}</p>
            <p className="text-sm text-gray">{tt.conSubsidio.pie}</p>
          </section>
        </div>
      )}
      {ejemplo && filaEjemplo ? (
        <>
          <h3 className="mt-6 text-lg font-extrabold text-ink">
            {rellenar(tt.programas.titulo, {
              nombre: esVacio(ejemplo.nombre)
                ? t.tarjeta.nombreIlegible
                : String(ejemplo.nombre),
            })}
          </h3>
          <p className="text-sm text-mute">
            {rellenar(tt.programas.contexto, {
              zona: etiqueta(regiones, ejemplo.region),
              segmento: etiqueta(segmentos, String(ejemplo.segmento)),
              precio: precioCorto(ejemplo.precio_desde, lang),
            })}
          </p>
          <TablaProgramas
            programas={programas}
            resultados={filaEjemplo.resultados}
            t={tt}
            lang={lang}
          />
        </>
      ) : (
        <p className="mt-6 text-gray">{tt.programas.sinEjemplo}</p>
      )}
    </div>
  );
}
