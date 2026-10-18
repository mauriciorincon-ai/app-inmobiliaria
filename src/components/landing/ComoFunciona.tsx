import Reveal from "@/components/motion/Reveal";
import type { Idioma } from "@/i18n/idiomas";
import { enIdioma } from "@/i18n/textos";
import { LANDING } from "@/textos/landing";

// "Publicar = registrarse" — el mensaje central de la app. Bajo el fold → Reveal.
export default function ComoFunciona({ lang }: { lang: Idioma }) {
  const t = enIdioma(LANDING.comoFunciona, lang);
  return (
    <section id="como-funciona" className="pastel-band">
      <div className="mx-auto max-w-6xl px-6 py-24 lg:px-10 lg:py-32">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {t.titulo.antes}
            <span className="pill">{t.titulo.resaltado}</span>
            {t.titulo.despues}
          </h2>
          <p className="mt-4 text-lg text-gray">{t.subtitulo}</p>
        </div>

        <Reveal stagger className="mt-12 grid gap-6 md:grid-cols-3">
          {t.pasos.map((p, i) => (
            <div
              key={p.titulo}
              className="rounded-[2rem] bg-white p-7 shadow-card"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-purple text-lg font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-5 text-lg font-bold text-ink">{p.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray">
                {p.texto}
              </p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
