import Link from "next/link";
import {
  PAGINA_NUEVOS,
  paramsNuevos,
  type FiltrosNuevos,
  type TarjetaNuevo as DatosTarjeta,
  type VistaLista,
} from "@/engine/vivienda-nueva/vista";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar } from "@/i18n/textos";
import TarjetaNuevo from "./TarjetaNuevo";
import type { TextosNuevos } from "./etiquetas";

// La lista de proyectos (maqueta 01). Con un tope de «lo que puedes pagar» salen primero los que caben, luego los que no y
// por último los que no traen precio; sin tope, todos juntos. Salen `PAGINA_NUEVOS` por vez: «ver más» es un enlace
// (`pag`), así que funciona sin JavaScript y el HTML no crece con los 143 proyectos.
type Grupo = "dentro" | "fuera" | "sinPrecio";

export default function ListaNuevos({
  vista,
  filtros,
  pagina,
  t,
  lang,
}: {
  vista: VistaLista;
  filtros: FiltrosNuevos;
  pagina: number;
  t: TextosNuevos;
  lang: Idioma;
}) {
  const tl = t.lista;
  const todas: { g: Grupo; p: DatosTarjeta }[] = [
    ...vista.dentro.map((p) => ({ g: "dentro" as const, p })),
    ...vista.fuera.map((p) => ({ g: "fuera" as const, p })),
    ...vista.sinPrecio.map((p) => ({ g: "sinPrecio" as const, p })),
  ];
  const visibles = todas.slice(0, PAGINA_NUEVOS * pagina);
  const restan = todas.length - visibles.length;
  const grupos = (["dentro", "fuera", "sinPrecio"] as const)
    .map((g) => ({ g, items: visibles.filter((x) => x.g === g) }))
    .filter((x) => x.items.length > 0);
  const titulos: Record<Grupo, string | null> = {
    dentro: null,
    fuera: tl.fuera,
    sinPrecio: tl.sinPrecio,
  };
  const conteo =
    vista.tope !== null
      ? rellenar(tl.conteoTope, {
          dentro: vista.dentro.length,
          fuera: vista.fuera.length,
          sinPrecio: vista.sinPrecio.length,
        })
      : vista.coinciden === 1
        ? tl.conteoUno
        : rellenar(tl.conteoVarios, { n: vista.coinciden });
  const mas = new URLSearchParams(paramsNuevos(filtros));
  mas.set("pag", String(pagina + 1));
  return (
    <section aria-labelledby="lista-titulo" className="mt-6">
      <h2 id="lista-titulo" className="text-xl font-extrabold text-ink">
        {tl.titulo}
      </h2>
      <p className="mt-1 text-sm text-mute">{tl.nota}</p>
      <p className="mt-2 font-semibold text-ink" aria-live="polite">
        {conteo}
      </p>
      {vista.coinciden === 0 ? (
        <p className="mt-4 text-gray">{tl.vacio}</p>
      ) : (
        grupos.map(({ g, items }) => (
          <div key={g} className="mt-4">
            {titulos[g] && (
              <h3 className="mb-2 text-lg font-extrabold text-ink">
                {titulos[g]}
              </h3>
            )}
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map(({ p }) => (
                <TarjetaNuevo
                  key={p.slug}
                  p={p}
                  t={t}
                  lang={lang}
                  tope={vista.tope}
                  fuera={g === "fuera"}
                />
              ))}
            </ul>
          </div>
        ))
      )}
      {restan > 0 && (
        <p className="mt-6">
          <Link
            href={`/buscar?${mas.toString()}`}
            prefetch={false}
            className="inline-block rounded-full bg-purple-tint px-5 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-200"
          >
            {rellenar(tl.verMas, { restan })}
          </Link>
        </p>
      )}
    </section>
  );
}
