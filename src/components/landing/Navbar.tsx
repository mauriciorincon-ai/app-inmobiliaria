import Logo from "@/components/ui/Logo";
import Boton from "@/components/ui/Boton";

// Header estático (sin motion, sin estado). Logo + acceso al flujo de publicar. En móvil se
// mantiene mínimo: marca + CTA, sin menú desplegable que estorbe al vendedor apurado.
export default function Navbar() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <nav
        aria-label="Principal"
        className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10"
      >
        <Logo />
        <div className="flex items-center gap-5">
          <a
            href="#como-funciona"
            className="hidden text-sm font-semibold text-gray underline-offset-4 hover:underline sm:inline"
          >
            Cómo funciona
          </a>
          <Boton href="/publicar" className="!px-5 !py-2.5 text-sm">
            Publicar
          </Boton>
        </div>
      </nav>
    </header>
  );
}
