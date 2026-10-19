import type { Metadata } from "next";
import Baja from "@/components/alertas/Baja";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { ALERTAS } from "@/textos/alertas";

export async function generateMetadata({
  params,
}: PropsLang): Promise<Metadata> {
  const lang = await leerIdioma(params);
  return {
    title: enIdioma(ALERTAS.baja.meta, lang).titulo,
    robots: { index: false, follow: false },
  };
}

// La baja en un clic (S9, ADR 017): `/baja#t=…` llega por el enlace de cada correo de alertas. El token vive
// en el fragmento (no llega al servidor ni a sus registros) y la baja NO pide sesión. Sin barra del comprador:
// quien llega aquí viene de un correo, solo quiere dejar de recibirlo.
export default async function BajaPage({ params }: PropsLang) {
  const lang = await leerIdioma(params);
  return (
    <>
      <EncabezadoInterior lang={lang} />
      <main className="mx-auto max-w-xl px-6 py-10">
        <Baja t={enIdioma(ALERTAS.baja, lang)} />
      </main>
    </>
  );
}
