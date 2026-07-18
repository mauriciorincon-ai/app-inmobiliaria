import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import Boton from "@/components/ui/Boton";

export default function FichaNoEncontrada() {
  return (
    <>
      <EncabezadoInterior />
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          No encontramos este inmueble
        </h1>
        <p className="mt-3 text-gray">
          El enlace puede estar mal escrito o el anuncio ya no está disponible.
        </p>
        <div className="mt-8">
          <Boton href="/">Ir al inicio</Boton>
        </div>
      </main>
    </>
  );
}
