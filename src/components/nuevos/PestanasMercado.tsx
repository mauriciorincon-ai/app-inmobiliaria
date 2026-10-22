import Link from "next/link";
import type { TextosNuevos } from "./etiquetas";

// «Usados | Nuevos» (decisión 1 de la maqueta): vivienda nueva vive DENTRO de Buscar, la barra del comprador sigue en 4.
// Dos enlaces con `aria-current`, sin JavaScript; el mismo modelo del interruptor Venta | Arriendo de los filtros.
export default function PestanasMercado({
  activo,
  hrefUsados,
  hrefNuevos,
  t,
}: {
  activo: "usados" | "nuevos";
  hrefUsados: string;
  hrefNuevos: string;
  t: TextosNuevos["mercado"];
}) {
  const opciones = [
    { clave: "usados", href: hrefUsados, texto: t.usados },
    { clave: "nuevos", href: hrefNuevos, texto: t.nuevos },
  ] as const;
  return (
    <nav
      aria-label={t.grupo}
      className="mb-3 inline-flex rounded-full bg-purple-tint p-1"
    >
      {opciones.map((o) => (
        <Link
          key={o.clave}
          href={o.href}
          prefetch={false}
          aria-current={activo === o.clave ? "true" : undefined}
          className={`rounded-full px-5 py-1.5 text-sm font-semibold transition-colors ${
            activo === o.clave
              ? "bg-purple text-white"
              : "text-purple-600 hover:bg-purple-200"
          }`}
        >
          {o.texto}
        </Link>
      ))}
    </nav>
  );
}
