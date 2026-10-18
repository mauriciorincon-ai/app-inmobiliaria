import Link from "next/link";
import SelloNivel, { type TextosSello } from "@/components/ficha/SelloNivel";
import type { TextosVivo } from "@/components/ficha/VivoHace";
import { formatearCOP } from "@/engine/format/cop";
import { diasVivo } from "@/engine/vigencia/vigencia";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import { keyThumb, urlPublicaFoto } from "@/lib/fotos-url";
import type { ResultadoBusqueda } from "@/lib/supabase/types";
import type { BUSCAR } from "@/textos/buscar";

export type TextosTarjeta = Proyectado<typeof BUSCAR.tarjeta>;

// Unidad de superficie: igual en los dos idiomas, no es texto de la interfaz.
const UNIDAD_AREA = "m²";

function textoVivo(n: number | null, t: TextosVivo): string | null {
  if (n === null) return null;
  if (n === 0) return t.cortoHoy;
  if (n === 1) return t.cortoUno;
  return rellenar(t.cortoVarios, { n });
}

// Una tarjeta de la lista. El anuncio se ubica por el NOMBRE de su barrio y su localidad: jamás hay un
// punto ni una dirección. Sello y «vivo hace N días» son datos reales (la fecha del CTL y la última
// confirmación del dueño).
export default function TarjetaAnuncio({
  r,
  tipo,
  lang,
  t,
  tSello,
  tVivo,
  ahora,
}: {
  r: ResultadoBusqueda;
  tipo: string;
  lang: Idioma;
  t: TextosTarjeta;
  tSello: TextosSello;
  tVivo: TextosVivo;
  ahora: Date;
}) {
  const vivo = textoVivo(diasVivo(r.vigente_hasta, ahora), tVivo);
  return (
    <li>
      <article className="relative h-full rounded-2xl border border-purple-200 bg-white p-3 shadow-soft transition-shadow hover:shadow-card">
        <Link
          href={`/i/${r.slug}`}
          className="flex h-full flex-col gap-3 rounded-xl after:absolute after:inset-0 after:rounded-2xl"
        >
          {r.portada ? (
            // eslint-disable-next-line @next/next/no-img-element -- WebP ya optimizado en R2; next/image no aporta
            <img
              src={urlPublicaFoto(keyThumb(r.portada))}
              alt=""
              width={400}
              height={300}
              loading="lazy"
              decoding="async"
              className="aspect-[4/3] w-full rounded-xl object-cover"
            />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-purple-tint text-sm font-semibold text-purple-600">
              {t.sinFoto}
            </div>
          )}
          <div>
            <p className="text-xl font-extrabold text-ink">
              {formatearCOP(r.precio_esperado, lang)}
            </p>
            <p className="font-semibold text-ink">
              {tipo} · {r.barrio}
            </p>
            {r.localidad && <p className="text-sm text-mute">{r.localidad}</p>}
          </div>
          <p className="text-sm text-gray">
            {r.area_m2} {UNIDAD_AREA} ·{" "}
            {rellenar(t.habitaciones, { n: r.habitaciones })}
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <SelloNivel
              nivel={r.nivel_verificacion}
              ctlExpedidoEl={r.ctl_expedido_el}
              lang={lang}
              t={tSello}
              compacto
            />
            {vivo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2.5 py-0.5 text-xs font-semibold text-ok">
                <span aria-hidden="true">✓</span>
                {vivo}
              </span>
            )}
          </div>
        </Link>
      </article>
    </li>
  );
}
