import type { Metadata } from "next";
import { headers } from "next/headers";
import Aviso from "@/components/nuevos/Aviso";
import NuevoOUsado from "@/components/nuevos/NuevoOUsado";
import PestanasMercado from "@/components/nuevos/PestanasMercado";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { formatearFecha } from "@/engine/format/fecha";
import {
  edicionVigente,
  leerFiltrosComparar,
  paramsNuevos,
  vistaNuevoOUsado,
} from "@/engine/vivienda-nueva/vista";
import { leerIdioma } from "@/i18n/ruta";
import { enIdioma, rellenar } from "@/i18n/textos";
import { fuenteAnuncios } from "@/lib/precio-datos";
import {
  tarifasPara,
  cargarNuevos,
  cargarUsados,
  hoyNuevos,
} from "@/lib/vivienda-nueva/datos";
import { PRECIO } from "@/textos/precio";
import { VIVIENDA_NUEVA } from "@/textos/vivienda-nueva";

// «¿Nuevo o usado?» (maqueta 03, S13). Todo se calcula en el servidor para el día de hoy en Bogotá: la edición y su
// vigencia salen de la base, los usados son los anuncios vivos de hoy en Innmobiliaria (área y precio, sin slug) y el
// presupuesto viaja en `?max=` (el tope que el teléfono calculó; los ingresos nunca llegan aquí). `noindex` hasta H-4.
export const dynamic = "force-dynamic";

type Params = Promise<{ lang: string }>;
type Consulta = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const lang = await leerIdioma(params);
  const t = enIdioma(VIVIENDA_NUEVA.meta.nuevoOUsado, lang);
  return {
    title: t.titulo,
    description: t.descripcion,
    robots: { index: false, follow: false },
  };
}

export default async function NuevoOUsadoPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Consulta;
}) {
  const lang = await leerIdioma(params);
  const t = enIdioma(VIVIENDA_NUEVA, lang);
  const filtros = leerFiltrosComparar(await searchParams);
  const hoy = hoyNuevos(await headers());
  const lectura = await cargarNuevos(hoy);

  const hrefUsados =
    filtros.max !== undefined ? `/buscar?max=${filtros.max}` : "/buscar";
  const hrefNuevos = `/buscar?${paramsNuevos({ pago: false, max: filtros.max }).toString()}`;
  const marco = (contenido: React.ReactNode) => (
    <>
      <EncabezadoInterior lang={lang} seccion="buscar" />
      <main className="mx-auto max-w-4xl px-6 py-6 pb-28 sm:pb-6">
        <PestanasMercado
          activo="nuevos"
          hrefUsados={hrefUsados}
          hrefNuevos={hrefNuevos}
          t={t.mercado}
        />
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          {t.nuevoOUsado.titulo}
        </h1>
        <p className="mt-1 text-gray">{t.nuevoOUsado.bajada}</p>
        {contenido}
      </main>
    </>
  );

  if (lectura.estado !== "ok") {
    const e =
      lectura.estado === "error" ? t.pagina.error : t.pagina.sinPublicar;
    return marco(
      <div className="mt-4">
        <Aviso
          tono={lectura.estado === "error" ? "alerta" : "info"}
          titulo={e.titulo}
        >
          <p>{e.detalle}</p>
        </Aviso>
      </div>,
    );
  }

  const { edicion, proyectos } = lectura.leida;
  const vigencia = edicionVigente([edicion], hoy);
  // Los usados solo se piden para Bogotá: en la Sabana Innmobiliaria no publica.
  const usados = filtros.zona === "bogota" ? await cargarUsados() : [];
  const fuenteUsados = fuenteAnuncios(enIdioma(PRECIO.fuente, lang));
  const v = vistaNuevoOUsado(
    proyectos,
    usados,
    tarifasPara(hoy),
    filtros,
    fuenteUsados,
    hoy,
  );
  const fuente = rellenar(t.fuente, { n: edicion.numero });
  return marco(
    <>
      <p className="mt-1 text-sm text-mute">
        {fuente}
        {" · "}
        {rellenar(t.pagina.vigencia, {
          desde: formatearFecha(edicion.desde, lang),
          hasta: formatearFecha(edicion.hasta, lang),
        })}
      </p>
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
      <NuevoOUsado v={v} filtros={filtros} fuente={fuente} t={t} lang={lang} />
    </>,
  );
}
