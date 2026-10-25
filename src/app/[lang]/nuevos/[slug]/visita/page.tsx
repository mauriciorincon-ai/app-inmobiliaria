import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import Aviso from "@/components/nuevos/Aviso";
import { esVacio } from "@/components/nuevos/etiquetas";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import PedirVisitaSala from "@/components/visita/PedirVisitaSala";
import { formatearFecha } from "@/engine/format/fecha";
import { edicionVigente, vistaVisitaSala } from "@/engine/vivienda-nueva/vista";
import { leerIdioma } from "@/i18n/ruta";
import { enIdioma, rellenar } from "@/i18n/textos";
import { cargarNuevos, hoyNuevos } from "@/lib/vivienda-nueva/datos";
import { VIVIENDA_NUEVA } from "@/textos/vivienda-nueva";

// Pedir la visita a la sala de ventas de un proyecto nuevo (maqueta 05, S13). Se calcula en el servidor para el día de hoy en
// Bogotá con la MISMA regla que la base: solo se ofrece con la edición vigente («mes sin edición» se dice y no se ofrece). La
// única isla de cliente es el formulario, que exige el WhatsApp verificado. `noindex` hasta H-4.
export const dynamic = "force-dynamic";

type Params = Promise<{ lang: string; slug: string }>;
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
  const t = enIdioma(VIVIENDA_NUEVA, lang);
  const lectura = RE_SLUG.test(slug)
    ? await leer(hoyNuevos(await headers()))
    : null;
  const proyecto =
    lectura?.estado === "ok"
      ? lectura.leida.proyectos.find((p) => p.slug === slug)
      : undefined;
  const nombre =
    proyecto && !esVacio(proyecto.nombre)
      ? String(proyecto.nombre)
      : t.meta.titulo;
  return {
    title: rellenar(t.visita.meta, { nombre }),
    robots: { index: false, follow: false },
  };
}

export default async function VisitaSalaPage({ params }: { params: Params }) {
  const lang = await leerIdioma(params);
  const { slug } = await params;
  if (!RE_SLUG.test(slug) || slug.length > 100) notFound();
  const t = enIdioma(VIVIENDA_NUEVA, lang);
  const hoy = hoyNuevos(await headers());
  const lectura = await leer(hoy);
  if (lectura.estado === "sin_publicar") notFound();

  const marco = (contenido: React.ReactNode) => (
    <>
      <EncabezadoInterior lang={lang} seccion="buscar" />
      <main className="mx-auto max-w-2xl px-6 py-6 pb-28 sm:pb-6">
        <Link
          href={`/nuevos/${slug}`}
          prefetch={false}
          className="text-sm font-semibold text-purple-600 underline underline-offset-4"
        >
          <span aria-hidden="true">← </span>
          {t.visita.volver}
        </Link>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink">
          {t.visita.titulo}
        </h1>
        {contenido}
      </main>
    </>
  );

  if (lectura.estado === "error") {
    return marco(
      <div className="mt-4">
        <Aviso tono="alerta" titulo={t.pagina.error.titulo}>
          <p>{t.pagina.error.detalle}</p>
        </Aviso>
      </div>,
    );
  }

  const { edicion, proyectos } = lectura.leida;
  const v = vistaVisitaSala(proyectos, edicionVigente([edicion], hoy), slug);
  if (!v) notFound();
  const p = v.proyecto;
  const detalle = [p.constructora, p.sector, p.ciudad]
    .filter((x) => !esVacio(x))
    .map(String)
    .join(" · ");
  return marco(
    <>
      <p className="mt-1 text-lg font-bold text-purple">
        {esVacio(p.nombre) ? t.tarjeta.nombreIlegible : String(p.nombre)}
      </p>
      {detalle && <p className="text-sm text-gray">{detalle}</p>}
      <p className="mt-1 text-sm text-mute">
        {rellenar(t.fuente, { n: edicion.numero })}
      </p>
      {v.estado === "sin_edicion" ? (
        <div className="mt-4">
          <Aviso tono="alerta" titulo={t.visita.sinEdicion.titulo}>
            <p>
              {rellenar(
                v.dias === 1
                  ? t.visita.sinEdicion.detalleUno
                  : t.visita.sinEdicion.detalle,
                { n: edicion.numero, dias: v.dias },
              )}
            </p>
            <Link
              href={`/nuevos/${slug}`}
              prefetch={false}
              className="mt-1 inline-block font-semibold text-purple-600 underline underline-offset-4"
            >
              {t.visita.sinEdicion.ficha}
            </Link>
          </Aviso>
          <p className="text-xs text-mute">
            {rellenar(t.pagina.vigencia, {
              desde: formatearFecha(edicion.desde, lang),
              hasta: formatearFecha(edicion.hasta, lang),
            })}
          </p>
        </div>
      ) : (
        <>
          {/* Texto estático y grande: es lo primero que se pinta (el LCP nace en el HTML, no tras leer la sesión). */}
          <p className="mt-4 text-gray">{t.visita.pedir.coordinamos}</p>
          <PedirVisitaSala slug={slug} t={t.visita} />
        </>
      )}
    </>,
  );
}
