import Reveal from "@/components/motion/Reveal";

const pasos = [
  {
    n: "1",
    titulo: "Cuéntanos quién eres",
    texto:
      "Tu nombre y tu WhatsApp. Nada de papeles ni documentos: empezar toma menos de un minuto.",
  },
  {
    n: "2",
    titulo: "Describe tu inmueble",
    texto:
      "Lo esencial: dónde queda, cuánto mide y cuánto esperas por él. Las fotos llegan en la siguiente etapa.",
  },
  {
    n: "3",
    titulo: "Listo: quedas registrado",
    texto:
      "Tu inmueble queda publicado como fundador. Te avisamos por WhatsApp en cada paso hacia el lanzamiento.",
  },
];

// "Publicar = registrarse" — el mensaje central de la app. Bajo el fold → Reveal.
export default function ComoFunciona() {
  return (
    <section id="como-funciona" className="pastel-band">
      <div className="mx-auto max-w-6xl px-6 py-24 lg:px-10 lg:py-32">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Publicar tu inmueble <span className="pill">es</span> tu registro
          </h2>
          <p className="mt-4 text-lg text-gray">
            No te pedimos un correo para una lista de espera. Te pedimos tu
            inmueble. Así de directo.
          </p>
        </div>

        <Reveal stagger className="mt-12 grid gap-6 md:grid-cols-3">
          {pasos.map((p) => (
            <div key={p.n} className="rounded-[2rem] bg-white p-7 shadow-card">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-purple text-lg font-bold text-white">
                {p.n}
              </span>
              <h3 className="mt-5 text-lg font-bold text-ink">{p.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray">
                {p.texto}
              </p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
