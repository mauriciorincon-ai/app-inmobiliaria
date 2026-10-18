import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import { leerIdioma } from "@/i18n/ruta";
import type { Idioma } from "@/i18n/idiomas";
import { enIdioma, rellenar } from "@/i18n/textos";
import { COMUN } from "@/textos/comun";
import { FICHA } from "@/textos/ficha";
import Galeria from "@/components/ficha/Galeria";
import SelloNivel from "@/components/ficha/SelloNivel";
import SelloExplicado from "@/components/ficha/SelloExplicado";
import VivoHace from "@/components/ficha/VivoHace";
import ContactoVendedor from "@/components/ficha/ContactoVendedor";
import CompartirCTA from "@/components/ficha/CompartirCTA";
import { crearClienteAnon } from "@/lib/supabase/server";
import { formatearCOP } from "@/engine/format/cop";
import { urlPublicaFoto } from "@/lib/fotos-url";
import type { FichaData } from "@/lib/supabase/types";

// Ficha pública: se sirve dinámica (lee la BD por RPC de columnas públicas). noindex se mantiene
// en H1; la difusión abierta llega en S3 con G-Release.
export const dynamic = "force-dynamic";

// Unidad de superficie: igual en los dos idiomas, no es texto de la interfaz.
const UNIDAD_AREA = "m²";

type ParamsFicha = Promise<{ lang: string; slug: string }>;

async function cargarFicha(slug: string): Promise<FichaData | null> {
  const supabase = crearClienteAnon();
  const { data } = await supabase.rpc("obtener_ficha", { p_slug: slug });
  return data;
}

// Nombre del tipo de inmueble en el idioma de quien mira; un tipo desconocido cae en «inmueble».
function tipoDe(f: FichaData, lang: Idioma): string {
  const tipos: Record<string, string> = enIdioma(COMUN.dominio.tipo, lang);
  return tipos[f.tipo] ?? tipos.inmueble;
}

function portadaUrl(f: FichaData): string | null {
  const p = f.fotos.find((x) => x.es_portada) ?? f.fotos[0];
  return p ? urlPublicaFoto(p.r2_key) : null;
}

export async function generateMetadata({
  params,
}: {
  params: ParamsFicha;
}): Promise<Metadata> {
  const lang = await leerIdioma(params);
  const { slug } = await params;
  const t = enIdioma(FICHA.meta, lang);
  const f = await cargarFicha(slug);
  if (!f) {
    return {
      title: t.noEncontrada,
      robots: { index: false, follow: false },
    };
  }
  const valores = {
    tipo: tipoDe(f, lang),
    barrio: f.barrio,
    ciudad: f.ciudad,
    precio: formatearCOP(f.precio_esperado, lang),
  };
  const titulo = rellenar(t.tituloCompartido, valores);
  const descripcion = f.descripcion ?? rellenar(t.descripcion, valores);
  // og:image = portada real desde R2 (sin generar imágenes) o fallback estático del repo.
  const og = portadaUrl(f) ?? "/og-fallback.png";
  return {
    title: rellenar(t.titulo, valores),
    description: descripcion,
    robots: { index: false, follow: false },
    openGraph: {
      title: titulo,
      description: descripcion,
      images: [{ url: og }],
      type: "website",
    },
  };
}

export default async function FichaPage({ params }: { params: ParamsFicha }) {
  const lang = await leerIdioma(params);
  const { slug } = await params;
  const f = await cargarFicha(slug);
  if (!f) notFound();

  // Precarga la portada (candidato LCP) con prioridad alta.
  const og = portadaUrl(f);
  if (og) preload(og, { as: "image", fetchPriority: "high" });

  const t = enIdioma(FICHA, lang);
  const dominio = enIdioma(COMUN.dominio, lang);
  const operaciones: Record<string, string> = dominio.operacion;
  const tipo = tipoDe(f, lang);

  return (
    <>
      <EncabezadoInterior lang={lang} />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Galeria fotos={f.fotos} t={t.galeria} />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <SelloNivel
            nivel={f.nivel_verificacion}
            ctlExpedidoEl={f.ctl_expedido_el}
            lang={lang}
            t={t.sello}
          />
          <span className="text-sm text-mute">
            {operaciones[f.operacion] ?? f.operacion} · {tipo}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">
          {rellenar(t.encabezado.titulo, { tipo, barrio: f.barrio })}
        </h1>
        <p className="mt-1 text-2xl font-extrabold text-purple">
          {formatearCOP(f.precio_esperado, lang)}
        </p>
        <p className="mt-2 text-sm text-gray">
          {f.localidad ?? f.ciudad} · {f.area_m2} {UNIDAD_AREA} ·{" "}
          {f.habitaciones === 1
            ? t.encabezado.habitacionesUna
            : rellenar(t.encabezado.habitacionesVarias, {
                n: f.habitaciones,
              })}
        </p>

        <VivoHace vigenteHasta={f.vigente_hasta} t={t.vivo} />
        <SelloExplicado
          nivel={f.nivel_verificacion}
          ctlExpedidoEl={f.ctl_expedido_el}
          lang={lang}
          t={t.selloExplicado}
        />

        {f.descripcion && (
          <p className="mt-6 whitespace-pre-line leading-relaxed text-gray">
            {f.descripcion}
          </p>
        )}

        <section className="mt-6">
          <h2 className="text-lg font-bold text-ink">{t.ubicacion.titulo}</h2>
          <p className="mt-1 text-sm text-gray">
            {f.localidad
              ? rellenar(t.ubicacion.detalle, {
                  barrio: f.barrio,
                  localidad: f.localidad,
                })
              : rellenar(t.ubicacion.detalleSinLocalidad, { barrio: f.barrio })}
          </p>
        </section>

        <div className="mt-8 rounded-[2rem] bg-cream p-6">
          <p className="text-sm text-mute">{t.publicadoPor}</p>
          <p className="text-lg font-bold text-ink">{f.nombre_publicador}</p>
          {f.contacto_publico ? (
            <ContactoVendedor slug={f.slug} t={t.contacto} />
          ) : (
            <p className="mt-2 text-sm text-gray">{t.sinContacto}</p>
          )}
        </div>

        <div className="mt-8">
          <CompartirCTA t={t.compartir} />
        </div>
      </main>
    </>
  );
}
