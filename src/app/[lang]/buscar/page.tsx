import type { Metadata } from "next";
import { headers } from "next/headers";
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
import BuscarNuevos from "@/components/nuevos/BuscarNuevos";
import PestanasMercado from "@/components/nuevos/PestanasMercado";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import {
  aArgsBuscar,
  aParams,
  hayFiltros,
  leerFiltros,
  type Filtros,
} from "@/engine/busqueda/filtros";
import { formatearCOP } from "@/engine/format/cop";
import { leerFiltrosNuevos, paramsNuevos } from "@/engine/vivienda-nueva/vista";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma, rellenar } from "@/i18n/textos";
import { crearClienteAnon } from "@/lib/supabase/server";
import { cargarNuevos, hoyNuevos } from "@/lib/vivienda-nueva/datos";
import { BUSCAR } from "@/textos/buscar";
import { COMUN } from "@/textos/comun";
import { VIVIENDA_NUEVA } from "@/textos/vivienda-nueva";

// La búsqueda vive en la URL y lee la BD por la RPC pública (lista blanca de campos): dinámica.
export const dynamic = "force-dynamic";

type Parametros = Promise<Record<string, string | string[] | undefined>>;

// «Usados | Nuevos» (S12): `?v=nuevos` es la pestaña de vivienda nueva. Vive FUERA de `aParams`/`hayFiltros` de los usados
// (las alertas y los conteos los reusan): un parámetro más ahí rompería «primera vez», alertas y conteos.
const esNuevos = (p: Record<string, string | string[] | undefined>) =>
  (Array.isArray(p.v) ? p.v[0] : p.v) === "nuevos";

export async function generateMetadata({
  params,
  searchParams,
}: PropsLang & { searchParams: Parametros }): Promise<Metadata> {
  const lang = await leerIdioma(params);
  const t = esNuevos(await searchParams)
    ? enIdioma(VIVIENDA_NUEVA.meta, lang)
    : enIdioma(BUSCAR.meta, lang);
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
  const parametros = await searchParams;
  const filtros = leerFiltros(parametros);
  const t = enIdioma(BUSCAR, lang);

  // La pestaña de vivienda nueva: se calcula entera en el servidor (motores del S11) y no toca la búsqueda de usados.
  if (esNuevos(parametros)) {
    const tn = enIdioma(VIVIENDA_NUEVA, lang);
    const filtrosNuevos = leerFiltrosNuevos(parametros);
    const hoy = hoyNuevos(await headers());
    const lectura = await cargarNuevos(hoy);
    const usados = new URLSearchParams();
    if (filtrosNuevos.max !== undefined) {
      usados.set("max", String(filtrosNuevos.max));
      if (filtrosNuevos.pago) usados.set("pago", "1");
    }
    return (
      <>
        <EncabezadoInterior lang={lang} seccion="buscar" />
        <main className="mx-auto max-w-6xl px-6 py-6 pb-28 sm:pb-6">
          <PestanasMercado
            activo="nuevos"
            hrefUsados={usados.size ? `/buscar?${usados}` : "/buscar"}
            hrefNuevos="/buscar?v=nuevos"
            t={tn.mercado}
          />
          <BuscarNuevos
            lectura={lectura}
            hoy={hoy}
            filtros={filtrosNuevos}
            entrada={parametros}
            t={tn}
            lang={lang}
          />
        </main>
      </>
    );
  }
  const promesa = buscar(filtros);
  // El simulador manda aquí con `pago=1` y el precio máximo (`max`): la página dice de dónde sale ese tope. Sin
  // `max` válido no hay nada que rotular.
  const conPago = parametros.pago === "1" && filtros.precioMax !== undefined;

  return (
    <>
      <EncabezadoInterior lang={lang} seccion="buscar" />
      <main className="mx-auto max-w-6xl px-6 py-6 pb-28 sm:pb-6">
        <PestanasMercado
          activo="usados"
          hrefUsados="/buscar"
          // El tope de un arriendo es una renta mensual, no un precio de compra: no viaja a «Nuevos».
          hrefNuevos={`/buscar?${paramsNuevos({
            pago: conPago && filtros.operacion !== "arriendo",
            max:
              filtros.operacion === "arriendo" ? undefined : filtros.precioMax,
          })}`}
          t={enIdioma(VIVIENDA_NUEVA, lang).mercado}
        />
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
          {conPago && filtros.precioMax !== undefined && (
            <div className="mb-4 rounded-2xl bg-mint p-4">
              <p className="font-semibold text-ok">
                <span aria-hidden="true">✓ </span>
                {rellenar(t.pago.etiqueta, {
                  precio: formatearCOP(filtros.precioMax, lang),
                })}
              </p>
              <p className="mt-1 text-sm text-gray">{t.pago.nota}</p>
              <Link
                href="/herramientas"
                prefetch={false}
                className="mt-1 inline-block text-sm font-semibold text-purple-600 underline underline-offset-4"
              >
                {t.pago.ajustar}
              </Link>
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
                prefetch={false}
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
