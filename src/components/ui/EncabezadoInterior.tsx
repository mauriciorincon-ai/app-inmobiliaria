import Logo from "@/components/ui/Logo";
import SelectorIdioma from "@/components/ui/SelectorIdioma";
import type { Idioma } from "@/i18n/idiomas";
import { enIdioma } from "@/i18n/textos";
import { COMUN } from "@/textos/comun";

// Encabezado estático para páginas interiores (publicar, confirmación, privacidad): a diferencia
// del Navbar de la landing, ocupa espacio en el flujo (no es absoluto sobre un hero). Lleva el
// selector de idioma en todas las pantallas interiores.
export default function EncabezadoInterior({ lang }: { lang: Idioma }) {
  const t = enIdioma(COMUN, lang);
  return (
    <header className="border-b border-purple-200/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5 lg:px-10">
        <Logo etiqueta={t.nav.inicio} />
        <SelectorIdioma idioma={lang} etiqueta={t.selector.etiqueta} />
      </div>
    </header>
  );
}

// Export nombrado además del default: `export *` (barriles, design-sync) no re-exporta defaults.
export { EncabezadoInterior };
