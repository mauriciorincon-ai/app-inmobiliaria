import Link from "next/link";
import Logo from "@/components/ui/Logo";
import type { Idioma } from "@/i18n/idiomas";
import { enIdioma } from "@/i18n/textos";
import { COMUN } from "@/textos/comun";

// Footer estático. Marca en blanco sobre tinta + enlaces mínimos. Mensaje seller-first.
export default function Footer({ lang }: { lang: Idioma }) {
  const t = enIdioma(COMUN, lang);
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <Logo tono="blanco" etiqueta={t.nav.inicio} />
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              {t.pie.lema}
            </p>
          </div>
          <nav
            aria-label={t.pie.enlaces}
            className="flex flex-col gap-3 text-sm"
          >
            <Link
              href="/#como-funciona"
              className="text-white/80 underline-offset-4 hover:underline"
            >
              {t.nav.comoFunciona}
            </Link>
            <Link
              href="/publicar"
              className="text-white/80 underline-offset-4 hover:underline"
            >
              {t.pie.publicarInmueble}
            </Link>
            <Link
              href="/privacidad"
              className="text-white/80 underline-offset-4 hover:underline"
            >
              {t.pie.privacidad}
            </Link>
          </nav>
        </div>
        <p className="mt-10 border-t border-white/10 pt-6 text-xs text-white/50">
          {t.pie.derechos}
        </p>
      </div>
    </footer>
  );
}
