import type { Metadata } from "next";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import Verificar from "@/components/verificar/Verificar";
import { rutaDeVuelta } from "@/engine/verificacion/sesion";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { VERIFICAR } from "@/textos/verificar";

export async function generateMetadata({
  params,
}: PropsLang): Promise<Metadata> {
  const lang = await leerIdioma(params);
  return {
    title: enIdioma(VERIFICAR.meta, lang).titulo,
    robots: { index: false, follow: false },
  };
}

// Verificar el WhatsApp del comprador (S7, ADR 015). `?volver=` lleva de regreso a la ficha; solo se
// acepta una ruta de esta misma app. El contenido que depende del navegador (la cookie) lo resuelve el
// componente cliente; la página en sí no lee nada personal.
export default async function VerificarPage({
  params,
  searchParams,
}: PropsLang & { searchParams: Promise<{ volver?: string | string[] }> }) {
  const lang = await leerIdioma(params);
  const t = enIdioma(VERIFICAR, lang);
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
        <Verificar lang={lang} t={t} volver={destino} />
      </main>
    </>
  );
}
