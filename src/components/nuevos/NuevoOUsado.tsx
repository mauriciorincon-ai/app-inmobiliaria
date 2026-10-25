import Link from "next/link";
import Aviso from "./Aviso";
import TarjetaNuevo from "./TarjetaNuevo";
import { esperaCorta, type TextosNuevos } from "./etiquetas";
import { formatearCOP, formatearM2 } from "@/engine/format/cop";
import { formatearFecha } from "@/engine/format/fecha";
import {
  paramsComparar,
  ZONAS_COMPARAR,
  type FiltrosComparar,
  type VistaNuevoOUsado,
} from "@/engine/vivienda-nueva/vista";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar } from "@/i18n/textos";

// «¿Nuevo o usado?» (maqueta 03, S13): con el mismo presupuesto y en la misma zona, los apartamentos nuevos por su precio
// verdadero frente a los apartamentos usados en venta de Innmobiliaria. Todo lo calcula `vistaNuevoOUsado` en el servidor;
// aquí solo se pinta. Los estados se dicen, no se esconden: sin presupuesto, Sabana (sin usados), usados que no se pudieron
// leer, menos de 5 usados («no hay comparación honesta») y menos de 5 nuevos con área privada.
export default function NuevoOUsado({
  v,
  filtros,
  fuente,
  t,
  lang,
}: {
  v: VistaNuevoOUsado;
  filtros: FiltrosComparar;
  /** «Fuente: Estrenar Vivienda, edición N», ya escrita en el idioma. */
  fuente: string;
  t: TextosNuevos;
  lang: Idioma;
}) {
  const tn = t.nuevoOUsado;
  const zonas: Record<string, string> = tn.zona;
  const r = v.resultado;
  const conteo = r?.nuevos.n ?? 0;

  const chips = (
    <nav aria-label={tn.zona.grupo} className="mt-4 flex flex-wrap gap-2">
      {ZONAS_COMPARAR.map((z) => (
        <Link
          key={z}
          href={`/nuevo-o-usado?${paramsComparar({ ...filtros, zona: z }).toString()}`}
          prefetch={false}
          aria-current={v.zona === z ? "true" : undefined}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            v.zona === z
              ? "bg-purple text-white"
              : "bg-purple-tint text-purple-600 hover:bg-purple-200"
          }`}
        >
          {zonas[z]}
        </Link>
      ))}
    </nav>
  );

  if (v.presupuesto === null || r === null) {
    return (
      <>
        {chips}
        <div className="mt-4">
          <Aviso tono="info" titulo={tn.sinPresupuesto.titulo}>
            <p>{tn.sinPresupuesto.detalle}</p>
            <Link
              href="/herramientas"
              prefetch={false}
              className="mt-1 inline-block font-semibold text-purple-600 underline underline-offset-4"
            >
              {tn.sinPresupuesto.calcular}
            </Link>
          </Aviso>
        </div>
      </>
    );
  }

  const presupuesto = formatearCOP(v.presupuesto, lang);
  const u = r.usados;
  const usadosCaja = !v.usadosDisponibles ? (
    <Aviso tono="alerta" titulo={tn.usados.noDisponible.titulo}>
      <p>{tn.usados.noDisponible.detalle}</p>
    </Aviso>
  ) : (
    <section
      aria-labelledby="usados-titulo"
      className="flex flex-col gap-1 rounded-2xl border border-purple-200 bg-white p-4"
    >
      <h2
        id="usados-titulo"
        className="text-xs font-semibold uppercase tracking-wide text-mute"
      >
        {tn.usados.eyebrow}
      </h2>
      {u.estado === "con_datos" ? (
        <>
          <p className="text-3xl font-extrabold text-ink">{u.n}</p>
          <p className="text-sm text-gray">
            {rellenar(tn.usados.mediana, {
              valor: formatearM2(u.medianaM2, lang),
            })}
          </p>
          <p className="text-sm text-mute">
            {rellenar(tn.usados.mitad, {
              p25: formatearM2(u.p25M2, lang),
              p75: formatearM2(u.p75M2, lang),
            })}
          </p>
        </>
      ) : v.zona === "sabana" ? (
        <>
          <p className="font-semibold text-ink">{tn.usados.sinDatos}</p>
          <p className="text-sm text-gray">{tn.usados.sabana}</p>
        </>
      ) : (
        <>
          <p className="font-semibold text-ink">{tn.usados.sinDatos}</p>
          <p className="text-sm text-gray">
            {rellenar(tn.usados.sinDatosDetalle, {
              n: u.n,
              minimo: u.minimo,
            })}
          </p>
        </>
      )}
      <p className="mt-1 text-xs text-mute">
        {rellenar(tn.usados.pie, {
          fecha: formatearFecha(u.fuente.fecha, lang),
        })}
      </p>
    </section>
  );

  const pct = Math.abs(r.diferencia ?? 0);
  const veredicto = !v.usadosDisponibles ? null : r.diferencia !== null ? (
    <Aviso
      tono="info"
      titulo={rellenar(
        r.diferencia === 0
          ? tn.veredicto.igual
          : r.diferencia > 0
            ? tn.veredicto.mas
            : tn.veredicto.menos,
        { pct },
      )}
    >
      <p>{rellenar(tn.veredicto.detalle, { presupuesto })}</p>
    </Aviso>
  ) : (
    <Aviso tono="alerta" titulo={tn.veredicto.sin.titulo}>
      <p>
        {u.estado === "con_datos"
          ? tn.veredicto.sin.detalleNuevos
          : tn.veredicto.sin.detalle}
      </p>
    </Aviso>
  );

  return (
    <>
      {chips}
      <div className="mt-4">
        <Aviso
          tono="info"
          titulo={rellenar(tn.presupuesto.etiqueta, { precio: presupuesto })}
        >
          <p>{tn.presupuesto.nota}</p>
          <Link
            href="/herramientas"
            prefetch={false}
            className="mt-1 inline-block font-semibold text-purple-600 underline underline-offset-4"
          >
            {tn.presupuesto.ajustar}
          </Link>
        </Aviso>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section
          aria-labelledby="nuevos-titulo"
          className="flex flex-col gap-1 rounded-2xl border border-purple-200 bg-white p-4"
        >
          <h2
            id="nuevos-titulo"
            className="text-xs font-semibold uppercase tracking-wide text-mute"
          >
            {tn.nuevos.eyebrow}
          </h2>
          <p className="text-3xl font-extrabold text-ink">{conteo}</p>
          <p className="text-sm text-gray">
            {rellenar(tn.nuevos.pie, { fuente })}
          </p>
          {r.nuevos.medianaM2 !== null ? (
            <p className="text-sm text-gray">
              {rellenar(tn.nuevos.mediana, {
                valor: formatearM2(r.nuevos.medianaM2, lang),
              })}
            </p>
          ) : (
            <p className="text-sm font-semibold text-ink">
              {tn.nuevos.sinMediana}
            </p>
          )}
        </section>
        {usadosCaja}
      </div>
      <div className="mt-4">{veredicto}</div>

      <section aria-labelledby="caben-titulo" className="mt-6">
        <h2 id="caben-titulo" className="text-xl font-extrabold text-ink">
          {tn.caben.titulo}
        </h2>
        <p className="mt-1 text-sm text-mute">{tn.caben.nota}</p>
        {v.caben.length === 0 ? (
          <p className="mt-4 text-gray">{tn.caben.vacio}</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {v.caben.map(({ tarjeta, espera }) => (
              <TarjetaNuevo
                key={tarjeta.slug}
                p={tarjeta}
                t={t}
                lang={lang}
                tope={v.presupuesto}
                fuera={false}
                pie={esperaCorta(espera, tn.caben.espera)}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
