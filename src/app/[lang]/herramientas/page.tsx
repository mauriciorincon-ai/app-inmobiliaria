import type { Metadata } from "next";
import CambiarHerramienta from "@/components/herramientas/CambiarHerramienta";
import SimuladorCarga from "@/components/herramientas/SimuladorCarga";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { PRECIO_MAX } from "@/engine/busqueda/filtros";
import { esEnteroEscrito, parsearCOP } from "@/engine/format/cop";
import { DIAS_TASA_VIEJA } from "@/engine/simulador/tasa";
import { leerIdioma, type PropsLang } from "@/i18n/ruta";
import { enIdioma, rellenar } from "@/i18n/textos";
import { cargarTasa } from "@/lib/precio-datos";
import { HERRAMIENTAS } from "@/textos/herramientas";
import { SIMULADOR } from "@/textos/simulador";

// Herramientas → el simulador de cuota (maqueta 10, ADR 018). El encabezado nace estático (LCP); el simulador se carga
// diferido. «Un cálculo, no una aprobación». La tasa viene de la base con su fecha; los ingresos no pasan por aquí.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PropsLang): Promise<Metadata> {
  const lang = await leerIdioma(params);
  const t = enIdioma(SIMULADOR.meta, lang);
  return {
    title: t.titulo,
    description: t.descripcion,
    robots: { index: false, follow: false },
  };
}

// El precio que la ficha manda en `?precio=`: un entero razonable o nada (lo que llega de la URL no es confiable).
function precioDeLaUrl(valor: string | string[] | undefined): number | null {
  const v = Array.isArray(valor) ? valor[0] : valor;
  if (!v || !esEnteroEscrito(v)) return null;
  const n = parsearCOP(v);
  return n !== null && n > 0 && n <= PRECIO_MAX ? n : null;
}

export default async function HerramientasPage({
  params,
  searchParams,
}: PropsLang & {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await leerIdioma(params);
  const precio = precioDeLaUrl((await searchParams).precio);
  const t = enIdioma(SIMULADOR, lang);
  const tasa = await cargarTasa();
  const fuenteTasa = t.fuentes.tasa;

  return (
    <>
      <EncabezadoInterior lang={lang} seccion="herramientas" />
      <main className="mx-auto max-w-4xl px-6 py-8 pb-28 sm:pb-8">
        <CambiarHerramienta
          actual="simulador"
          t={enIdioma(HERRAMIENTAS, lang)}
        />
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink">
          {t.pagina.titulo}
        </h1>
        <p className="mt-1 text-gray">{t.pagina.bajada}</p>
        <SimuladorCarga
          lang={lang}
          precioInicial={precio}
          tasa={{
            tasaEA: tasa.tasaEA,
            fechaCorte: tasa.fechaCorte,
            creditos: tasa.creditos,
            entidades: tasa.entidades,
            origen: tasa.origen,
            vieja: tasa.vieja,
            diasVieja: DIAS_TASA_VIEJA,
          }}
          t={{
            grupo: t.pagina.grupo,
            campos: t.campos,
            tasa: t.tasa,
            salidas: t.salidas,
            avisos: t.avisos,
            capacidad: t.capacidad,
            fuenteTasa,
            descargo: {
              titulo: t.descargo.titulo,
              texto: t.descargo.texto,
              cuota: rellenar(t.descargo.cuota, { norma: t.normas.cuota }),
              financiable: rellenar(t.descargo.financiable, {
                norma: t.normas.financiable,
              }),
              plazo: rellenar(t.descargo.plazo, { norma: t.normas.plazo }),
              fuenteTasa: rellenar(t.descargo.fuenteTasa, {
                fuente: fuenteTasa,
              }),
            },
          }}
        />
      </main>
    </>
  );
}
