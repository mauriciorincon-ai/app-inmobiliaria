// Paquete Fundador (B2): 4 guías gratuitas (archivos HTML autocontenidos en /public). Enlaces
// estáticos — se abren en pestaña nueva. Sin lógica ni datos.
const GUIAS = [
  {
    href: "/paquete-fundador/guia-fotografica.html",
    titulo: "Guía fotográfica",
    desc: "Fotos que venden cerca de un tercio más rápido.",
  },
  {
    href: "/paquete-fundador/checklist-legal-notarial.html",
    titulo: "Checklist legal y notarial",
    desc: "Los pasos y costos reales del proceso, con fuentes.",
  },
  {
    href: "/paquete-fundador/saca-tu-ctl-en-10-min.html",
    titulo: "Saca tu CTL en 10 minutos",
    desc: "La llave del sello ⭐ de propietario verificado.",
  },
  {
    href: "/paquete-fundador/guia-de-precio.html",
    titulo: "Cómo fijar tu precio",
    desc: "Con herramientas gratuitas y datos, no corazonadas.",
  },
] as const;

export default function PaqueteFundador({
  compacto = false,
}: {
  compacto?: boolean;
}) {
  return (
    <section
      aria-labelledby="paquete-titulo"
      className={compacto ? "mt-8" : "mx-auto max-w-5xl px-6 py-16"}
    >
      <h2
        id="paquete-titulo"
        className={
          compacto
            ? "text-lg font-extrabold text-ink"
            : "text-3xl font-extrabold tracking-tight text-ink"
        }
      >
        Tu paquete de fundador
      </h2>
      <p className="mt-1 text-sm text-gray">
        Guías gratis para vender directo, sin comisión. Cifras solo con fuente.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {GUIAS.map((g) => (
          <a
            key={g.href}
            href={g.href}
            target="_blank"
            rel="noreferrer"
            className="group rounded-2xl border border-purple-200 bg-white p-5 transition-colors hover:border-purple hover:bg-cream"
          >
            <h3 className="font-bold text-ink group-hover:text-purple-600">
              {g.titulo} →
            </h3>
            <p className="mt-1 text-sm text-gray">{g.desc}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
