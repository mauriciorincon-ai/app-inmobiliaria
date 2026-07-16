import Reveal from "@/components/motion/Reveal";

// Dolores del vendedor con cifras CITABLES únicamente (design-system.md). Bajo el fold → Reveal.
const dolores = [
  {
    fig: "≈$12M",
    titulo: "La comisión que te ahorras",
    texto:
      "El 3% de comisión urbana sobre una vivienda de $400 millones son unos $12 millones. Vendiendo directo, ese dinero se queda contigo.",
  },
  {
    fig: "7–7,5 meses",
    titulo: "Lo que tarda una venta",
    texto:
      "Es el promedio en Bogotá. Empezar con tiempo y una buena presentación juega a tu favor, no en tu contra.",
  },
  {
    fig: "+35%",
    titulo: "Más denuncias de estafa",
    texto:
      "Las denuncias por fraude inmobiliario crecieron 35% en un año (Camacol, 2024). Por eso la verificación es el corazón de Innmobiliaria.",
  },
];

export default function Dolores() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 lg:px-10 lg:py-28">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Vender directo <span className="underline-doodle">tiene sentido</span>
        </h2>
        <p className="mt-4 text-lg text-gray">
          No es una corazonada: son los números del mercado colombiano.
        </p>
      </div>

      <Reveal stagger className="mt-12 grid gap-6 sm:grid-cols-3">
        {dolores.map((d) => (
          <div
            key={d.titulo}
            className="rounded-[2rem] bg-cream p-7 shadow-soft"
          >
            <p className="text-3xl font-extrabold text-purple">{d.fig}</p>
            <h3 className="mt-3 text-lg font-bold text-ink">{d.titulo}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray">{d.texto}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
