import Link from "next/link";

const items = [
  { href: "/operador", label: "Registros" },
  { href: "/operador/campana", label: "Campaña" },
  { href: "/operador/zonas", label: "Zonas y cupos" },
] as const;

// Navegación entre las secciones del panel del operador.
export default function PanelNav({ actual }: { actual: string }) {
  return (
    <nav className="mt-6 flex flex-wrap gap-2" aria-label="Secciones del panel">
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
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
