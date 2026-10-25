import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReportarAnuncio from "@/components/antifraude/ReportarAnuncio";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { formatearCOP } from "@/engine/format/cop";
import { leerIdioma } from "@/i18n/ruta";
import { enIdioma, rellenar } from "@/i18n/textos";
import { cargarFicha } from "@/lib/ficha-datos";
import { ANTIFRAUDE } from "@/textos/antifraude";
import { COMUN } from "@/textos/comun";
import { FICHA } from "@/textos/ficha";

// Reportar un anuncio (S15, maqueta 12). Solo se reporta lo que se ve: un anuncio vencido o pausado no tiene ficha y esta
// página responde 404. Lo que depende del navegador (la sesión del comprador) lo resuelve el componente cliente.
export const dynamic = "force-dynamic";

type Params = Promise<{ lang: string; slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const lang = await leerIdioma(params);
  return {
    title: enIdioma(ANTIFRAUDE.reportar.meta, lang).titulo,
    robots: { index: false, follow: false },
  };
}

export default async function ReportarPage({ params }: { params: Params }) {
  const lang = await leerIdioma(params);
  const { slug } = await params;
  const f = await cargarFicha(slug);
  if (!f) notFound();

  const t = enIdioma(ANTIFRAUDE, lang);
  const tipos: Record<string, string> = enIdioma(COMUN.dominio.tipo, lang);
  const inmueble = rellenar(enIdioma(FICHA.encabezado.titulo, lang), {
    tipo: tipos[f.tipo] ?? tipos.inmueble,
    barrio: f.barrio,
  });

  return (
    <>
      <EncabezadoInterior lang={lang} seccion="buscar" />
      <main className="mx-auto max-w-xl px-6 py-8 pb-28 sm:pb-8">
        <Link
          href={`/i/${f.slug}`}
          className="text-sm font-semibold text-purple-600 underline underline-offset-4"
        >
          <span aria-hidden="true">← </span>
          {t.reportar.volver}
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink">
          {t.reportar.titulo}
        </h1>
        <p className="mt-2 text-sm text-gray">
          {rellenar(t.reportar.subtitulo, {
            inmueble,
            precio: formatearCOP(f.precio_esperado, lang),
          })}
        </p>
        <ReportarAnuncio
          slug={f.slug}
          t={t.reportar}
          motivos={t.motivos}
          protegete={t.protegete}
        />
        <p className="mt-8 text-sm">
          <Link
            href="/antifraude"
            className="font-semibold text-purple-600 underline underline-offset-4"
          >
            {t.reportar.reglas}
          </Link>
        </p>
      </main>
    </>
  );
}
