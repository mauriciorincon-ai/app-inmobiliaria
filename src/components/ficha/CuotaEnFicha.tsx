"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { formatearCOP } from "@/engine/format/cop";
import { formatearFecha } from "@/engine/format/fecha";
import { leerCapacidad } from "@/engine/simulador/capacidad-local";
import { simular } from "@/engine/simulador/cuota";
import { enlaceCalculo } from "@/engine/simulador/formulario";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import {
  instantaneaCapacidad,
  suscribirCapacidad,
} from "@/lib/capacidad-cliente";
import type { PRECIO } from "@/textos/precio";

export type TextosCuota = Proyectado<typeof PRECIO.cuota>;

// «¿Cabe en lo que puedes pagar?» (S10, ADR 018). Una isla diminuta: lee el cálculo guardado en ESTE teléfono (jamás
// pregunta al servidor) y, con él, dice cuánto sería la cuota de este anuncio y si cabe. Sin cálculo guardado, invita a
// hacerlo. La tasa viene del servidor con su fecha; si la persona escribió la suya, se usa esa.
export default function CuotaEnFicha({
  precio,
  tasaEA,
  fechaCorte,
  lang,
  t,
}: {
  precio: number;
  tasaEA: number;
  fechaCorte: string;
  lang: Idioma;
  t: TextosCuota;
}) {
  const guardado = useSyncExternalStore(
    suscribirCapacidad,
    instantaneaCapacidad,
    () => "",
  );
  const cap = leerCapacidad(guardado || null);
  const r = cap
    ? simular({
        precio,
        inicial: cap.inicial,
        plazoAnos: cap.plazoAnos,
        tasaEA: cap.tasaEA ?? tasaEA,
        ingresos: cap.ingresos,
      })
    : null;
  const hay = r !== null && (r.estado === "cabe" || r.estado === "no_cabe");

  return (
    <section
      aria-labelledby="cuota-titulo"
      className="rounded-2xl border border-purple-200 bg-white p-4"
    >
      <h2 id="cuota-titulo" className="text-sm font-bold text-ink">
        {t.titulo}
      </h2>
      {hay && cap ? (
        <>
          <p
            className={`mt-2 inline-flex items-start gap-2 rounded-2xl px-3 py-2 text-sm font-semibold ${
              r.estado === "cabe"
                ? "bg-mint text-ok"
                : "border border-aviso-borde bg-aviso-tint text-aviso"
            }`}
          >
            <span aria-hidden="true">{r.estado === "cabe" ? "✓" : "▲"}</span>
            <span>
              {rellenar(
                cap.tasaEA === null
                  ? r.estado === "cabe"
                    ? t.cabe
                    : t.noCabe
                  : r.estado === "cabe"
                    ? t.cabeTuTasa
                    : t.noCabeTuTasa,
                {
                  cuota: formatearCOP(r.cuota, lang),
                  fecha: formatearFecha(fechaCorte, lang),
                },
              )}
            </span>
          </p>
          <Link
            href={enlaceCalculo(precio)}
            prefetch={false}
            className="mt-2 inline-block text-sm font-semibold text-purple-600 underline underline-offset-4"
          >
            {t.ajustar}
          </Link>
          <p className="mt-1 text-xs text-mute">{t.privado}</p>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-gray">{t.calculaAyuda}</p>
          <Link
            href={enlaceCalculo(precio)}
            prefetch={false}
            className="mt-2 inline-flex items-center justify-center rounded-full bg-purple px-5 py-2 text-sm font-semibold text-white shadow-card hover:bg-purple-600"
          >
            {t.calcula}
          </Link>
        </>
      )}
    </section>
  );
}
