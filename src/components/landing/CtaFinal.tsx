import Boton from "@/components/ui/Boton";
import type { Idioma } from "@/i18n/idiomas";
import { enIdioma } from "@/i18n/textos";
import { LANDING } from "@/textos/landing";

// Cierre de la landing: banda pastel con la llamada final a publicar.
export default function CtaFinal({ lang }: { lang: Idioma }) {
  const t = enIdioma(LANDING.ctaFinal, lang);
  const cta = enIdioma(LANDING.hero.cta, lang);
  return (
    <section className="pastel-band">
      <div className="mx-auto max-w-4xl px-6 py-24 text-center lg:px-10 lg:py-28">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {t.titulo}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray">{t.texto}</p>
        <div className="mt-9 flex justify-center">
          <Boton href="/publicar">{cta}</Boton>
        </div>
      </div>
    </section>
  );
}
