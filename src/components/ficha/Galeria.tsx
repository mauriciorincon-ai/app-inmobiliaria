import { urlPublicaFoto, keyThumb } from "@/lib/fotos-url";
import type { FotoFicha } from "@/lib/supabase/types";
import SinFotosSVG from "@/components/ficha/SinFotosSVG";
import { rellenar, type Proyectado } from "@/i18n/textos";
import type { FICHA } from "@/textos/ficha";

export type TextosGaleria = Proyectado<typeof FICHA.galeria>;

// Galería de la ficha pública: la portada grande (candidato LCP → carga prioritaria, tamaño
// full) y el resto como miniaturas perezosas. Sin fotos → SVG del sistema.
export default function Galeria({
  fotos,
  t,
}: {
  fotos: FotoFicha[];
  t: TextosGaleria;
}) {
  if (fotos.length === 0) return <SinFotosSVG texto={t.sinFotos} />;

  // obtener_ficha ya ordena con la portada primero (es_portada desc, orden).
  const [portada, ...resto] = fotos;

  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element -- WebP ya optimizado en R2; next/image no aporta */}
      <img
        src={urlPublicaFoto(portada.r2_key)}
        alt={t.principal}
        className="aspect-[16/10] w-full rounded-[2rem] object-cover"
        fetchPriority="high"
        decoding="async"
      />
      {resto.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {resto.map((f, i) => (
            <li key={f.r2_key}>
              {/* eslint-disable-next-line @next/next/no-img-element -- ídem */}
              <img
                src={urlPublicaFoto(keyThumb(f.r2_key))}
                alt={rellenar(t.otra, { n: i + 2 })}
                className="aspect-square w-full rounded-xl object-cover"
                loading="lazy"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
