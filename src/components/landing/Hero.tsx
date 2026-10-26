import Boton from "@/components/ui/Boton";
import type { Idioma } from "@/i18n/idiomas";
import { enIdioma } from "@/i18n/textos";
import { LANDING } from "@/textos/landing";

// Hero ESTÁTICO (patrón lcp-nace-estatico): h1, subtítulo, CTA y arte nacen visibles — sin
// wrapper en opacity:0, sin máscara, sin GSAP. Solo el blob decorativo tiene float por CSS
// (transform, no toca el LCP y se apaga con prefers-reduced-motion). Server Component.
export default function Hero({ lang }: { lang: Idioma }) {
  const t = enIdioma(LANDING.hero, lang);
  return (
    <section className="relative overflow-hidden pt-28 lg:pt-36">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 pb-16 lg:grid-cols-2 lg:px-10 lg:pb-24">
        <div>
          <p className="inline-block rounded-full bg-purple-tint px-4 py-1.5 text-sm font-semibold text-purple-600">
            {t.etiqueta}
          </p>

          <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-[4.2rem]">
            {t.titulo.antes}
            <span className="pill">{t.titulo.resaltado}</span>
            {t.titulo.despues}
          </h1>

          <p className="mt-7 max-w-md text-lg leading-relaxed text-gray">
            {t.subtitulo.antes}
            <strong>{t.subtitulo.resaltado}</strong>
            {t.subtitulo.despues}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Boton href="/publicar">{t.cta}</Boton>
            <a
              href="#como-funciona"
              className="text-sm font-semibold text-gray underline-offset-4 hover:underline"
            >
              {t.comoFunciona}
            </a>
          </div>

          <p className="mt-6 text-sm text-mute">{t.garantias}</p>
        </div>

        {/* Arte: ilustración SVG (sin foto → sin licencia de terceros, LCP liviano). */}
        <div className="relative mx-auto w-full max-w-md">
          <svg
            aria-hidden="true"
            className="flota absolute inset-0 -z-10 h-full w-full scale-110"
            viewBox="0 0 480 460"
            fill="none"
          >
            <path
              d="M392 120c40 52 56 132 22 196-34 64-118 112-196 108S65 360 38 286 38 120 112 74 246 30 312 52s40 16 80 68Z"
              fill="#FFD23F"
            />
          </svg>

          <div className="relative mx-4 aspect-[4/5] rotate-[-2.5deg] overflow-hidden rounded-[2.5rem] bg-cream shadow-card">
            <svg
              viewBox="0 0 400 500"
              className="h-full w-full"
              role="img"
              aria-label={t.ilustracion}
            >
              <rect width="400" height="500" fill="#fbf9f6" />
              <rect
                x="70"
                y="230"
                width="260"
                height="180"
                rx="10"
                fill="#ffffff"
                stroke="#191a1d"
                strokeWidth="6"
              />
              <path
                d="M55 235 200 120 345 235Z"
                fill="#ebe9fc"
                stroke="#191a1d"
                strokeWidth="6"
                strokeLinejoin="round"
              />
              <rect
                x="170"
                y="315"
                width="60"
                height="95"
                rx="6"
                fill="#7b5dd6"
              />
              <rect
                x="100"
                y="270"
                width="55"
                height="55"
                rx="6"
                fill="#e7eefb"
                stroke="#191a1d"
                strokeWidth="5"
              />
              <rect
                x="245"
                y="270"
                width="55"
                height="55"
                rx="6"
                fill="#e7eefb"
                stroke="#191a1d"
                strokeWidth="5"
              />
              <path
                d="M300 150v-40h26v66"
                fill="#cdbaf2"
                stroke="#191a1d"
                strokeWidth="6"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Badge honesto (no es un número fabricado: la plataforma no cobra comisión). */}
          <div className="flota absolute -bottom-3 -left-2 rotate-[-2.5deg] rounded-2xl bg-white px-5 py-3 shadow-card">
            <p className="text-xs font-medium text-mute">{t.comision}</p>
            <p className="text-xl font-bold text-ink">
              {t.cero}{" "}
              <span className="text-sm font-medium text-purple-600">
                {t.paraTi}
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
