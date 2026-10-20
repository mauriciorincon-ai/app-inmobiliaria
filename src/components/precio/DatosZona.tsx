import { MINIMO_COMPARABLES } from "@/engine/precio/comparables";
import { montoCorto } from "@/engine/precio/presentacion";
import type { DatosZona as Datos } from "@/engine/precio/zona";
import { formatearFecha } from "@/engine/format/fecha";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar } from "@/i18n/textos";
import type { TextosPrecio } from "@/components/precio/tipos";

// «Datos de la zona» (maqueta 09): tres cifras, cada una con su fuente y su fecha, que NO se mezclan entre sí. El m²
// de oferta es lo que piden los dueños en Innmobiliaria; el de Catastro es del TERRENO por manzana y solo sirve de
// referencia. Con la atribución que exige la licencia de cada dato.
export default function DatosZona({
  datos,
  fecha,
  zona,
  tipo,
  operacion,
  lang,
  t,
}: {
  datos: Datos;
  /** AAAA-MM-DD de la consulta de los anuncios. */
  fecha: string;
  zona: string;
  tipo: string;
  operacion: string;
  lang: Idioma;
  t: TextosPrecio["zona"];
}) {
  const f = formatearFecha(fecha, lang);
  const { medianaOferta, ofertaActiva, terreno } = datos;
  const fila = "border-t border-purple-100 align-top";
  const cabeza = "py-3 pr-3 text-left text-sm font-semibold text-gray";
  return (
    <>
      <p className="text-sm text-mute">
        {rellenar(t.subtitulo, { zona, tipo, operacion })}
      </p>
      <table className="w-full border-collapse">
        <caption className="sr-only">{t.cifras}</caption>
        <tbody>
          <tr className={fila}>
            <th scope="row" className={cabeza}>
              {t.medianaOferta.etiqueta}
            </th>
            <td className="py-3 text-right text-sm text-ink">
              {medianaOferta ? (
                <>
                  <strong>{montoCorto(medianaOferta.medianaM2, lang)}</strong>
                  <br />
                  <span className="text-mute">
                    {rellenar(
                      medianaOferta.ambito === "barrio"
                        ? t.medianaOferta.detalleBarrio
                        : t.medianaOferta.detalleLocalidad,
                      { fecha: f, n: medianaOferta.n },
                    )}
                  </span>
                </>
              ) : (
                <span className="text-mute">
                  {rellenar(t.medianaOferta.sinDatos, {
                    minimo: MINIMO_COMPARABLES,
                  })}
                </span>
              )}
            </td>
          </tr>
          <tr className={fila}>
            <th scope="row" className={cabeza}>
              {t.ofertaActiva.etiqueta}
            </th>
            <td className="py-3 text-right text-sm text-ink">
              {ofertaActiva.barrio !== null && (
                <span className="block">
                  {rellenar(t.ofertaActiva.barrio, { n: ofertaActiva.barrio })}
                </span>
              )}
              <span className="block">
                {rellenar(t.ofertaActiva.localidad, {
                  n: ofertaActiva.localidad,
                })}
              </span>
            </td>
          </tr>
          <tr className={fila}>
            <th scope="row" className={cabeza}>
              {t.terreno.etiqueta}
            </th>
            <td className="py-3 text-right text-sm text-ink">
              {terreno ? (
                <>
                  <strong>{montoCorto(terreno.mediana, lang)}</strong>
                  <br />
                  <span className="text-mute">
                    {rellenar(t.terreno.detalle, {
                      vigencia: terreno.vigencia,
                      n: terreno.manzanas,
                    })}
                  </span>
                </>
              ) : (
                <span className="text-mute">{t.terreno.sinDato}</span>
              )}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="text-sm text-gray">{t.aviso}</p>
      {terreno && (
        <p className="text-xs text-mute">
          {rellenar(t.atribucion, {
            vigencia: terreno.vigencia,
            licencia: terreno.licencia,
          })}
        </p>
      )}
    </>
  );
}
