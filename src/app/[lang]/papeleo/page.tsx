import type { Metadata } from "next";
import { headers } from "next/headers";
import CambiarHerramienta from "@/components/herramientas/CambiarHerramienta";
import PapeleoCarga from "@/components/papeleo/PapeleoCarga";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { leerEntrada } from "@/engine/papeleo/formulario";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { CIUDADES } from "@/lib/papeleo/datos";
import { hoyNuevos } from "@/lib/vivienda-nueva/datos";
import { HERRAMIENTAS } from "@/textos/herramientas";
import { PAPELEO } from "@/textos/papeleo";
import { PAPELEO_CLAUSULAS } from "@/textos/papeleo-clausulas";

// Papeleo → el asistente del cierre (maqueta 11): gastos por actor con su norma, qué pedir antes de firmar, plazos y qué dice
// cada documento. El encabezado nace estático (LCP); el asistente se carga diferido. Lo que llega en la URL (`?precio=` desde
// una ficha) es el precio del inmueble, nunca nada de la persona; lo que se escribe después no sale del teléfono.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PropsLang): Promise<Metadata> {
  const lang = await leerIdioma(params);
  const t = enIdioma(PAPELEO.meta, lang);
  return {
    title: t.titulo,
    description: t.descripcion,
    robots: { index: false, follow: false },
  };
}

export default async function PapeleoPage({
  params,
  searchParams,
}: PropsLang & {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await leerIdioma(params);
  const inicial = leerEntrada(await searchParams, CIUDADES);
  const hoy = hoyNuevos(await headers());
  const t = enIdioma(PAPELEO, lang);
  const h = enIdioma(HERRAMIENTAS, lang);

  return (
    <>
      <EncabezadoInterior lang={lang} seccion="herramientas" />
      <main className="mx-auto max-w-4xl px-6 py-8 pb-28 sm:pb-8">
        <CambiarHerramienta actual="papeleo" t={h} />
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink">
          {t.pagina.titulo}
        </h1>
        <p className="mt-1 text-gray">{t.pagina.bajada}</p>
        <PapeleoCarga
          lang={lang}
          t={t}
          c={enIdioma(PAPELEO_CLAUSULAS, lang)}
          inicial={inicial}
          hoy={hoy}
          desdeAnuncio={inicial.precio !== null}
        />
      </main>
    </>
  );
}
