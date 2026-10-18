import type { Metadata } from "next";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma } from "@/i18n/textos";
import { LANDING } from "@/textos/landing";
import { PUBLICAR } from "@/textos/publicar";
import { REFERIDO } from "@/textos/referido";
import Boton from "@/components/ui/Boton";
import MagicLinkGuardar from "@/components/confirmacion/MagicLinkGuardar";
import PaqueteFundador from "@/components/paquete/PaqueteFundador";

export async function generateMetadata({
  params,
}: PropsLang): Promise<Metadata> {
  const lang = await leerIdioma(params);
  return { title: enIdioma(PUBLICAR.confirmacion.meta, lang).titulo };
}

// Confirmación STATELESS (contenido genérico): auditable por Lighthouse y a prueba de visita
// directa. No lee la BD ni depende de parámetros.
export default async function Confirmacion({ params }: PropsLang) {
  const lang = await leerIdioma(params);
  const t = enIdioma(PUBLICAR.confirmacion, lang);
  return (
    <>
      <EncabezadoInterior lang={lang} />
      <main className="mx-auto max-w-2xl px-6 py-16 lg:py-24">
        <span
          aria-hidden="true"
          className="grid h-14 w-14 place-items-center rounded-full bg-purple text-2xl text-white"
        >
          ✓
        </span>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          {t.titulo}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-gray">{t.intro}</p>

        <MagicLinkGuardar
          lang={lang}
          t={t.enlace}
          referido={enIdioma(REFERIDO, lang)}
        />

        <ol className="mt-10 space-y-5">
          {t.siguientes.map((s, i) => (
            <li
              key={s.titulo}
              className="flex gap-4 rounded-[2rem] bg-cream p-6 shadow-soft"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-purple text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <h2 className="text-base font-bold text-ink">{s.titulo}</h2>
                <p className="mt-1 text-sm leading-relaxed text-gray">
                  {s.texto}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <PaqueteFundador
          t={enIdioma(LANDING.paquete, lang)}
          lang={lang}
          compacto
        />

        <div className="mt-10">
          <Boton href="/">{t.volver}</Boton>
        </div>
      </main>
    </>
  );
}
