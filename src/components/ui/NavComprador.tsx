import Link from "next/link";
import type { Idioma } from "@/i18n/idiomas";
import { enIdioma } from "@/i18n/textos";
import { NAV_COMPRADOR } from "@/textos/nav-comprador";

export type SeccionComprador =
  "buscar" | "guardados" | "alertas" | "herramientas";

const SECCIONES: { clave: SeccionComprador; ruta: string }[] = [
  { clave: "buscar", ruta: "/buscar" },
  { clave: "guardados", ruta: "/guardados" },
  { clave: "alertas", ruta: "/alertas" },
  { clave: "herramientas", ruta: "/herramientas" },
];

// La navegación del comprador (S9–S10, maqueta 07/08/10): Buscar · Guardados · Alertas · Herramientas. Sin
// JavaScript. En escritorio vive en la cabecera; en el teléfono es una barra inferior fija. Las páginas que la llevan
// dejan espacio abajo (`pb-28`) para que la barra no tape el final. Los enlaces NO se precargan (`prefetch={false}`):
// precargar Guardados, Alertas y Herramientas desde la búsqueda y la ficha les sumaba script a cada una (el presupuesto
// no sube).
export default function NavComprador({
  lang,
  seccion,
  variante,
}: {
  lang: Idioma;
  seccion: SeccionComprador;
  variante: "cabecera" | "barra";
}) {
  const t = enIdioma(NAV_COMPRADOR, lang);
  const enBarra = variante === "barra";
  return (
    <nav
      aria-label={t.grupo}
      className={
        enBarra
          ? "fixed inset-x-0 bottom-0 z-30 border-t border-purple-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden"
          : "hidden items-center gap-6 sm:flex"
      }
    >
      <ul className={enBarra ? "grid grid-cols-4" : "flex items-center gap-6"}>
        {SECCIONES.map(({ clave, ruta }) => {
          const activa = clave === seccion;
          return (
            <li key={clave}>
              <Link
                href={ruta}
                prefetch={false}
                aria-current={activa ? "page" : undefined}
                className={
                  enBarra
                    ? `flex min-h-14 items-center justify-center px-1 text-xs font-semibold ${
                        activa
                          ? "bg-purple-tint text-purple-600"
                          : "text-gray hover:bg-purple-tint"
                      }`
                    : `text-sm font-semibold underline-offset-4 hover:underline ${
                        activa ? "text-purple-600 underline" : "text-gray"
                      }`
                }
              >
                {t[clave]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export { NavComprador };
