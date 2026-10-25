import Link from "next/link";
import Aviso from "./Aviso";
import FiltrosNuevos from "./FiltrosNuevos";
import IndiceNuevos from "./IndiceNuevos";
import ListaNuevos from "./ListaNuevos";
import type { TextosNuevos } from "./etiquetas";
import { formatearCOP } from "@/engine/format/cop";
import { formatearFecha } from "@/engine/format/fecha";
import { topeVis } from "@/engine/vivienda-nueva/escrituracion";
import {
  edicionVigente,
  leerPagina,
  vistaIndice,
  paramsComparar,
  vistaLista,
  type FiltrosNuevos as Filtros,
} from "@/engine/vivienda-nueva/vista";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar } from "@/i18n/textos";
import { TARIFAS, type LecturaNuevos } from "@/lib/vivienda-nueva/datos";

type Entrada = Record<string, string | string[] | undefined>;

// La pestaña «Nuevos» de Buscar (maqueta 01): el índice y la lista, todo calculado en el servidor por los motores del S11.
// Cada estado se dice: edición vigente, «mes sin edición», nada publicado y error de lectura. «Fuente: Estrenar Vivienda,
// edición N» va siempre que hay una edición. El ingreso del comprador no llega aquí: solo el tope (`max`) que su teléfono
// calculó.
export default function BuscarNuevos({
  lectura,
  hoy,
  filtros,
  entrada,
  t,
  lang,
}: {
  lectura: LecturaNuevos;
  hoy: string;
  filtros: Filtros;
  entrada: Entrada;
  t: TextosNuevos;
  lang: Idioma;
}) {
  const tp = t.pagina;
  // El tope (`max`) filtra siempre; `pago=1` solo añade el aviso de dónde sale (el simulador del teléfono).
  const tope = filtros.max ?? null;
  const pago = filtros.pago && tope !== null && (
    <Aviso
      tono="info"
      titulo={rellenar(tp.pago.etiqueta, { precio: formatearCOP(tope, lang) })}
    >
      <p>{tp.pago.nota}</p>
      <Link
        href="/herramientas"
        prefetch={false}
        className="mt-1 inline-block font-semibold text-purple-600 underline underline-offset-4"
      >
        {tp.pago.ajustar}
      </Link>
    </Aviso>
  );

  if (lectura.estado !== "ok") {
    const e = lectura.estado === "error" ? tp.error : tp.sinPublicar;
    return (
      <>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          {tp.titulo}
        </h1>
        <div className="mt-4">
          <Aviso
            tono={lectura.estado === "error" ? "alerta" : "info"}
            titulo={e.titulo}
          >
            <p>{e.detalle}</p>
          </Aviso>
        </div>
      </>
    );
  }

  const { edicion, proyectos } = lectura.leida;
  const vigencia = edicionVigente([edicion], hoy);
  const indice = vistaIndice(proyectos, TARIFAS);
  const vista = vistaLista(proyectos, TARIFAS, filtros);
  const topeVisBogota = topeVis("Bogotá", TARIFAS);
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">
        {tp.titulo}
      </h1>
      <p className="mt-1 text-sm text-mute">
        {rellenar(t.fuente, { n: edicion.numero })}
        {" · "}
        {rellenar(tp.vigencia, {
          desde: formatearFecha(edicion.desde, lang),
          hasta: formatearFecha(edicion.hasta, lang),
        })}
      </p>
      <div className="mt-4">
        {vigencia.estado === "sin_edicion" && (
          <Aviso tono="alerta" titulo={tp.sinEdicion.titulo}>
            <p>
              {rellenar(
                vigencia.dias === 1
                  ? tp.sinEdicion.detalleUno
                  : tp.sinEdicion.detalleVarios,
                { n: edicion.numero, dias: vigencia.dias },
              )}
            </p>
          </Aviso>
        )}
        {pago}
      </div>
      <section aria-labelledby="accesos-titulo" className="mt-4">
        <h2 id="accesos-titulo" className="sr-only">
          {t.accesos.titulo}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          <li className="rounded-2xl border border-purple-200 bg-white p-4">
            <Link
              href={`/nuevo-o-usado?${paramsComparar({ zona: "bogota", max: tope ?? undefined, pago: filtros.pago }).toString()}`}
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
      <IndiceNuevos indice={indice} t={t} lang={lang} topeVis={topeVisBogota} />
      <FiltrosNuevos
        filtros={filtros}
        lugares={vista.lugares}
        anios={vista.anios}
        topeVis={topeVisBogota}
        t={t}
        lang={lang}
      />
      <ListaNuevos
        vista={vista}
        filtros={filtros}
        pagina={leerPagina(entrada)}
        t={t}
        lang={lang}
      />
    </>
  );
}
