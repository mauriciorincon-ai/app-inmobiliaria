import Logo from "@/components/ui/Logo";

// Encabezado estático para páginas interiores (publicar, confirmación, privacidad): a diferencia
// del Navbar de la landing, ocupa espacio en el flujo (no es absoluto sobre un hero).
export default function EncabezadoInterior() {
  return (
    <header className="border-b border-purple-200/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5 lg:px-10">
        <Logo />
      </div>
    </header>
  );
}
