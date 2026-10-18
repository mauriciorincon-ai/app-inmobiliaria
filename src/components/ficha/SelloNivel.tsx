import { estadoSello } from "@/engine/sello/sello";
import { formatearFecha } from "@/engine/format/fecha";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import type { NivelVerificacion } from "@/lib/supabase/types";
import type { FICHA } from "@/textos/ficha";

export type TextosSello = Proyectado<typeof FICHA.sello>;

// Un reloj: el símbolo del estado «pendiente» (el color nunca va solo).
function Reloj() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 5.5V10l3 2" />
    </svg>
  );
}

// El sello del anuncio: UNO solo y fuerte, en tres estados que salen de la presencia de la fecha del
// CTL (`engine/sello`): ⭐ verificado (con fecha) · re-verificación pendiente (verificado antes de que
// la fecha existiera) · fundador. `compacto` es la versión de la tarjeta de la búsqueda: el chip
// «⭐ CTL del 3 oct 2026» en lugar del nombre largo.
export default function SelloNivel({
  nivel,
  ctlExpedidoEl,
  lang,
  t,
  compacto = false,
}: {
  nivel: NivelVerificacion;
  ctlExpedidoEl: string | null;
  lang: Idioma;
  t: TextosSello;
  compacto?: boolean;
}) {
  const estado = estadoSello(nivel, ctlExpedidoEl);

  if (estado === "verificado") {
    const texto =
      compacto && ctlExpedidoEl
        ? `⭐ ${rellenar(t.ctlDel, { fecha: formatearFecha(ctlExpedidoEl, lang) })}`
        : t.verificado;
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple px-3 py-1 text-sm font-semibold text-white">
        {texto}
      </span>
    );
  }
  if (estado === "reverificacion_pendiente") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-aviso-borde bg-aviso-tint px-3 py-1 text-sm font-semibold text-aviso">
        <Reloj />
        {t.reverificacion}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-tint px-3 py-1 text-sm font-semibold text-purple-600">
      {t.fundador}
    </span>
  );
}

export { Reloj };
