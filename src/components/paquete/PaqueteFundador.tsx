import type { Idioma } from "@/i18n/idiomas";
import type { Proyectado } from "@/i18n/textos";
import type { LANDING } from "@/textos/landing";

export type TextosPaquete = Proyectado<typeof LANDING.paquete>;

// Paquete Fundador (B2): 4 guías gratuitas (archivos HTML autocontenidos en /public). Enlaces
// estáticos — se abren en pestaña nueva. Sin lógica ni datos. Las guías están en español: en inglés
// cada tarjeta lo avisa (decisión del S5). El orden de los enlaces es el de `LANDING.paquete.guias`.
const ENLACES = [
  "/paquete-fundador/guia-fotografica.html",
  "/paquete-fundador/checklist-legal-notarial.html",
  "/paquete-fundador/saca-tu-ctl-en-10-min.html",
  "/paquete-fundador/guia-de-precio.html",
] as const;

// Lo usan páginas de servidor y componentes cliente: recibe SOLO los textos de su idioma por props.
export default function PaqueteFundador({
  t,
  lang,
  compacto = false,
}: {
  t: TextosPaquete;
  lang: Idioma;
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
        {t.titulo}
      </h2>
      <p className="mt-1 text-sm text-gray">{t.subtitulo}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {t.guias.map((g, i) => (
          <a
            key={ENLACES[i]}
            href={ENLACES[i]}
            target="_blank"
            rel="noreferrer"
            className="group rounded-2xl border border-purple-200 bg-white p-5 transition-colors hover:border-purple hover:bg-cream"
          >
            <h3 className="font-bold text-ink group-hover:text-purple-600">
              {g.titulo} →
            </h3>
            <p className="mt-1 text-sm text-gray">{g.desc}</p>
            {lang === "en" && (
              <p className="mt-2 text-xs font-semibold text-mute">
                {t.avisoIdioma}
              </p>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}
