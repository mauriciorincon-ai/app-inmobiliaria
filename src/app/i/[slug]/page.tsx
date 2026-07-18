import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import EncabezadoInterior from "@/components/ui/EncabezadoInterior";
import Galeria from "@/components/ficha/Galeria";
import SelloNivel from "@/components/ficha/SelloNivel";
import ContactoVendedor from "@/components/ficha/ContactoVendedor";
import CompartirCTA from "@/components/ficha/CompartirCTA";
import { crearClienteAnon } from "@/lib/supabase/server";
import { formatearCOP } from "@/engine/format/cop";
import { urlPublicaFoto } from "@/lib/fotos-url";
import type { FichaData } from "@/lib/supabase/types";

// Ficha pública: se sirve dinámica (lee la BD por RPC de columnas públicas). noindex se mantiene
// en H1; la difusión abierta llega en S3 con G-Release.
export const dynamic = "force-dynamic";

const TIPOS_LABEL: Record<string, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  apartaestudio: "Apartaestudio",
  otro: "Inmueble",
};

async function cargarFicha(slug: string): Promise<FichaData | null> {
  const supabase = crearClienteAnon();
  const { data } = await supabase.rpc("obtener_ficha", { p_slug: slug });
  return data;
}

function tituloDe(f: FichaData): string {
  return `${TIPOS_LABEL[f.tipo] ?? "Inmueble"} en ${f.barrio} — ${formatearCOP(f.precio_esperado)}`;
}

function portadaUrl(f: FichaData): string | null {
  const p = f.fotos.find((x) => x.es_portada) ?? f.fotos[0];
  return p ? urlPublicaFoto(p.r2_key) : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const f = await cargarFicha(slug);
  if (!f) {
    return {
      title: "Inmueble no encontrado — Innmobiliaria",
      robots: { index: false, follow: false },
    };
  }
  const titulo = tituloDe(f);
  const descripcion =
    f.descripcion ??
    `${TIPOS_LABEL[f.tipo] ?? "Inmueble"} en ${f.barrio}, ${f.ciudad}.`;
  // og:image = portada real desde R2 (sin generar imágenes) o fallback estático del repo.
  const og = portadaUrl(f) ?? "/og-fallback.png";
  return {
    title: `${titulo} | Innmobiliaria`,
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

export default async function FichaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const f = await cargarFicha(slug);
  if (!f) notFound();

  // Precarga la portada (candidato LCP) con prioridad alta.
  const og = portadaUrl(f);
  if (og) preload(og, { as: "image", fetchPriority: "high" });

  const tipoLabel = TIPOS_LABEL[f.tipo] ?? "Inmueble";

  return (
    <>
      <EncabezadoInterior />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Galeria fotos={f.fotos} />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <SelloNivel nivel={f.nivel_verificacion} />
          <span className="text-sm capitalize text-mute">
            {f.operacion} · {tipoLabel}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">
          {tipoLabel} en {f.barrio}
        </h1>
        <p className="mt-1 text-2xl font-extrabold text-purple">
          {formatearCOP(f.precio_esperado)}
        </p>
        <p className="mt-2 text-sm text-gray">
          {f.ciudad} · {f.area_m2} m² · {f.habitaciones} habitaciones
        </p>

        {f.descripcion && (
          <p className="mt-6 whitespace-pre-line leading-relaxed text-gray">
            {f.descripcion}
          </p>
        )}

        <div className="mt-8 rounded-[2rem] bg-cream p-6">
          <p className="text-sm text-mute">Publicado por</p>
          <p className="text-lg font-bold text-ink">{f.nombre_publicador}</p>
          {f.contacto_publico ? (
            <ContactoVendedor
              whatsapp={f.whatsapp}
              tipoBarrio={`${tipoLabel.toLowerCase()} en ${f.barrio}`}
            />
          ) : (
            <p className="mt-2 text-sm text-gray">
              Este vendedor aún no habilitó el contacto directo.
            </p>
          )}
        </div>

        <div className="mt-8">
          <CompartirCTA />
        </div>
      </main>
    </>
  );
}
