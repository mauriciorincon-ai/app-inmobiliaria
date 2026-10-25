import Link from "next/link";
import type { Proyectado } from "@/i18n/textos";
import type { OPERADOR } from "@/textos/operador";

export type TextosNav = Proyectado<typeof OPERADOR.nav>;

// Navegación entre las secciones del panel del operador.
export default function PanelNav({
  actual,
  t,
}: {
  actual: string;
  t: TextosNav;
}) {
  const items = [
    { href: "/operador", etiqueta: t.registros },
    { href: "/operador/campana", etiqueta: t.campana },
    { href: "/operador/zonas", etiqueta: t.zonas },
    { href: "/operador/salas", etiqueta: t.salas },
    { href: "/operador/antifraude", etiqueta: t.antifraude },
    { href: "/operador/sesiones", etiqueta: t.sesiones },
  ] as const;
  return (
    <nav className="mt-6 flex flex-wrap gap-2" aria-label={t.etiqueta}>
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={actual === i.href ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            actual === i.href
              ? "bg-purple text-white"
              : "bg-purple-tint text-purple-600 hover:bg-purple-200"
          }`}
        >
          {i.etiqueta}
        </Link>
      ))}
    </nav>
  );
}
