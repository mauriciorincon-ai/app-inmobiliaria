import Reveal from "@/components/motion/Reveal";
import type { Idioma } from "@/i18n/idiomas";
import { enIdioma } from "@/i18n/textos";
import { LANDING } from "@/textos/landing";

// Las tarjetas ya construidas llevan la estrella de calidad y «Ya disponible»; una que falte llevaría «Próximamente». Desde el S15
// las tres están construidas (la tercera: la sesión de fotos que el dueño pide desde «Mi anuncio»).
const YA_DISPONIBLE = [true, true, true] as const;

// Honesto: dice lo que ya funciona. Cualitativo, sin cifras (las de fotos están
// prohibidas por evidencia débil — design-system.md).
export default function QueViene({ lang }: { lang: Idioma }) {
  const t = enIdioma(LANDING.queViene, lang);
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 lg:px-10 lg:py-28">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {t.titulo}
        </h2>
        <p className="mt-4 text-lg text-gray">{t.subtitulo}</p>
      </div>

      <Reveal stagger className="mt-12 grid gap-6 sm:grid-cols-3">
        {t.tarjetas.map((c, i) => (
          <div
            key={c.titulo}
            className="rounded-[2rem] border border-purple-200 bg-white p-7"
          >
            <div className="flex items-center gap-2">
              {YA_DISPONIBLE[i] && (
                <span aria-hidden="true" className="text-lg text-purple">
                  ★
                </span>
              )}
              <h3 className="text-lg font-bold text-ink">{c.titulo}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-gray">{c.texto}</p>
            <p className="mt-4 inline-block rounded-full bg-purple-tint px-3 py-1 text-xs font-semibold text-purple-600">
              {YA_DISPONIBLE[i] ? t.ya : t.pronto}
            </p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
