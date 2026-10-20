import Link from "next/link";
import BarraRango from "@/components/precio/BarraRango";
import { ESTILO_ESTADO } from "@/components/precio/estilos";
import type { TextosPrecio } from "@/components/precio/tipos";
import type { RangoPrecio } from "@/engine/precio/comparables";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar } from "@/i18n/textos";

// «¿Está caro?» en la ficha (maqueta 02/09): el estado, una barra pequeña y el enlace al detalle. Se pinta en el
// servidor, sin JavaScript. Siempre dice que es un rango de lo que piden otros dueños, no un avalúo.
export default function TarjetaEstaCaro({
  rango,
  slug,
  lang,
  t,
}: {
  rango: RangoPrecio;
  slug: string;
  lang: Idioma;
  t: TextosPrecio;
}) {
  const estilo = ESTILO_ESTADO[rango.estado];
  return (
    <section
      aria-labelledby="esta-caro-titulo"
      className="rounded-2xl border border-purple-200 bg-white p-4"
    >
      <h2 id="esta-caro-titulo" className="text-sm font-bold text-ink">
        {t.tarjeta.titulo}
      </h2>
      <p
        className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${estilo.clase}`}
      >
        <span aria-hidden="true">{estilo.simbolo}</span>
        {t.estado[rango.estado]}
      </p>
      {rango.estado === "sin_datos" ? (
        <p className="mt-2 text-sm text-gray">{t.tarjeta.sinDatos}</p>
      ) : (
        <>
          <BarraRango rango={rango} lang={lang} t={t.detalle} compacta />
          <p className="mt-1 text-sm text-gray">
            {rellenar(t.tarjeta.frente, { n: rango.n })}
          </p>
        </>
      )}
      <p className="mt-1 text-xs text-mute">{t.tarjeta.nota}</p>
      <Link
        href={`/i/${slug}/esta-caro`}
        prefetch={false}
        className="mt-2 inline-block text-sm font-semibold text-purple-600 underline underline-offset-4"
      >
        {t.tarjeta.ver}
      </Link>
    </section>
  );
}
