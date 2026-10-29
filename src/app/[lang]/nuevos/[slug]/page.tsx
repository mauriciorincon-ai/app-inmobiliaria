import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import Aviso from "@/components/nuevos/Aviso";
import FichaNuevo from "@/components/nuevos/FichaNuevo";
import PestanasMercado from "@/components/nuevos/PestanasMercado";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import {
  edicionVigente,
  leerFiltrosNuevos,
  paramsNuevos,
  vistaProyecto,
} from "@/engine/vivienda-nueva/vista";
import { leerIdioma } from "@/i18n/ruta";
import { enIdioma, rellenar } from "@/i18n/textos";
import { cargarNuevos, hoyNuevos, tarifasPara } from "@/lib/vivienda-nueva/datos";
import { VIVIENDA_NUEVA } from "@/textos/vivienda-nueva";

// La ficha de un proyecto de vivienda nueva (maqueta 02). Se calcula en el servidor para el día de hoy en Bogotá; la edición
// y su vigencia salen de la base (solo ediciones publicadas). La única isla de cliente es el arriendo de «la espera».
// `noindex` hasta H-4, como el resto de la app. La barra del comprador sigue en 4: la ficha vive bajo «Buscar».
export const dynamic = "force-dynamic";

type Params = Promise<{ lang: string; slug: string }>;
type Consulta = Promise<Record<string, string | string[] | undefined>>;
const RE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Un solo viaje a la base por petición, aunque lo pidan los metadatos y la página.
const leer = cache((hoy: string) => cargarNuevos(hoy));

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const lang = await leerIdioma(params);
  const { slug } = await params;
  const t = enIdioma(VIVIENDA_NUEVA.meta, lang);
  const lectura = RE_SLUG.test(slug)
    ? await leer(hoyNuevos(await headers()))
    : null;
  const proyecto =
    lectura?.estado === "ok"
      ? lectura.leida.proyectos.find((p) => p.slug === slug)
      : undefined;
  const nombre =
    proyecto && !["no_lo_dice", "ilegible"].includes(String(proyecto.nombre))
      ? String(proyecto.nombre)
      : t.titulo;
  return {
    title: rellenar(t.ficha, { nombre }),
    description: t.descripcion,
    robots: { index: false, follow: false },
  };
}

export default async function FichaNuevoPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Consulta;
}) {
  const lang = await leerIdioma(params);
  const { slug } = await params;
  if (!RE_SLUG.test(slug) || slug.length > 100) notFound();
  const t = enIdioma(VIVIENDA_NUEVA, lang);
  const tope = leerFiltrosNuevos(await searchParams).max ?? null;
  const hoy = hoyNuevos(await headers());
  const lectura = await leer(hoy);
  if (lectura.estado === "sin_publicar") notFound();

  const hrefUsados = tope !== null ? `/buscar?max=${tope}` : "/buscar";
  const hrefNuevos = `/buscar?${paramsNuevos({ pago: false, max: tope ?? undefined }).toString()}`;
  const marco = (contenido: React.ReactNode) => (
    <>
      <EncabezadoInterior lang={lang} seccion="buscar" />
      <main className="mx-auto max-w-4xl px-6 py-6 pb-28 sm:pb-6">
        <PestanasMercado
          activo="nuevos"
          hrefUsados={hrefUsados}
          hrefNuevos={hrefNuevos}
          t={t.mercado}
        />
        {contenido}
      </main>
    </>
  );

  if (lectura.estado === "error") {
    return marco(
      <Aviso tono="alerta" titulo={t.pagina.error.titulo}>
        <p>{t.pagina.error.detalle}</p>
      </Aviso>,
    );
  }

  const { edicion, proyectos } = lectura.leida;
  const v = vistaProyecto(proyectos, slug, tarifasPara(hoy), hoy, tope);
  if (!v) notFound();
  return marco(
    <FichaNuevo
      v={v}
      edicion={edicion}
      vigencia={edicionVigente([edicion], hoy)}
      tope={tope}
      t={t}
      lang={lang}
    />,
  );
}
