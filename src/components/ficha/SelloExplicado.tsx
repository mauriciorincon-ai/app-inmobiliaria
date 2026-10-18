import { estadoSello } from "@/engine/sello/sello";
import { formatearFecha } from "@/engine/format/fecha";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import type { NivelVerificacion } from "@/lib/supabase/types";
import type { FICHA } from "@/textos/ficha";
import { Reloj } from "@/components/ficha/SelloNivel";

export type TextosSelloExplicado = Proyectado<typeof FICHA.selloExplicado>;

// El sello, explicado con el criterio objetivo detrás de cada estado. Sin JavaScript: «¿Qué
// revisamos?» es un <details> nativo.
export default function SelloExplicado({
  nivel,
  ctlExpedidoEl,
  lang,
  t,
}: {
  nivel: NivelVerificacion;
  ctlExpedidoEl: string | null;
  lang: Idioma;
  t: TextosSelloExplicado;
}) {
  const estado = estadoSello(nivel, ctlExpedidoEl);

  if (estado === "verificado" && ctlExpedidoEl) {
    const fecha = formatearFecha(ctlExpedidoEl, lang);
    return (
      <section className="mt-6 rounded-2xl border border-purple-200 p-5">
        <h2 className="text-lg font-bold text-ink">{t.verificado.titulo}</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray">
          {rellenar(t.verificado.detalle, { fecha })}
        </p>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-semibold text-purple-600">
            {t.verificado.queRevisamos}
          </summary>
          <ul className="mt-2 space-y-1.5 text-gray">
            {t.verificado.pasos.map((p) => (
              <li key={p} className="flex gap-2">
                <span aria-hidden="true" className="font-bold text-ok">
                  ✓
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </details>
      </section>
    );
  }

  if (estado === "reverificacion_pendiente") {
    return (
      <section className="mt-6 flex gap-3 rounded-2xl border border-aviso-borde bg-aviso-tint p-4 text-aviso">
        <span className="mt-0.5 shrink-0">
          <Reloj />
        </span>
        <div>
          <p className="font-semibold">{t.reverificacion.titulo}</p>
          <p className="mt-1 text-sm">{t.reverificacion.detalle}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl bg-purple-tint p-4">
      <p className="font-semibold text-ink">{t.fundador.titulo}</p>
      <p className="mt-1 text-sm text-gray">{t.fundador.detalle}</p>
    </section>
  );
}
