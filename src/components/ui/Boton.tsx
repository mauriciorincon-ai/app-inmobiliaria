import Link from "next/link";
import type { ReactNode } from "react";

type Variante = "primario" | "oscuro" | "texto";

const estilos: Record<Variante, string> = {
  primario:
    "rounded-full bg-purple px-7 py-3.5 text-base font-semibold text-white shadow-card transition-transform hover:bg-purple-600 hover:scale-[1.03]",
  oscuro:
    "rounded-full bg-ink px-7 py-3.5 text-base font-semibold text-white shadow-card transition-transform hover:scale-[1.03]",
  texto: "text-sm font-semibold text-gray underline-offset-4 hover:underline",
};

type Comun = { variante?: Variante; className?: string; children: ReactNode };
type ComoLink = Comun & { href: string };
type ComoBoton = Comun & {
  href?: undefined;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
};

// Botón/enlace unificado. Con `href` renderiza <Link>; sin él, un <button>. Un solo lugar para los
// estilos de CTA (la base los duplicaba inline).
export default function Boton(props: ComoLink | ComoBoton) {
  const { variante = "primario", className = "", children } = props;
  const clase =
    `inline-flex items-center justify-center ${estilos[variante]} ${className}`.trim();

  if (props.href) {
    return (
      <Link href={props.href} className={clase}>
        {children}
      </Link>
    );
  }

  const b = props as ComoBoton;
  return (
    <button
      className={clase}
      type={b.type ?? "button"}
      onClick={b.onClick}
      disabled={b.disabled}
    >
      {children}
    </button>
  );
}

// Export nombrado además del default: `export *` (barriles, design-sync) no re-exporta defaults.
export { Boton };
