import Link from "next/link";
import { aParams, type Filtros } from "@/engine/busqueda/filtros";
import { serializarZona } from "@/engine/busqueda/poligono";
import { formatearCOP } from "@/engine/format/cop";
import { OPERACIONES, TIPOS } from "@/engine/registro/schema";
import { LOCALIDADES } from "@/engine/zonas/localidades";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import type { BUSCAR } from "@/textos/buscar";
import type { COMUN } from "@/textos/comun";

export type TextosFiltros = Proyectado<typeof BUSCAR.filtros>;
export type DominioFiltros = Proyectado<typeof COMUN.dominio>;

const RUTA = "/buscar";
const HABITACIONES = [1, 2, 3, 4, 5] as const;

const href = (f: Filtros) => {
  const q = aParams(f).toString();
  return q ? `${RUTA}?${q}` : RUTA;
};

const claseControl =
  "mt-1.5 w-full rounded-2xl border border-purple-200 bg-white px-4 py-2.5 text-base text-ink " +
  "placeholder:text-mute focus:border-purple focus:outline-none";

// Los filtros de la búsqueda. La búsqueda VIVE EN LA URL: esto es un formulario GET (sin JavaScript
// funciona igual) y cada filtro activo es un enlace que lo quita. La operación son dos enlaces que
// conservan los demás filtros; pulsar el activo lo suelta.
export default function FiltrosBusqueda({
  filtros,
  t,
  dominio,
  lang,
}: {
  filtros: Filtros;
  t: TextosFiltros;
  dominio: DominioFiltros;
  lang: Idioma;
}) {
  const chips: { clave: string; texto: string; quitar: Filtros }[] = [];
  if (filtros.tipo) {
    chips.push({
      clave: "tipo",
      texto: dominio.tipo[filtros.tipo],
      quitar: { ...filtros, tipo: undefined },
    });
  }
  if (filtros.localidad) {
    chips.push({
      clave: "loc",
      texto: rellenar(t.chip.localidad, { nombre: filtros.localidad }),
      quitar: { ...filtros, localidad: undefined },
    });
  }
  if (filtros.precioMin !== undefined) {
    chips.push({
      clave: "min",
      texto: rellenar(t.chip.desde, {
        precio: formatearCOP(filtros.precioMin, lang),
      }),
      quitar: { ...filtros, precioMin: undefined },
    });
  }
  if (filtros.precioMax !== undefined) {
    chips.push({
      clave: "max",
      texto: rellenar(t.chip.hasta, {
        precio: formatearCOP(filtros.precioMax, lang),
      }),
      quitar: { ...filtros, precioMax: undefined },
    });
  }
  if (filtros.habitacionesMin !== undefined) {
    chips.push({
      clave: "hab",
      texto: rellenar(t.chip.habitaciones, { n: filtros.habitacionesMin }),
      quitar: { ...filtros, habitacionesMin: undefined },
    });
  }
  if (filtros.zona) {
    chips.push({
      clave: "zona",
      texto: t.chip.zona,
      quitar: { ...filtros, zona: undefined },
    });
  }
  const nFiltros = chips.filter((c) => c.clave !== "zona").length;
  const soloOperacionYZona: Filtros = {
    operacion: filtros.operacion,
    zona: filtros.zona,
  };

  return (
    <div role="search" aria-label={t.grupo}>
      <nav
        aria-label={t.operacion}
        className="inline-flex rounded-full bg-purple-tint p-1"
      >
        {OPERACIONES.map((op) => {
          const activo = filtros.operacion === op;
          return (
            <Link
              key={op}
              href={href({ ...filtros, operacion: activo ? undefined : op })}
              aria-current={activo ? "true" : undefined}
              className={`rounded-full px-5 py-1.5 text-sm font-semibold transition-colors ${
                activo
                  ? "bg-purple text-white"
                  : "text-purple-600 hover:bg-purple-200"
              }`}
            >
              {dominio.operacion[op]}
            </Link>
          );
        })}
      </nav>

      <form method="get" action={RUTA} className="mt-3">
        {filtros.operacion && (
          <input type="hidden" name="op" value={filtros.operacion} />
        )}
        {filtros.zona && (
          <input
            type="hidden"
            name="zona"
            value={serializarZona(filtros.zona)}
          />
        )}
        <details className="rounded-2xl border border-purple-200 bg-cream">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-ink">
            {nFiltros > 0 ? rellenar(t.abrirCon, { n: nFiltros }) : t.abrir}
          </summary>
          <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="f-tipo"
                className="block text-sm font-semibold text-ink"
              >
                {t.tipo}
              </label>
              <select
                id="f-tipo"
                name="tipo"
                defaultValue={filtros.tipo ?? ""}
                className={claseControl}
              >
                <option value="">{t.tipoTodos}</option>
                {TIPOS.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {dominio.tipo[tipo]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="f-loc"
                className="block text-sm font-semibold text-ink"
              >
                {t.localidad}
              </label>
              <select
                id="f-loc"
                name="loc"
                defaultValue={filtros.localidad ?? ""}
                aria-describedby="f-loc-ayuda"
                className={claseControl}
              >
                <option value="">{t.localidadTodas}</option>
                {LOCALIDADES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <p id="f-loc-ayuda" className="mt-1 text-xs text-mute">
                {t.localidadAyuda}
              </p>
            </div>
            <div>
              <label
                htmlFor="f-min"
                className="block text-sm font-semibold text-ink"
              >
                {t.precioMin}
              </label>
              <input
                id="f-min"
                name="min"
                inputMode="numeric"
                defaultValue={filtros.precioMin ?? ""}
                placeholder={t.precioEjemplo}
                className={claseControl}
              />
            </div>
            <div>
              <label
                htmlFor="f-max"
                className="block text-sm font-semibold text-ink"
              >
                {t.precioMax}
              </label>
              <input
                id="f-max"
                name="max"
                inputMode="numeric"
                defaultValue={filtros.precioMax ?? ""}
                placeholder={t.precioEjemplo}
                className={claseControl}
              />
            </div>
            <div>
              <label
                htmlFor="f-hab"
                className="block text-sm font-semibold text-ink"
              >
                {t.habitaciones}
              </label>
              <select
                id="f-hab"
                name="hab"
                defaultValue={filtros.habitacionesMin ?? ""}
                className={claseControl}
              >
                <option value="">{t.habitacionesCualquiera}</option>
                {HABITACIONES.map((n) => (
                  <option key={n} value={n}>
                    {rellenar(t.habitacionesMas, { n })}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-end gap-3 sm:col-span-2">
              <button
                type="submit"
                className="rounded-full bg-purple px-5 py-2 text-sm font-semibold text-white hover:bg-purple-600"
              >
                {t.aplicar}
              </button>
              <Link
                href={href(soloOperacionYZona)}
                className="rounded-full px-4 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-tint"
              >
                {t.quitar}
              </Link>
            </div>
          </div>
        </details>
      </form>

      {chips.length > 0 && (
        <ul aria-label={t.activos} className="mt-3 flex flex-wrap gap-2">
          {chips.map((c) => (
            <li key={c.clave}>
              <Link
                href={href(c.quitar)}
                aria-label={rellenar(t.quitarUno, { filtro: c.texto })}
                className="inline-flex items-center gap-1.5 rounded-full bg-purple-tint px-3 py-1 text-sm font-semibold text-purple-600 hover:bg-purple-200"
              >
                {c.texto}
                <span aria-hidden="true">✕</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
