import type { Metadata } from "next";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import MiAnuncio from "@/components/mi-anuncio/MiAnuncio";

// El token viaja en el fragment (#t=…), que solo existe en el cliente → la página es un shell
// estático (LCP-safe: el h1 nace visible) y <MiAnuncio/> resuelve el token y carga los datos.
export const metadata: Metadata = {
  title: "Mi anuncio — Innmobiliaria",
  robots: { index: false, follow: false },
};

export default function MiAnuncioPage() {
  return (
    <>
      <EncabezadoInterior />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Completa tu anuncio
        </h1>
        <p className="mt-1 text-sm text-mute">
          Entre más completo, mejor luce para los interesados. Vas guardando a
          medida que avanzas.
        </p>
        <MiAnuncio />
      </main>
    </>
  );
}
