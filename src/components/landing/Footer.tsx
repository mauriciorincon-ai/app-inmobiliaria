import Link from "next/link";
import Logo from "@/components/ui/Logo";

// Footer estático. Marca en blanco sobre tinta + enlaces mínimos. Mensaje seller-first.
export default function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <Logo tono="blanco" />
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              La casa de los vendedores directos en Bogotá. Vende sin comisión y
              sin intermediarios.
            </p>
          </div>
          <nav
            aria-label="Enlaces del pie"
            className="flex flex-col gap-3 text-sm"
          >
            <Link
              href="/#como-funciona"
              className="text-white/80 underline-offset-4 hover:underline"
            >
              Cómo funciona
            </Link>
            <Link
              href="/publicar"
              className="text-white/80 underline-offset-4 hover:underline"
            >
              Publicar inmueble
            </Link>
            <Link
              href="/privacidad"
              className="text-white/80 underline-offset-4 hover:underline"
            >
              Política de privacidad
            </Link>
          </nav>
        </div>
        <p className="mt-10 border-t border-white/10 pt-6 text-xs text-white/50">
          © 2026 Innmobiliaria · Hecho en Bogotá para vendedores directos.
        </p>
      </div>
    </footer>
  );
}
