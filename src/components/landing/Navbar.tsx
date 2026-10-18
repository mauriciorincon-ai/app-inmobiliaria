import Logo from "@/components/ui/Logo";
import Boton from "@/components/ui/Boton";
import SelectorIdioma from "@/components/ui/SelectorIdioma";
import type { Idioma } from "@/i18n/idiomas";
import { enIdioma } from "@/i18n/textos";
import { COMUN } from "@/textos/comun";

// Header estático (sin motion, sin estado). Logo + acceso al flujo de publicar. En móvil se
// mantiene mínimo: marca + selector + CTA, sin menú desplegable que estorbe al vendedor apurado.
export default function Navbar({ lang }: { lang: Idioma }) {
  const t = enIdioma(COMUN, lang);
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <nav
        aria-label={t.nav.principal}
        className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10"
      >
        <Logo etiqueta={t.nav.inicio} />
        <div className="flex items-center gap-3 sm:gap-5">
          <a
            href="#como-funciona"
            className="hidden text-sm font-semibold text-gray underline-offset-4 hover:underline sm:inline"
          >
            {t.nav.comoFunciona}
          </a>
          <SelectorIdioma idioma={lang} etiqueta={t.selector.etiqueta} />
          <Boton href="/publicar" className="!px-5 !py-2.5 text-sm">
            {t.nav.publicar}
          </Boton>
        </div>
      </nav>
    </header>
  );
}
