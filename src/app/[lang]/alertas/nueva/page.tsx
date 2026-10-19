import type { Metadata } from "next";
import Link from "next/link";
import NuevaAlerta from "@/components/alertas/NuevaAlerta";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { nombrePorDefecto, resumenCriterios } from "@/engine/alertas/criterios";
import { aParams, hayFiltros, leerFiltros } from "@/engine/busqueda/filtros";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { ALERTAS } from "@/textos/alertas";

export async function generateMetadata({
  params,
}: PropsLang): Promise<Metadata> {
  const lang = await leerIdioma(params);
  return {
    title: enIdioma(ALERTAS.nueva.meta, lang).titulo,
    robots: { index: false, follow: false },
  };
}

// Crear una alerta desde una búsqueda (S9, maqueta 08). Los criterios son los de `/buscar`: se leen de esta URL
// con el mismo `leerFiltros` (lo inválido se descarta) y se vuelven a escribir ya normalizados. Sin ningún
// filtro no hay nada que avisar.
export default async function NuevaAlertaPage({
  params,
  searchParams,
}: PropsLang & {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await leerIdioma(params);
  const t = enIdioma(ALERTAS.nueva, lang);
  const filtros = leerFiltros(await searchParams);
  return (
    <>
      <EncabezadoInterior lang={lang} seccion="alertas" />
      <main className="mx-auto max-w-xl px-6 py-8 pb-28 sm:pb-10">
        {hayFiltros(filtros) ? (
          <NuevaAlerta
            lang={lang}
            t={t}
            consulta={aParams(filtros).toString()}
            resumen={resumenCriterios(filtros, lang)}
            nombreInicial={nombrePorDefecto(filtros, lang)}
          />
        ) : (
          <div className="rounded-[2rem] bg-cream px-6 py-12 text-center">
            <h1 className="text-lg font-bold text-ink">
              {t.sinCriterios.titulo}
            </h1>
            <p className="mt-2 text-sm text-gray">{t.sinCriterios.texto}</p>
            <Link
              href="/buscar"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-purple px-5 py-2 text-sm font-semibold text-white hover:bg-purple-600"
            >
              {t.sinCriterios.boton}
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
