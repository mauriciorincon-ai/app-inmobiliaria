import type { Metadata } from "next";
import { headers } from "next/headers";
import Aviso from "@/components/nuevos/Aviso";
import TeAlcanza, { leerHogar } from "@/components/nuevos/TeAlcanza";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { formatearFecha } from "@/engine/format/fecha";
import { edicionVigente, vistaTeAlcanza } from "@/engine/vivienda-nueva/vista";
import { leerIdioma } from "@/i18n/ruta";
import { enIdioma, rellenar } from "@/i18n/textos";
import { cargarTasa } from "@/lib/precio-datos";
import {
  SUBSIDIOS,
  TARIFAS,
  cargarNuevos,
  hoyNuevos,
} from "@/lib/vivienda-nueva/datos";
import { VIVIENDA_NUEVA } from "@/textos/vivienda-nueva";

// «¿Te alcanza con subsidio?» (maqueta 04, S13). Los tres hogares de ejemplo se calculan en el servidor con los programas de
// `src/data/subsidios-vivienda.json` (cada uno con su norma, su año y la fecha de su estado) y la tasa de referencia con su
// fecha de corte. «Tu hogar» corre en el teléfono: los ingresos de quien lo usa jamás llegan al servidor. `noindex` hasta H-4.
export const dynamic = "force-dynamic";

type Params = Promise<{ lang: string }>;
type Consulta = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const lang = await leerIdioma(params);
  const t = enIdioma(VIVIENDA_NUEVA.meta.teAlcanza, lang);
  return {
    title: t.titulo,
    description: t.descripcion,
    robots: { index: false, follow: false },
  };
}

export default async function TeAlcanzaPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Consulta;
}) {
  const lang = await leerIdioma(params);
  const t = enIdioma(VIVIENDA_NUEVA, lang);
  const hogar = leerHogar(await searchParams);
  const hoy = hoyNuevos(await headers());
  const lectura = await cargarNuevos(hoy);

  const marco = (contenido: React.ReactNode) => (
    <>
      <EncabezadoInterior lang={lang} seccion="herramientas" />
      <main className="mx-auto max-w-4xl px-6 py-6 pb-28 sm:pb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          {t.teAlcanza.titulo}
        </h1>
        <p className="mt-1 text-gray">{t.teAlcanza.bajada}</p>
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
  const tasa = await cargarTasa();
  const v = vistaTeAlcanza(proyectos, SUBSIDIOS, TARIFAS, {
    tasaEA: tasa.tasaEA,
    fechaCorte: tasa.fechaCorte,
  });
  return marco(
    <>
      <p className="mt-1 text-sm text-mute">
        {rellenar(t.fuente, { n: edicion.numero })}
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
      <TeAlcanza v={v} hogar={hogar} t={t} lang={lang} />
    </>,
  );
}
