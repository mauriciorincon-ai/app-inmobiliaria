import Link from "next/link";
import type { ReactNode } from "react";
import { formatearM2, formatearMillones } from "@/engine/format/cop";
import type { TarjetaNuevo as DatosTarjeta } from "@/engine/vivienda-nueva/vista";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar } from "@/i18n/textos";
import { esVacio, etiqueta, type TextosNuevos } from "./etiquetas";

// Una tarjeta de la lista de vivienda nueva (maqueta 01). Sin fotos, logos ni textos de avisos: el nombre, la constructora,
// la zona impresa y lo que cuesta de verdad. «Pagas al menos» es el número que manda; el «desde» del aviso va debajo.
export default function TarjetaNuevo({
  p,
  t,
  lang,
  tope,
  fuera,
  pie,
}: {
  p: DatosTarjeta;
  t: TextosNuevos;
  lang: Idioma;
  tope: number | null;
  fuera: boolean;
  /** Una línea más al pie (en «¿Nuevo o usado?», la espera). */
  pie?: ReactNode;
}) {
  const tt = t.tarjeta;
  const zona = [p.sector, p.ciudad].filter((x) => !esVacio(x));
  const m2 = p.precio.m2;
  const segmentos: Record<string, string> = t.segmento;
  return (
    <li>
      <article
        className={`relative flex h-full flex-col gap-1 rounded-2xl border bg-white p-4 shadow-soft transition-shadow hover:shadow-card ${
          fuera ? "border-aviso-borde" : "border-purple-200"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-mute">
          {zona.length ? zona.join(" · ") : tt.sinZona}
        </p>
        <h3 className="text-lg font-extrabold text-ink">
          <Link
            href={`/nuevos/${p.slug}${tope !== null ? `?max=${tope}` : ""}`}
            prefetch={false}
            className="after:absolute after:inset-0 after:rounded-2xl"
          >
            {esVacio(p.nombre) ? tt.nombreIlegible : p.nombre}
          </Link>
        </h3>
        <p className="text-sm text-mute">
          {esVacio(p.constructora) ? tt.constructoraNoImpresa : p.constructora}
        </p>
        <div className="my-1 flex flex-wrap gap-2">
          <span className="rounded-full bg-purple-tint px-3 py-0.5 text-xs font-semibold text-purple-600">
            {etiqueta(segmentos, String(p.segmento))}
          </span>
          {p.faltan > 0 && (
            <span className="rounded-full bg-cream px-3 py-0.5 text-xs font-semibold text-gray">
              {rellenar(tt.callaDatos, { n: p.faltan, total: p.datos })}
            </span>
          )}
        </div>
        {p.precio.estado === "calculado" ? (
          <>
            <p className="text-sm text-gray">
              {tt.desde}{" "}
              <span className="font-semibold">
                {formatearMillones(p.precio.desde, lang)}
              </span>
            </p>
            <p className="font-extrabold text-ink">
              {tt.alMenos}{" "}
              <span>{formatearMillones(p.precio.alMenos, lang)}</span>
            </p>
          </>
        ) : (
          <p className="font-semibold text-ink">
            {p.precio.estado === "en_conflicto"
              ? tt.precioConflicto
              : tt.sinPrecio}
          </p>
        )}
        <p className="text-xs text-mute">
          {m2.base
            ? `≈ ${formatearM2(m2.valor, lang)} ${
                m2.base === "privada" ? tt.m2Privada : tt.m2Construida
              }`
            : m2.razon === "en_conflicto"
              ? tt.m2Conflicto
              : tt.sinArea}
        </p>
        {pie && <p className="text-xs text-gray">{pie}</p>}
        {fuera && (
          <p className="mt-1 text-xs font-semibold text-aviso">
            <span aria-hidden="true">! </span>
            {tt.fuera}
          </p>
        )}
      </article>
    </li>
  );
}
