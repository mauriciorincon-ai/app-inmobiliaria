import type { Metadata } from "next";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { FICHA } from "@/textos/ficha";
import { LANDING } from "@/textos/landing";
import { MI_ANUNCIO, VIGENCIA } from "@/textos/mi-anuncio";
import { REFERIDO } from "@/textos/referido";
import MiAnuncio from "@/components/mi-anuncio/MiAnuncio";

// El token viaja en el fragment (#t=…), que solo existe en el cliente → la página es un shell
// estático (LCP-safe: el h1 nace visible) y <MiAnuncio/> resuelve el token y carga los datos.
export async function generateMetadata({
  params,
}: PropsLang): Promise<Metadata> {
  const lang = await leerIdioma(params);
  return {
    title: enIdioma(MI_ANUNCIO.meta, lang).titulo,
    robots: { index: false, follow: false },
  };
}

export default async function MiAnuncioPage({ params }: PropsLang) {
  const lang = await leerIdioma(params);
  const t = enIdioma(MI_ANUNCIO, lang);
  return (
    <>
      <EncabezadoInterior lang={lang} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          {t.titulo}
        </h1>
        <p className="mt-1 text-sm text-mute">{t.subtitulo}</p>
        <MiAnuncio
          lang={lang}
          t={t}
          tSello={enIdioma(FICHA.sello, lang)}
          vigencia={enIdioma(VIGENCIA.tarjeta, lang)}
          referido={enIdioma(REFERIDO, lang)}
          paquete={enIdioma(LANDING.paquete, lang)}
        />
      </main>
    </>
  );
}
