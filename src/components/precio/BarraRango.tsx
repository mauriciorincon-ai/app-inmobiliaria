import {
  escalaBarra,
  montoCorto,
  type RangoConDatos,
} from "@/engine/precio/presentacion";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar } from "@/i18n/textos";
import type { TextosPrecio } from "@/components/precio/tipos";

// La barra de la maqueta 09: un riel, la banda del rango (P25–P75) y la marca de «Este». Es solo dibujo: lo que dice se
// repite con palabras en el aria-label y en el veredicto de abajo. Sin JavaScript.
export default function BarraRango({
  rango,
  lang,
  t,
  compacta = false,
}: {
  rango: RangoConDatos;
  lang: Idioma;
  t: TextosPrecio["detalle"];
  compacta?: boolean;
}) {
  const e = escalaBarra(rango);
  const m2 = montoCorto(rango.precioM2, lang);
  const p25 = montoCorto(rango.p25M2, lang);
  const p75 = montoCorto(rango.p75M2, lang);
  return (
    <div
      role="img"
      aria-label={rellenar(t.barraAria, { m2, p25, p75 })}
      className="mt-3"
    >
      <div className={`relative ${compacta ? "h-6" : "h-12"}`}>
        <div className="absolute inset-x-0 bottom-2 h-2 rounded-full bg-purple-tint" />
        <div
          className="absolute bottom-2 h-2 rounded-full bg-purple-soft"
          style={{ left: `${e.izquierdaBanda}%`, width: `${e.anchoBanda}%` }}
        />
        <div
          className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${Math.min(96, Math.max(4, e.marca))}%` }}
        >
          {!compacta && (
            <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-white">
              {t.marca}
            </span>
          )}
          <span
            className={`w-0.5 bg-ink ${compacta ? "h-5" : "h-5"}`}
            style={{ marginTop: compacta ? 0 : 2 }}
          />
        </div>
      </div>
      {!compacta && (
        <div className="mt-1 flex justify-between gap-2 text-xs text-mute">
          <span>{montoCorto(e.desde, lang)}</span>
          <span className="text-center">
            {rellenar(t.escala, { p25, p75 })}
          </span>
          <span>{montoCorto(e.hasta, lang)}</span>
        </div>
      )}
    </div>
  );
}
