import type { Metadata } from "next";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import VisitaComprador from "@/components/visita/VisitaComprador";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { COMUN } from "@/textos/comun";
import { VISITA } from "@/textos/visita";

export async function generateMetadata({
  params,
}: PropsLang): Promise<Metadata> {
  const lang = await leerIdioma(params);
  return {
    title: enIdioma(VISITA.pagina.meta, lang).titulo,
    robots: { index: false, follow: false },
  };
}

// La solicitud de visita del comprador (S8, maqueta 06). El token de SU solicitud viaja en el fragmento
// (`/visita#t=…`), que no llega al servidor ni a los registros de acceso: la página es un shell estático y
// <VisitaComprador/> lo resuelve en el navegador. Llega por el correo y funciona desde cualquier navegador.
export default async function VisitaPage({ params }: PropsLang) {
  const lang = await leerIdioma(params);
  const t = enIdioma(VISITA, lang);
  return (
    <>
      <EncabezadoInterior lang={lang} />
      <main className="mx-auto max-w-xl px-6 py-10">
        <VisitaComprador
          lang={lang}
          t={t.pagina}
          tipos={enIdioma(COMUN.dominio.tipo, lang)}
        />
      </main>
    </>
  );
}
