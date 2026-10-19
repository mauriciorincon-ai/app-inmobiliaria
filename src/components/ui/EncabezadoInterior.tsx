import Link from "next/link";
import Logo from "@/components/ui/Logo";
import NavComprador, {
  type SeccionComprador,
} from "@/components/ui/NavComprador";
import SelectorIdioma from "@/components/ui/SelectorIdioma";
import type { Idioma } from "@/i18n/idiomas";
import { enIdioma } from "@/i18n/textos";
import { COMUN } from "@/textos/comun";

// Encabezado estático para páginas interiores (publicar, confirmación, privacidad): a diferencia
// del Navbar de la landing, ocupa espacio en el flujo (no es absoluto sobre un hero). Lleva el
// selector de idioma en todas las pantallas interiores. Las páginas del comprador pasan su `seccion` (S9) y
// llevan Buscar · Guardados · Alertas: en la cabecera en escritorio y en una barra inferior en el teléfono.
export default function EncabezadoInterior({
  lang,
  seccion,
}: {
  lang: Idioma;
  seccion?: SeccionComprador;
}) {
  const t = enIdioma(COMUN, lang);
  return (
    <>
      <header className="border-b border-purple-200/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5 lg:px-10">
          <Logo etiqueta={t.nav.inicio} />
          <div className="flex items-center gap-4 sm:gap-6">
            {seccion ? (
              <NavComprador lang={lang} seccion={seccion} variante="cabecera" />
            ) : (
              <Link
                href="/buscar"
                className="text-sm font-semibold text-gray underline-offset-4 hover:underline"
              >
                {t.nav.buscar}
              </Link>
            )}
            <SelectorIdioma idioma={lang} etiqueta={t.selector.etiqueta} />
          </div>
        </div>
      </header>
      {seccion && (
        <NavComprador lang={lang} seccion={seccion} variante="barra" />
      )}
    </>
  );
}

// Export nombrado además del default: `export *` (barriles, design-sync) no re-exporta defaults.
export { EncabezadoInterior };
