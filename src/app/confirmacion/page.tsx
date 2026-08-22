import type { Metadata } from "next";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import Boton from "@/components/ui/Boton";
import MagicLinkGuardar from "@/components/confirmacion/MagicLinkGuardar";
import PaqueteFundador from "@/components/paquete/PaqueteFundador";

export const metadata: Metadata = {
  title: "Registro confirmado — Innmobiliaria",
};

const siguientes = [
  {
    titulo: "Preparamos tus fotos",
    texto:
      "En la próxima etapa te ayudaremos a que tu inmueble se vea espectacular.",
  },
  {
    titulo: "Verificamos tu inmueble",
    texto:
      "Un paso sencillo y opcional para ganar el sello de propietario verificado.",
  },
  {
    titulo: "Abrimos a compradores",
    texto:
      "Alrededor de octubre. Te avisamos por WhatsApp cuando llegue el momento.",
  },
];

// Confirmación STATELESS (contenido genérico): auditable por Lighthouse y a prueba de visita
// directa. No lee la BD ni depende de parámetros.
export default function Confirmacion() {
  return (
    <>
      <EncabezadoInterior />
      <main className="mx-auto max-w-2xl px-6 py-16 lg:py-24">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-purple text-2xl text-white">
          ✓
        </span>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Tu inmueble quedó registrado como fundador
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-gray">
          Gracias por confiar en Innmobiliaria. Ya eres parte del primer grupo
          de vendedores directos de Bogotá. Esto es lo que sigue:
        </p>

        <MagicLinkGuardar />

        <ol className="mt-10 space-y-5">
          {siguientes.map((s, i) => (
            <li
              key={s.titulo}
              className="flex gap-4 rounded-[2rem] bg-cream p-6 shadow-soft"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-purple text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <h2 className="text-base font-bold text-ink">{s.titulo}</h2>
                <p className="mt-1 text-sm leading-relaxed text-gray">
                  {s.texto}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <PaqueteFundador compacto />

        <div className="mt-10">
          <Boton href="/">Volver al inicio</Boton>
        </div>
      </main>
    </>
  );
}
