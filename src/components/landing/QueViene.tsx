import Reveal from "@/components/motion/Reveal";

// Teaser honesto: se COMUNICA lo que viene, no se construye en S1. Cualitativo, sin cifras
// (las de fotos están prohibidas por evidencia débil — design-system.md).
const teaser = [
  {
    estrella: true,
    titulo: "Fotos que venden",
    texto:
      "Te ayudaremos a que tu inmueble se vea espectacular. Una buena foto es lo que más mira quien compra.",
  },
  {
    estrella: true,
    titulo: "Compradores verificados",
    texto:
      "Menos curiosos y menos riesgos: gente seria y verificada del otro lado.",
  },
  {
    estrella: false,
    titulo: "Avalúo de referencia",
    texto:
      "Una idea clara de cuánto podría valer tu inmueble para que pongas un precio con confianza.",
  },
];

export default function QueViene() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 lg:px-10 lg:py-28">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Lo que estamos construyendo para ti
        </h2>
        <p className="mt-4 text-lg text-gray">
          Publicas hoy; esto llega en las próximas etapas, antes de abrir a los
          compradores.
        </p>
      </div>

      <Reveal stagger className="mt-12 grid gap-6 sm:grid-cols-3">
        {teaser.map((t) => (
          <div
            key={t.titulo}
            className="rounded-[2rem] border border-purple-200 bg-white p-7"
          >
            <div className="flex items-center gap-2">
              {t.estrella && (
                <span aria-hidden="true" className="text-lg text-purple">
                  ★
                </span>
              )}
              <h3 className="text-lg font-bold text-ink">{t.titulo}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-gray">{t.texto}</p>
            <p className="mt-4 inline-block rounded-full bg-purple-tint px-3 py-1 text-xs font-semibold text-purple-600">
              Muy pronto
            </p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
