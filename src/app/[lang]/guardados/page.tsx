import type { Metadata } from "next";
import Guardados from "@/components/guardados/Guardados";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { BUSCAR } from "@/textos/buscar";
import { COMUN } from "@/textos/comun";
import { FICHA } from "@/textos/ficha";
import { GUARDADOS } from "@/textos/guardados";

export async function generateMetadata({
  params,
}: PropsLang): Promise<Metadata> {
  const lang = await leerIdioma(params);
  return {
    title: enIdioma(GUARDADOS.meta, lang).titulo,
    robots: { index: false, follow: false },
  };
}

// Guardados (S9, maqueta 07). Un cascarón estático: lo que depende de este teléfono (los favoritos) y de la
// sesión lo resuelve el componente cliente. La tabla de comparar y las listas se descargan al abrir su pestaña.
export default async function GuardadosPage({ params }: PropsLang) {
  const lang = await leerIdioma(params);
  const ficha = enIdioma(FICHA, lang);
  return (
    <>
      <EncabezadoInterior lang={lang} seccion="guardados" />
      <main className="mx-auto max-w-4xl px-6 py-8 pb-28 sm:pb-10">
        <Guardados
          lang={lang}
          t={enIdioma(GUARDADOS, lang)}
          tSello={ficha.sello}
          tVivo={ficha.vivo}
          tTarjeta={enIdioma(BUSCAR.tarjeta, lang)}
          tFavorito={enIdioma(COMUN.favorito, lang)}
          tipos={enIdioma(COMUN.dominio.tipo, lang)}
        />
      </main>
    </>
  );
}
