import {
  MINIMO_COMPARABLES,
  type FuentePrecio,
} from "@/engine/precio/comparables";
import { formatearFecha } from "@/engine/format/fecha";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar } from "@/i18n/textos";
import type { TextosPrecio } from "@/components/precio/tipos";

// «Cómo lo calculamos»: el método a la vista, sin JavaScript (un <details> nativo). Dice qué es y qué NO es el número:
// el precio que piden los dueños, no el de cierre, y no un avalúo.
export default function ComoCalculamos({
  fuente,
  lang,
  t,
}: {
  fuente: FuentePrecio;
  lang: Idioma;
  t: TextosPrecio["detalle"]["como"];
}) {
  const valores = {
    minimo: MINIMO_COMPARABLES,
    fuente: fuente.nombre,
    fecha: formatearFecha(fuente.fecha, lang),
  };
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-semibold text-purple-600">
        {t.abrir}
      </summary>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-gray">
        {t.pasos.map((p) => (
          <li key={p}>{rellenar(p, valores)}</li>
        ))}
      </ol>
    </details>
  );
}
