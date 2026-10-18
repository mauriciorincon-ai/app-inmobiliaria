import Link from "next/link";
import TarjetaAnuncio from "@/components/buscar/TarjetaAnuncio";
import {
  LIMITE_RESULTADOS,
  aParams,
  hayFiltros,
  type Filtros,
} from "@/engine/busqueda/filtros";
import type { Idioma } from "@/i18n/idiomas";
import { enIdioma, rellenar } from "@/i18n/textos";
import type { ResultadoBusqueda } from "@/lib/supabase/types";
import { BUSCAR } from "@/textos/buscar";
import { COMUN } from "@/textos/comun";
import { FICHA } from "@/textos/ficha";

export type Busqueda = { resultados: ResultadoBusqueda[]; error: boolean };

const href = (f: Filtros) => {
  const q = aParams(f).toString();
  return q ? `/buscar?${q}` : "/buscar";
};

// El título con la cuenta («24 anuncios vivos en Bogotá») y la lista de tarjetas son lo ÚNICO de la
// página que espera a la base de datos. Cada uno llega por streaming dentro de su <Suspense>; mientras
// tanto se ve «Buscando…» y el esqueleto. El resto de la página (filtros, nota de privacidad,
// disposición) sale en el primer envío.
export async function TituloConteo({
  promesa,
  filtros,
  lang,
}: {
  promesa: Promise<Busqueda>;
  filtros: Filtros;
  lang: Idioma;
}) {
  const { resultados, error } = await promesa;
  const t = enIdioma(BUSCAR.lista, lang);
  if (error) return <>{t.error.titulo}</>;
  const n = resultados.length;
  const uno = n === 1;
  return (
    <>
      {filtros.zona
        ? rellenar(uno ? t.conteoZonaUno : t.conteoZonaVarios, { n })
        : hayFiltros(filtros)
          ? rellenar(uno ? t.conteoFiltrosUno : t.conteoFiltrosVarios, { n })
          : rellenar(uno ? t.conteoBogotaUno : t.conteoBogotaVarios, { n })}
    </>
  );
}

export default async function ListaResultados({
  promesa,
  filtros,
  lang,
}: {
  promesa: Promise<Busqueda>;
  filtros: Filtros;
  lang: Idioma;
}) {
  const { resultados, error } = await promesa;
  const t = enIdioma(BUSCAR, lang);
  const dominio = enIdioma(COMUN.dominio, lang);
  const tipos: Record<string, string> = dominio.tipo;
  const tFicha = enIdioma(FICHA, lang);

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-2xl bg-red-50 px-5 py-4 text-red-700"
      >
        <p className="text-sm">{t.lista.error.detalle}</p>
      </div>
    );
  }

  const n = resultados.length;
  const ahora = new Date();

  return (
    <>
      {n >= LIMITE_RESULTADOS && (
        <p className="mb-2 text-sm text-mute">
          {rellenar(t.lista.tope, { n: LIMITE_RESULTADOS })}
        </p>
      )}

      {n === 0 ? (
        <div className="mt-2 rounded-[2rem] bg-cream px-6 py-12 text-center">
          <p className="text-lg font-bold text-ink">
            {t.lista.sinResultados.titulo}
          </p>
          <p className="mt-2 text-sm text-gray">
            {t.lista.sinResultados.detalle}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {filtros.zona && (
              <Link
                href={href({ ...filtros, zona: undefined })}
                className="rounded-full bg-purple px-5 py-2 text-sm font-semibold text-white hover:bg-purple-600"
              >
                {t.lista.sinResultados.quitarZona}
              </Link>
            )}
            {aParams({ ...filtros, zona: undefined, operacion: undefined })
              .size > 0 && (
              <Link
                href={href({ operacion: filtros.operacion })}
                className="rounded-full bg-purple-tint px-5 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-200"
              >
                {t.lista.sinResultados.quitarFiltros}
              </Link>
            )}
          </div>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {resultados.map((r) => (
            <TarjetaAnuncio
              key={r.slug}
              r={r}
              tipo={tipos[r.tipo] ?? tipos.inmueble}
              lang={lang}
              t={t.tarjeta}
              tSello={tFicha.sello}
              tVivo={tFicha.vivo}
              ahora={ahora}
            />
          ))}
        </ul>
      )}
    </>
  );
}

// Lo que se ve mientras la búsqueda responde («Cargando» de la maqueta): esqueletos con la forma de las
// tarjetas, ocultos a los lectores de pantalla (el título ya dice «Buscando…»).
export function EsqueletoLista() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
      {[0, 1].map((i) => (
        <li
          key={i}
          className="animate-pulse rounded-2xl border border-purple-200 p-3"
        >
          <div className="aspect-[4/3] rounded-xl bg-purple-tint" />
          <div className="mt-3 h-5 w-3/5 rounded bg-purple-tint" />
          <div className="mt-2 h-4 w-4/5 rounded bg-purple-tint" />
        </li>
      ))}
    </ul>
  );
}
