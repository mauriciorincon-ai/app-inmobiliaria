import Reveal from "@/components/motion/Reveal";
import type { Idioma } from "@/i18n/idiomas";
import { enIdioma } from "@/i18n/textos";
import { LANDING } from "@/textos/landing";

// Dolores del vendedor con cifras CITABLES únicamente (design-system.md). Bajo el fold → Reveal.
export default function Dolores({ lang }: { lang: Idioma }) {
  const t = enIdioma(LANDING.dolores, lang);
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 lg:px-10 lg:py-28">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {t.titulo.antes}
          <span className="underline-doodle">{t.titulo.resaltado}</span>
        </h2>
        <p className="mt-4 text-lg text-gray">{t.subtitulo}</p>
      </div>

      <Reveal stagger className="mt-12 grid gap-6 sm:grid-cols-3">
        {t.tarjetas.map((d) => (
          <div
            key={d.titulo}
            className="rounded-[2rem] bg-cream p-7 shadow-soft"
          >
            <p className="text-3xl font-extrabold text-purple">{d.cifra}</p>
            <h3 className="mt-3 text-lg font-bold text-ink">{d.titulo}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray">{d.texto}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
