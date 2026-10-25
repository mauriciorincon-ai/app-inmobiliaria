import type { Metadata } from "next";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { REGLAS, UMBRALES } from "@/engine/antifraude/reglas";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma, rellenar } from "@/i18n/textos";
import { ANTIFRAUDE } from "@/textos/antifraude";

export async function generateMetadata({
  params,
}: PropsLang): Promise<Metadata> {
  const lang = await leerIdioma(params);
  const t = enIdioma(ANTIFRAUDE.pagina.meta, lang);
  return { title: t.titulo, description: t.descripcion };
}

// Las reglas antifraude, publicadas (S15): lo que el VISION pide a la vista del comprador. Los umbrales salen de las MISMAS
// constantes que usa el motor (`engine/antifraude/reglas.ts`), así esta página no puede decir una cifra y la regla otra.
// Estática: no lee nada de la base.
export default async function AntifraudePage({ params }: PropsLang) {
  const lang = await leerIdioma(params);
  const t = enIdioma(ANTIFRAUDE, lang);
  const valores = {
    pct: UMBRALES.precioPorcentaje,
    n: UMBRALES.precioMinimoComparables,
    distancia: UMBRALES.huellaDistancia,
    bits: UMBRALES.huellaBits,
    nombres: UMBRALES.telefonoNombres,
  };
  const acciones = ["pausar", "pedir_ctl", "descartar"] as const;

  return (
    <>
      <EncabezadoInterior lang={lang} />
      <main className="mx-auto max-w-2xl px-6 py-12 lg:py-16">
        <h1 className="text-4xl font-extrabold tracking-tight text-ink">
          {t.pagina.titulo}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-gray">{t.pagina.intro}</p>

        <section aria-labelledby="reglas-titulo" className="mt-10">
          <h2 id="reglas-titulo" className="text-2xl font-extrabold text-ink">
            {t.pagina.reglasTitulo}
          </h2>
          <ol className="mt-4 grid gap-4">
            {REGLAS.map((r, i) => (
              <li key={r} className="rounded-3xl bg-white p-5 shadow-card">
                <h3 className="flex items-center gap-3 text-lg font-bold text-ink">
                  <span
                    aria-hidden="true"
                    className="grid size-7 shrink-0 place-items-center rounded-full bg-purple-tint text-sm font-bold text-purple-600"
                  >
                    {i + 1}
                  </span>
                  {t.pagina.reglas[r].titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray">
                  {rellenar(t.pagina.reglas[r].texto, valores)}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="reportes-titulo" className="mt-10">
          <h2 id="reportes-titulo" className="text-2xl font-extrabold text-ink">
            {t.pagina.reportesTitulo}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray">
            {rellenar(t.pagina.reportesTexto, { max: UMBRALES.reportesPorDia })}
          </p>
        </section>

        <section aria-labelledby="acciones-titulo" className="mt-10">
          <h2 id="acciones-titulo" className="text-2xl font-extrabold text-ink">
            {t.pagina.accionesTitulo}
          </h2>
          <ul className="mt-3 grid gap-2">
            {acciones.map((a) => (
              <li key={a} className="flex items-start gap-3 text-sm leading-relaxed text-gray">
                <span aria-hidden="true" className="text-purple-600">
                  •
                </span>
                <span>{t.pagina.acciones[a]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="protegete-titulo" className="mt-10">
          <h2 id="protegete-titulo" className="text-2xl font-extrabold text-ink">
            {t.protegete.titulo}
          </h2>
          <ol className="mt-3 grid gap-2">
            {t.protegete.pasos.map((p, i) => (
              <li key={p} className="flex items-start gap-3 text-sm text-gray">
                <span
                  aria-hidden="true"
                  className="grid size-6 shrink-0 place-items-center rounded-full bg-purple-tint text-xs font-bold text-purple-600"
                >
                  {i + 1}
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </>
  );
}
