import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BarraRango from "@/components/precio/BarraRango";
import ComoCalculamos from "@/components/precio/ComoCalculamos";
import DatosZona from "@/components/precio/DatosZona";
import Veredicto from "@/components/precio/Veredicto";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { formatearCOP } from "@/engine/format/cop";
import { rangoDePrecio } from "@/engine/precio/comparables";
import { montoCorto } from "@/engine/precio/presentacion";
import { datosDeZona } from "@/engine/precio/zona";
import { valorReferenciaDe } from "@/engine/zonas/valor-referencia";
import { leerIdioma } from "@/i18n/ruta";
import type { Idioma } from "@/i18n/idiomas";
import { enIdioma, rellenar } from "@/i18n/textos";
import { cargarFicha } from "@/lib/ficha-datos";
import { cargarComparables, fuenteAnuncios } from "@/lib/precio-datos";
import { COMUN } from "@/textos/comun";
import { PRECIO } from "@/textos/precio";

// «¿Está caro este anuncio?» (maqueta 09, ADR 018): el precio por m² frente a los anuncios parecidos de su zona, como
// un RANGO (P25–P75) con su N, su fecha y su fuente, y los datos de la zona. Todo se calcula y se pinta en el servidor.
// Jamás un «avalúo» ni un valor único: es lo que piden otros dueños.
export const dynamic = "force-dynamic";

type Params = Promise<{ lang: string; slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const lang = await leerIdioma(params);
  const t = enIdioma(PRECIO.meta, lang);
  return {
    title: t.titulo,
    description: t.descripcion,
    robots: { index: false, follow: false },
  };
}

function nombreTipo(tipo: string, lang: Idioma): string {
  const tipos: Record<string, string> = enIdioma(COMUN.dominio.tipo, lang);
  return tipos[tipo] ?? tipos.inmueble;
}

export default async function EstaCaroPage({ params }: { params: Params }) {
  const lang = await leerIdioma(params);
  const { slug } = await params;
  const f = await cargarFicha(slug);
  if (!f) notFound();

  const t = enIdioma(PRECIO, lang);
  const dominio = enIdioma(COMUN.dominio, lang);
  const operaciones: Record<string, string> = dominio.operacion;
  const tipo = nombreTipo(f.tipo, lang);
  const fuente = fuenteAnuncios(t.fuente);
  const comparables = f.localidad
    ? await cargarComparables({
        operacion: f.operacion,
        tipo: f.tipo,
        localidad: f.localidad,
      })
    : [];
  const rango = comparables ? rangoDePrecio(f, comparables, fuente) : null;
  const datos = comparables
    ? datosDeZona(
        f.sector_codigo,
        comparables,
        fuente,
        valorReferenciaDe(f.sector_codigo),
      )
    : null;

  const precioM2 = Math.round(f.precio_esperado / f.area_m2);
  const zonaDelRango =
    rango && rango.estado !== "sin_datos" && rango.ambito === "localidad"
      ? (f.localidad ?? f.ciudad)
      : f.barrio;

  return (
    <>
      <EncabezadoInterior lang={lang} seccion="buscar" />
      <main className="mx-auto max-w-4xl px-6 py-8 pb-28 sm:pb-8">
        <Link
          href={`/i/${f.slug}`}
          className="text-sm font-semibold text-purple-600 underline underline-offset-4"
        >
          <span aria-hidden="true">← </span>
          {t.volver}
        </Link>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">
          {t.titulo}
        </h1>
        <p className="mt-1 text-gray">
          {rellenar(t.resumen, {
            tipo,
            barrio: f.barrio,
            precio: formatearCOP(f.precio_esperado, lang),
            area: f.area_m2,
            m2: montoCorto(precioM2, lang),
          })}
        </p>
        <p className="mt-1 text-sm text-mute">{t.nota}</p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <section
            aria-labelledby="rango-titulo"
            className="space-y-4 rounded-2xl border border-purple-200 bg-white p-5"
          >
            <h2 id="rango-titulo" className="sr-only">
              {t.titulo}
            </h2>
            {rango === null ? (
              <p role="status" className="text-sm text-gray">
                {t.detalle.error}
              </p>
            ) : (
              <>
                {rango.estado !== "sin_datos" && (
                  <div>
                    <p className="text-sm text-mute">
                      {rellenar(
                        rango.ambito === "barrio"
                          ? t.detalle.frenteBarrio
                          : t.detalle.frenteLocalidad,
                        { n: rango.n, zona: zonaDelRango },
                      )}
                    </p>
                    <BarraRango rango={rango} lang={lang} t={t.detalle} />
                    <p className="mt-2 text-sm text-gray">
                      {rellenar(t.detalle.rangoEnPesos, {
                        area: f.area_m2,
                        p25: formatearCOP(rango.p25, lang),
                        p75: formatearCOP(rango.p75, lang),
                      })}
                    </p>
                  </div>
                )}
                <Veredicto rango={rango} lang={lang} t={t.detalle.veredicto} />
                <ComoCalculamos
                  fuente={fuente}
                  lang={lang}
                  t={t.detalle.como}
                />
              </>
            )}
          </section>

          <section
            aria-labelledby="zona-titulo"
            className="space-y-3 rounded-2xl border border-purple-200 bg-white p-5"
          >
            <h2 id="zona-titulo" className="text-lg font-bold text-ink">
              {t.zona.titulo}
            </h2>
            {datos && (
              <DatosZona
                datos={datos}
                fecha={fuente.fecha}
                zona={f.barrio}
                tipo={tipo}
                operacion={operaciones[f.operacion] ?? f.operacion}
                lang={lang}
                t={t.zona}
              />
            )}
            <p className="rounded-2xl bg-sky p-3 text-sm text-gray">
              {t.zona.dueno}
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
