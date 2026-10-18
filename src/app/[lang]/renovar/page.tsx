import type { Metadata } from "next";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma, rellenar } from "@/i18n/textos";
import { VIGENCIA } from "@/textos/mi-anuncio";
import { VIGENCIA_DIAS } from "@/engine/vigencia/vigencia";
import RenovarPagina from "@/components/renovar/RenovarPagina";

// El token viaja en el fragment (#t=…), que jamás llega al servidor ni a logs (ADR-004), igual que
// /mi-anuncio. Shell estático; el cliente resuelve el token y renueva por POST. Ruta privada → noindex.
export async function generateMetadata({
  params,
}: PropsLang): Promise<Metadata> {
  const lang = await leerIdioma(params);
  return {
    title: enIdioma(VIGENCIA.meta, lang).titulo,
    robots: { index: false, follow: false },
  };
}

export default async function RenovarPage({ params }: PropsLang) {
  const lang = await leerIdioma(params);
  const t = enIdioma(VIGENCIA.pagina, lang);
  return (
    <>
      <EncabezadoInterior lang={lang} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          {t.titulo}
        </h1>
        <p className="mt-1 text-sm text-mute">
          {rellenar(t.subtitulo, { dias: VIGENCIA_DIAS })}
        </p>
        <RenovarPagina
          lang={lang}
          t={t}
          tarjeta={enIdioma(VIGENCIA.tarjeta, lang)}
        />
      </main>
    </>
  );
}
