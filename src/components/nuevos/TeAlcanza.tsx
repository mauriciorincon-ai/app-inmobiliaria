import Link from "next/link";
import Aviso from "./Aviso";
import HogarResultado from "./HogarResultado";
import TuHogarCarga from "./TuHogarCarga";
import { formatearCOP } from "@/engine/format/cop";
import type { VistaTeAlcanza } from "@/engine/vivienda-nueva/vista";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar } from "@/i18n/textos";
import type { TextosNuevos } from "./etiquetas";

/** Cuántos hogares de ejemplo hay (0 = el más bajo). */
export const HOGARES = 3;

/** `?h=` → el índice del hogar de ejemplo; lo que no sea 0, 1 o 2 es el primero. */
export function leerHogar(
  entrada: Record<string, string | string[] | undefined>,
): number {
  const crudo = Array.isArray(entrada.h) ? entrada.h[0] : entrada.h;
  const n = crudo !== undefined && /^[0-9]$/.test(crudo) ? Number(crudo) : 0;
  return n < HOGARES ? n : 0;
}

// «¿Te alcanza con subsidio?» (maqueta 04, S13). Los tres hogares de ejemplo salen del servidor (`vistaTeAlcanza` → `teAlcanza`);
// «tu hogar» lo calcula el teléfono con el mismo motor. Solo programas verificados con su norma, año y fecha; uno sin cupos se
// dice y no suma; lo no verificado se nombra y no se muestra.
export default function TeAlcanza({
  v,
  hogar,
  t,
  lang,
}: {
  v: VistaTeAlcanza;
  hogar: number;
  t: TextosNuevos;
  lang: Idioma;
}) {
  const tt = t.teAlcanza;
  const actual = v.hogares[hogar];
  const lista = v.noMostrados.map((n) => n[lang]).join(", ");
  return (
    <>
      <nav aria-label={tt.hogares.grupo} className="mt-4 flex flex-wrap gap-2">
        {v.hogares.map((h, i) => (
          <Link
            key={h.ingresos}
            href={`/te-alcanza?h=${i}`}
            prefetch={false}
            aria-current={i === hogar ? "true" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              i === hogar
                ? "bg-purple text-white"
                : "bg-purple-tint text-purple-600 hover:bg-purple-200"
            }`}
          >
            {rellenar(tt.hogares.etiqueta, {
              ingresos: formatearCOP(h.ingresos, lang),
            })}
          </Link>
        ))}
      </nav>
      <div className="mt-4">
        <HogarResultado
          h={actual}
          ejemplo={v.ejemplo}
          programas={v.programas}
          fechaCorte={v.tasa.fechaCorte}
          t={t}
          lang={lang}
        />
      </div>
      {v.noMostrados.length > 0 && (
        <div className="mt-6">
          <Aviso tono="info" titulo={tt.noMostrados.titulo}>
            <p>{rellenar(tt.noMostrados.detalle, { lista })}</p>
          </Aviso>
        </div>
      )}
      <TuHogarCarga
        motor={v.motor}
        programas={v.programas}
        ejemplo={v.ejemplo}
        fechaCorte={v.tasa.fechaCorte}
        t={{
          teAlcanza: tt,
          segmento: t.segmento,
          region: t.region,
          tarjeta: t.tarjeta,
        }}
        lang={lang}
      />
    </>
  );
}
