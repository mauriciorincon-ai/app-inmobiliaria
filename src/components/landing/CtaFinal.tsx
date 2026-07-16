import Boton from "@/components/ui/Boton";

// Cierre de la landing: banda pastel con la llamada final a publicar.
export default function CtaFinal() {
  return (
    <section className="pastel-band">
      <div className="mx-auto max-w-4xl px-6 py-24 text-center lg:px-10 lg:py-28">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Tu inmueble, listo antes que los demás
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray">
          Publícalo hoy como fundador. Sin comisión, sin intermediarios y en
          menos de tres minutos.
        </p>
        <div className="mt-9 flex justify-center">
          <Boton href="/publicar">Publica tu inmueble como fundador</Boton>
        </div>
      </div>
    </section>
  );
}
