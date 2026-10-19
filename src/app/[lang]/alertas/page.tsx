import type { Metadata } from "next";
import MisAlertas from "@/components/alertas/MisAlertas";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { ALERTAS } from "@/textos/alertas";

export async function generateMetadata({
  params,
}: PropsLang): Promise<Metadata> {
  const lang = await leerIdioma(params);
  return {
    title: enIdioma(ALERTAS.mias.meta, lang).titulo,
    robots: { index: false, follow: false },
  };
}

// Mis alertas (S9, maqueta 08). Un cascarón estático: los tokens de este teléfono (y los del fragmento, si
// llegó por un enlace del correo) los resuelve el componente cliente. Nada personal se lee en el servidor.
export default async function AlertasPage({ params }: PropsLang) {
  const lang = await leerIdioma(params);
  return (
    <>
      <EncabezadoInterior lang={lang} seccion="alertas" />
      <main className="mx-auto max-w-2xl px-6 py-8 pb-28 sm:pb-10">
        <MisAlertas lang={lang} t={enIdioma(ALERTAS.mias, lang)} />
      </main>
    </>
  );
}
