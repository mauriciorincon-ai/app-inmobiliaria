import type { Metadata } from "next";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import Identificarse from "@/components/identificar/Identificarse";
import { rutaDeVuelta } from "@/engine/verificacion/sesion";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { IDENTIDAD } from "@/textos/identidad";

export async function generateMetadata({
  params,
}: PropsLang): Promise<Metadata> {
  const lang = await leerIdioma(params);
  return {
    title: enIdioma(IDENTIDAD.meta, lang).titulo,
    robots: { index: false, follow: false },
  };
}

// Identificarse con la cédula (S8, ADR 016). Opcional: sube la confianza del comprador. `?volver=` lleva de
// regreso a donde venía (la solicitud de visita); solo se acepta una ruta de esta misma app. Lo que depende
// del navegador (la cookie) lo resuelve el componente cliente; la página en sí no lee nada personal.
export default async function IdentificarsePage({
  params,
  searchParams,
}: PropsLang & { searchParams: Promise<{ volver?: string | string[] }> }) {
  const lang = await leerIdioma(params);
  const t = enIdioma(IDENTIDAD, lang);
  const { volver } = await searchParams;
  const destino = rutaDeVuelta(Array.isArray(volver) ? volver[0] : volver);
  return (
    <>
      <EncabezadoInterior lang={lang} />
      <main className="mx-auto max-w-xl px-6 py-10">
        <p className="inline-flex rounded-full bg-purple-tint px-3 py-1 text-xs font-semibold text-purple-600">
          ✓ {t.insignia}
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">
          {t.titulo}
        </h1>
        <p className="mt-2 text-sm text-gray">{t.subtitulo}</p>
        <p className="mt-1 text-xs text-mute">{t.limite}</p>
        <Identificarse t={t} volver={destino} />
      </main>
    </>
  );
}
