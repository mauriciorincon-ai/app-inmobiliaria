import type { Metadata } from "next";
import VistaLista from "@/components/guardados/VistaLista";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { COMUN } from "@/textos/comun";
import { GUARDADOS } from "@/textos/guardados";

export async function generateMetadata({
  params,
}: PropsLang): Promise<Metadata> {
  const lang = await leerIdioma(params);
  return {
    title: enIdioma(GUARDADOS.lista.meta, lang).titulo,
    robots: { index: false, follow: false },
  };
}

// Una lista compartida (S9, maqueta 07). Su token viaja en el fragmento (`/lista#t=…`), que no llega al
// servidor ni a los registros de acceso: la página es un cascarón estático y <VistaLista/> lo resuelve en el
// navegador. Cualquiera con el enlace la ve; escribir una nota exige el WhatsApp verificado.
export default async function ListaPage({ params }: PropsLang) {
  const lang = await leerIdioma(params);
  return (
    <>
      <EncabezadoInterior lang={lang} seccion="guardados" />
      <main className="mx-auto max-w-2xl px-6 py-8 pb-28 sm:pb-10">
        <VistaLista
          lang={lang}
          t={enIdioma(GUARDADOS.lista, lang)}
          tipos={enIdioma(COMUN.dominio.tipo, lang)}
        />
      </main>
    </>
  );
}
