import { montoCorto, type RangoConDatos } from "@/engine/precio/presentacion";
import {
  MINIMO_COMPARABLES,
  type RangoPrecio,
} from "@/engine/precio/comparables";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar } from "@/i18n/textos";
import { ESTILO_ESTADO } from "@/components/precio/estilos";
import type { TextosPrecio } from "@/components/precio/tipos";

// La frase del estado: qué pasa con este precio frente a su zona y qué hacer. Símbolo + texto + color. Para el
// «sospechosamente barato» incluye el consejo (visitar antes de pagar, pedir el CTL, no dar anticipos); NO hay botón
// de reportar (llega con el sprint de las reglas antifraude).
export default function Veredicto({
  rango,
  lang,
  t,
}: {
  rango: RangoPrecio;
  lang: Idioma;
  t: TextosPrecio["detalle"]["veredicto"];
}) {
  if (rango.estado === "sin_datos") {
    return (
      <Bloque estado="sin_datos" titulo={t.sin_datos.titulo}>
        {rellenar(t.sin_datos.texto, {
          minimo: MINIMO_COMPARABLES,
          n: rango.n,
        })}
      </Bloque>
    );
  }
  const r: RangoConDatos = rango;
  const valores = {
    p25: montoCorto(r.p25M2, lang),
    p75: montoCorto(r.p75M2, lang),
    m2: montoCorto(r.precioM2, lang),
    mediana: montoCorto(r.medianaM2, lang),
    pct: r.porcentaje,
  };
  const clave = r.estado === "en_rango" && r.debajo ? "debajo" : r.estado;
  return (
    <Bloque estado={r.estado} titulo={t[clave].titulo}>
      {rellenar(t[clave].texto, valores)}
    </Bloque>
  );
}

function Bloque({
  estado,
  titulo,
  children,
}: {
  estado: keyof typeof ESTILO_ESTADO;
  titulo: string;
  children: string;
}) {
  const e = ESTILO_ESTADO[estado];
  return (
    <div className={`flex gap-3 rounded-2xl p-4 ${e.clase}`}>
      <span aria-hidden="true" className="mt-0.5 text-lg font-bold">
        {e.simbolo}
      </span>
      <div>
        <p className="font-semibold">{titulo}</p>
        <p className="mt-1 text-sm text-ink">{children}</p>
      </div>
    </div>
  );
}
