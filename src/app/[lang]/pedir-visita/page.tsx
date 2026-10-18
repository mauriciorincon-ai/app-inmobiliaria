import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import PedirVisita from "@/components/visita/PedirVisita";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma, rellenar } from "@/i18n/textos";
import { COMUN } from "@/textos/comun";
import { FICHA } from "@/textos/ficha";
import { VISITA } from "@/textos/visita";
import { crearClienteAnon } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PropsLang): Promise<Metadata> {
  const lang = await leerIdioma(params);
  return {
    title: enIdioma(VISITA.pedir.meta, lang).titulo,
    robots: { index: false, follow: false },
  };
}

// Pedir una visita (S8). `?slug=` es el anuncio: se lee de la base por la RPC pública de la ficha. Lo que
// depende del navegador (la sesión del comprador) lo resuelve el componente cliente.
export default async function PedirVisitaPage({
  params,
  searchParams,
}: PropsLang & { searchParams: Promise<{ slug?: string | string[] }> }) {
  const lang = await leerIdioma(params);
  const { slug: crudo } = await searchParams;
  const slug = Array.isArray(crudo) ? crudo[0] : crudo;
  if (!slug || !/^[a-z0-9-]{3,120}$/.test(slug)) notFound();
  const { data: ficha } = await crearClienteAnon().rpc("obtener_ficha", {
    p_slug: slug,
  });
  if (!ficha) notFound();

  const tipos: Record<string, string> = enIdioma(COMUN.dominio.tipo, lang);
  const t = enIdioma(VISITA, lang);
  const inmueble = rellenar(enIdioma(FICHA.encabezado.titulo, lang), {
    tipo: tipos[ficha.tipo] ?? tipos.inmueble,
    barrio: ficha.barrio,
  });
  return (
    <>
      <EncabezadoInterior lang={lang} />
      <main className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          {t.pedir.titulo}
        </h1>
        <p className="mt-1 text-lg font-bold text-purple">{inmueble}</p>
        <p className="mt-2 text-sm text-gray">{t.pedir.subtitulo}</p>
        <PedirVisita
          slug={slug}
          t={t.pedir}
          intenciones={t.intencion}
          formasPago={t.formasPago}
          soloIdentificados={ficha.solo_identificados}
          contactoAbierto={ficha.contacto_publico}
        />
      </main>
    </>
  );
}
