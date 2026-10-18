import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import BuscarLayout from "@/components/buscar/BuscarLayout";
import FiltrosBusqueda from "@/components/buscar/FiltrosBusqueda";
import ListaResultados, {
  EsqueletoLista,
  TituloConteo,
  type Busqueda,
} from "@/components/buscar/ListaResultados";
import MapaConResultados from "@/components/buscar/MapaConResultados";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import {
  aArgsBuscar,
  aParams,
  hayFiltros,
  leerFiltros,
  type Filtros,
} from "@/engine/busqueda/filtros";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { crearClienteAnon } from "@/lib/supabase/server";
import { BUSCAR } from "@/textos/buscar";
import { COMUN } from "@/textos/comun";

// La búsqueda vive en la URL y lee la BD por la RPC pública (lista blanca de campos): dinámica.
export const dynamic = "force-dynamic";

type Parametros = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: PropsLang): Promise<Metadata> {
  const lang = await leerIdioma(params);
  const t = enIdioma(BUSCAR.meta, lang);
  // noindex hasta H-4 (como el resto de la app): la apertura al buscador llega con el dominio.
  return {
    title: t.titulo,
    description: t.descripcion,
    robots: { index: false, follow: false },
  };
}

// La consulta NO se espera aquí: arranca y la lista y el mapa la esperan cada uno dentro de su
// <Suspense>. Así el armazón (filtros, nota de privacidad, disposición) sale en el primer envío y
// solo la lista aguarda a la base de datos. Nunca rechaza: un fallo se vuelve `error: true`.
async function buscar(filtros: Filtros): Promise<Busqueda> {
  try {
    const { data, error } = await crearClienteAnon().rpc(
      "buscar_inmuebles",
      aArgsBuscar(filtros),
    );
    return { resultados: error ? [] : (data ?? []), error: !!error };
  } catch {
    return { resultados: [], error: true };
  }
}

export default async function BuscarPage({
  params,
  searchParams,
}: PropsLang & { searchParams: Parametros }) {
  const lang = await leerIdioma(params);
  const filtros = leerFiltros(await searchParams);
  const t = enIdioma(BUSCAR, lang);
  const promesa = buscar(filtros);

  return (
    <>
      <EncabezadoInterior lang={lang} seccion="buscar" />
      <main className="mx-auto max-w-6xl px-6 py-6 pb-28 sm:pb-6">
        <FiltrosBusqueda
          filtros={filtros}
          t={t.filtros}
          dominio={enIdioma(COMUN.dominio, lang)}
          lang={lang}
        />

        <BuscarLayout
          t={t.vista}
          mapa={
            <Suspense
              fallback={
                <div className="h-full min-h-[22rem]" aria-hidden="true" />
              }
            >
              <MapaConResultados
                promesa={promesa}
                filtros={filtros}
                lang={lang}
              />
            </Suspense>
          }
        >
          {!hayFiltros(filtros) && (
            <div className="mb-4 rounded-2xl bg-purple-tint p-4">
              <p className="font-semibold text-ink">
                ✎ {t.lista.primeraVez.titulo}
              </p>
              <p className="mt-1 text-sm text-gray">
                {t.lista.primeraVez.detalle}
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">
              <Suspense fallback={t.cargando}>
                <TituloConteo promesa={promesa} filtros={filtros} lang={lang} />
              </Suspense>
            </h1>
            <span className="text-sm text-mute">{t.lista.orden}</span>
          </div>
          {hayFiltros(filtros) && (
            <p className="mt-2">
              <Link
                href={`/alertas/nueva?${aParams(filtros).toString()}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-purple-tint px-4 py-1.5 text-sm font-semibold text-purple-600 hover:bg-purple-200"
              >
                <span aria-hidden="true">🔔</span>
                {t.lista.guardarAlerta}
              </Link>
            </p>
          )}
          <p className="mb-4 mt-2 flex items-start gap-2 text-sm text-mute">
            <span aria-hidden="true">🔒</span>
            <span>{t.lista.privacidad}</span>
          </p>
          <Suspense fallback={<EsqueletoLista />}>
            <ListaResultados promesa={promesa} filtros={filtros} lang={lang} />
          </Suspense>
        </BuscarLayout>
      </main>
    </>
  );
}
