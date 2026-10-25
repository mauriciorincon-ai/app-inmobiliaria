import Link from "next/link";
import Aviso from "./Aviso";
import EsperaArriendoCarga from "./EsperaArriendoCarga";
import {
  esVacio,
  etiqueta,
  numero,
  textoEntrega,
  type TextosNuevos,
} from "./etiquetas";
import { formatearCOP } from "@/engine/format/cop";
import { formatearFecha } from "@/engine/format/fecha";
import {
  entregaPartes,
  paramsComparar,
  type EdicionPublicada,
  type Vigencia,
  type VistaProyecto,
} from "@/engine/vivienda-nueva/vista";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar } from "@/i18n/textos";

const MARCAS = {
  verificable: "✓",
  ilegible: "?",
  en_conflicto: "≠",
  no_lo_dice: "—",
} as const;

// La ficha de un proyecto de vivienda nueva (maqueta 02): el precio verdadero con cada peso y su norma, la espera, y la
// ficha honesta. Todo viene hecho de `vistaProyecto`; aquí solo se escribe. «Fuente: Estrenar Vivienda, edición N, p. X»
// va siempre. Lo que el aviso calla se nombra y jamás se suma.
export default function FichaNuevo({
  v,
  edicion,
  vigencia,
  tope,
  t,
  lang,
}: {
  v: VistaProyecto;
  edicion: EdicionPublicada;
  vigencia: Vigencia;
  tope: number | null;
  t: TextosNuevos;
  lang: Idioma;
}) {
  const tf = t.ficha;
  const pv = v.precio;
  const zona = [v.sector, v.ciudad].filter((x) => !esVacio(x));
  const cop = (n: number) => formatearCOP(n, lang);
  const fuente = rellenar(t.fuentePaginas, {
    n: edicion.numero,
    paginas: v.paginas.join(t.paginasUnion),
  });
  const segmentos: Record<string, string> = t.segmento;
  const etapas: Record<string, string> = t.etapa;
  const campos: Record<string, string> = t.campo;
  const entrega =
    typeof v.entrega === "string"
      ? entregaPartes(v.entrega, v.entregaPrecision)
      : null;

  // El texto de cada cosa que falta sumar, con su monto cuando la norma lo da.
  const faltante = (f: { id: string; monto?: number }) => {
    const textos: Record<string, string> = tf.faltante;
    if (f.id === "derechos_notariales") {
      return f.monto === undefined
        ? tf.faltante.derechos_notariales_sin_monto
        : rellenar(tf.faltante.derechos_notariales, { monto: cop(f.monto) });
    }
    return rellenar(etiqueta(textos, f.id), { ciudad: String(v.ciudad) });
  };

  const consultadas = [v.normas.derechos_registro, v.normas.derechos_notariales]
    .filter((n) => n !== null)
    .map((n) =>
      rellenar(tf.precio.consultadas, {
        norma: n.norma,
        fecha: formatearFecha(n.consultado, lang),
      }),
    );

  const m2 = pv.m2;
  const textoM2 = m2.base
    ? rellenar(
        m2.base === "privada" ? tf.precio.m2Privada : tf.precio.m2Construida,
        { valor: cop(m2.valor), area: numero(m2.area, lang) },
      )
    : m2.razon === "en_conflicto"
      ? tf.precio.m2Conflicto
      : tf.precio.m2Sin;

  return (
    <article className="mt-4">
      <Link
        href="/buscar?v=nuevos"
        prefetch={false}
        className="text-sm font-semibold text-purple-600 underline underline-offset-4"
      >
        {tf.volver}
      </Link>
      {vigencia.estado === "sin_edicion" && (
        <div className="mt-4">
          <Aviso tono="alerta" titulo={t.pagina.sinEdicion.titulo}>
            <p>
              {rellenar(
                vigencia.dias === 1
                  ? t.pagina.sinEdicion.detalleUno
                  : t.pagina.sinEdicion.detalleVarios,
                { n: edicion.numero, dias: vigencia.dias },
              )}
            </p>
          </Aviso>
        </div>
      )}
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-mute">
        {zona.length ? zona.join(" · ") : t.tarjeta.sinZona}
      </p>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">
        {esVacio(v.nombre) ? t.tarjeta.nombreIlegible : v.nombre}
      </h1>
      <p className="text-gray">
        {esVacio(v.constructora)
          ? t.tarjeta.constructoraNoImpresa
          : v.constructora}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="rounded-full bg-purple-tint px-3 py-0.5 text-xs font-semibold text-purple-600">
          {etiqueta(segmentos, String(v.segmento))}
        </span>
        {!esVacio(v.etapa) && (
          <span className="rounded-full bg-purple-tint px-3 py-0.5 text-xs font-semibold text-purple-600">
            {etiqueta(etapas, String(v.etapa))}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-mute">{fuente}</p>

      {tope !== null && v.alcanza === "fuera" && pv.estado === "calculado" && (
        <div className="mt-4">
          <Aviso tono="alerta" titulo={tf.fueraDeTope.titulo}>
            <p>
              {rellenar(tf.fueraDeTope.detalle, {
                alMenos: cop(pv.alMenos),
                tope: cop(tope),
                falta: cop(pv.alMenos - tope),
              })}
            </p>
          </Aviso>
        </div>
      )}
      {tope !== null && v.alcanza === "dentro" && (
        <div className="mt-4">
          <Aviso tono="ok">
            <p>{rellenar(tf.dentroDeTope, { tope: cop(tope) })}</p>
          </Aviso>
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section
          aria-labelledby="precio-titulo"
          className="rounded-2xl border border-purple-200 bg-white p-4 shadow-soft"
        >
          <h2 id="precio-titulo" className="text-xl font-extrabold text-ink">
            {tf.precio.titulo}
          </h2>
          {pv.estado === "calculado" ? (
            <>
              <p className="mt-2 text-gray">{tf.precio.alMenos}</p>
              <p className="text-3xl font-extrabold text-ink">
                {cop(pv.alMenos)}
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                {pv.partidas.map((x) => (
                  <li key={x.id} className="flex justify-between gap-3">
                    <span>{etiqueta(tf.partida, x.id)}</span>
                    <span className="font-semibold">{cop(x.monto)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 font-semibold text-ink">{tf.precio.faltan}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray">
                {pv.faltantes.map((f) => (
                  <li key={f.id}>{faltante(f)}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-mute">{textoM2}</p>
              {consultadas.length > 0 && (
                <p className="mt-2 text-sm text-mute">
                  {rellenar(tf.precio.tarifas, {
                    lista: consultadas.join("; "),
                  })}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="mt-2 text-gray">
                {pv.estado === "en_conflicto"
                  ? tf.precio.enConflicto
                  : tf.precio.sinPrecio}
              </p>
              <p className="mt-3 text-sm text-mute">{textoM2}</p>
            </>
          )}
        </section>

        <section
          aria-labelledby="espera-titulo"
          className="rounded-2xl border border-purple-200 bg-white p-4 shadow-soft"
        >
          <h2 id="espera-titulo" className="text-xl font-extrabold text-ink">
            {tf.espera.titulo}
          </h2>
          {v.espera.estado === "inmediata" && (
            <p className="mt-2 text-gray">{tf.espera.inmediata}</p>
          )}
          {v.espera.estado === "sin_fecha" && (
            <div className="mt-2">
              <Aviso tono="info">
                <p>{tf.espera.sinFecha}</p>
              </Aviso>
            </div>
          )}
          {v.espera.estado === "en_conflicto" && (
            <div className="mt-2">
              <Aviso tono="info">
                <p>{tf.espera.enConflicto}</p>
              </Aviso>
            </div>
          )}
          {v.espera.estado === "calculada" && entrega && (
            <>
              <p className="mt-2 text-gray">{tf.espera.intro}</p>
              <p className="mt-1 text-sm text-mute">
                {rellenar(
                  v.espera.meses === 1 ? tf.espera.mesesUno : tf.espera.meses,
                  {
                    meses: v.espera.meses,
                    cuando: textoEntrega(entrega, tf.espera, lang),
                  },
                )}
                {v.espera.aproximada && ` ${tf.espera.aproximada}`}
                {v.espera.vencida && ` ${tf.espera.vencida}`}
              </p>
              <EsperaArriendoCarga
                meses={v.espera.meses}
                lang={lang}
                t={tf.espera.arriendo}
              />
            </>
          )}
        </section>
      </div>

      <section
        aria-labelledby="honesta-titulo"
        className="mt-4 rounded-2xl border border-purple-200 bg-white p-4 shadow-soft"
      >
        <h2 id="honesta-titulo" className="text-xl font-extrabold text-ink">
          {tf.honesta.titulo}
        </h2>
        <p className="mt-1 text-sm text-mute">
          {rellenar(tf.honesta.resumen, {
            n: v.ficha.verificables,
            total: v.ficha.datos.length,
          })}
        </p>
        <div className="mt-3 overflow-x-auto">
          <table
            className="w-full text-left text-sm"
            aria-label={tf.honesta.titulo}
          >
            <tbody>
              {v.ficha.datos.map((d) => (
                <tr key={d.campo} className="border-b border-purple-100">
                  <th scope="row" className="py-2 pr-3 font-semibold text-ink">
                    {etiqueta(campos, d.campo)}
                  </th>
                  <td className="py-2 text-gray">
                    <span aria-hidden="true">{MARCAS[d.clase]} </span>
                    {t.clase[d.clase]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(v.ficha.mensajes.length > 0 || v.ficha.otrosMensajes > 0) && (
          <>
            <p className="mt-3 font-semibold text-ink">{tf.honesta.mensajes}</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {v.ficha.mensajes.map((r) => (
                <li
                  key={r}
                  className="rounded-full bg-cream px-3 py-0.5 text-xs font-semibold text-gray"
                >
                  {etiqueta(t.rotulo, r)}
                </li>
              ))}
              {v.ficha.otrosMensajes > 0 && (
                <li className="rounded-full bg-cream px-3 py-0.5 text-xs font-semibold text-gray">
                  {rellenar(tf.honesta.otros, { n: v.ficha.otrosMensajes })}
                </li>
              )}
            </ul>
          </>
        )}
        {v.enConflicto.length > 0 && (
          <div className="mt-3">
            <Aviso tono="info">
              <p>
                {rellenar(tf.honesta.conflicto, {
                  campos: v.enConflicto
                    .map((c) => etiqueta(campos, c))
                    .join(", "),
                })}
              </p>
            </Aviso>
          </div>
        )}
      </section>

      <section aria-labelledby="visita-titulo" className="mt-8">
        <h2 id="visita-titulo" className="text-xl font-extrabold text-ink">
          {t.visita.ficha.titulo}
        </h2>
        {vigencia.estado === "vigente" ? (
          <>
            <p className="mt-1 text-gray">{t.visita.ficha.detalle}</p>
            <Link
              href={`/nuevos/${v.slug}/visita`}
              prefetch={false}
              className="mt-3 inline-block rounded-full bg-purple px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-purple-600"
            >
              {t.visita.ficha.boton}
            </Link>
          </>
        ) : (
          <p className="mt-1 text-gray">{t.visita.ficha.sinEdicion}</p>
        )}
      </section>

      <section aria-labelledby="accesos-titulo" className="mt-8">
        <h2 id="accesos-titulo" className="text-xl font-extrabold text-ink">
          {t.accesos.titulo}
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          <li className="rounded-2xl border border-purple-200 bg-white p-4">
            <Link
              href={`/nuevo-o-usado?${paramsComparar({ zona: v.region === "sabana" ? "sabana" : "bogota", max: tope ?? undefined, pago: false }).toString()}`}
              prefetch={false}
              className="font-extrabold text-purple-600 underline underline-offset-4"
            >
              {t.accesos.nuevoOUsado.titulo}
            </Link>
            <p className="mt-1 text-sm text-gray">
              {t.accesos.nuevoOUsado.detalle}
            </p>
          </li>
          <li className="rounded-2xl border border-purple-200 bg-white p-4">
            <Link
              href="/te-alcanza"
              prefetch={false}
              className="font-extrabold text-purple-600 underline underline-offset-4"
            >
              {t.accesos.teAlcanza.titulo}
            </Link>
            <p className="mt-1 text-sm text-gray">
              {t.accesos.teAlcanza.detalle}
            </p>
          </li>
        </ul>
      </section>
    </article>
  );
}
