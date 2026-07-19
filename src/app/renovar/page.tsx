import type { Metadata } from "next";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import RenovarPagina from "@/components/renovar/RenovarPagina";

// El token viaja en el fragment (#t=…), que jamás llega al servidor ni a logs (ADR-004), igual que
// /mi-anuncio. Shell estático; el cliente resuelve el token y renueva por POST. Ruta privada → noindex.
export const metadata: Metadata = {
  title: "Renovar mi anuncio — Innmobiliaria",
  robots: { index: false, follow: false },
};

export default function RenovarPage() {
  return (
    <>
      <EncabezadoInterior />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Renueva tu anuncio
        </h1>
        <p className="mt-1 text-sm text-mute">
          Un clic y tu inmueble sigue vivo 60 días más.
        </p>
        <RenovarPagina />
      </main>
    </>
  );
}
