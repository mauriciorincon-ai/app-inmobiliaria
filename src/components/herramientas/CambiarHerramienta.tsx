import Link from "next/link";

type Herramienta = "simulador" | "papeleo";

const RUTA: Record<Herramienta, string> = {
  simulador: "/herramientas",
  papeleo: "/papeleo",
};

// Une las dos herramientas del comprador (maqueta 11): Simulador | Papeleo. Va en las dos páginas; la actual lleva `aria-current`.
export default function CambiarHerramienta({
  actual,
  t,
}: {
  actual: Herramienta;
  t: { grupo: string; simulador: string; papeleo: string };
}) {
  return (
    <div
      role="group"
      aria-label={t.grupo}
      className="inline-flex rounded-full border border-purple-200 bg-white p-1"
    >
      {(["simulador", "papeleo"] as const).map((h) => (
        <Link
          key={h}
          href={RUTA[h]}
          prefetch={false}
          aria-current={h === actual ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            h === actual
              ? "bg-purple text-white"
              : "text-purple-600 hover:bg-purple-tint"
          }`}
        >
          {t[h]}
        </Link>
      ))}
    </div>
  );
}
