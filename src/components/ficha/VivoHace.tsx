import { diasVivo } from "@/engine/vigencia/vigencia";
import { rellenar, type Proyectado } from "@/i18n/textos";
import type { FICHA } from "@/textos/ficha";

export type TextosVivo = Proyectado<typeof FICHA.vivo>;

// «Vivo hace N días»: la promesa anti-zombie a la vista. N = días desde la última confirmación del
// dueño (`vigente_hasta − 60 d`, ADR 007): un dato real, no un adorno. Si la fecha no se puede leer,
// no se muestra nada (jamás un número inventado).
export default function VivoHace({
  vigenteHasta,
  t,
  ahora = new Date(),
}: {
  vigenteHasta: string;
  t: TextosVivo;
  ahora?: Date;
}) {
  const n = diasVivo(vigenteHasta, ahora);
  if (n === null) return null;
  const titulo =
    n === 0 ? t.hoy : n === 1 ? t.haceUno : rellenar(t.haceVarios, { n });
  return (
    <div className="mt-6 flex items-start gap-3 rounded-2xl bg-cream p-4">
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint text-sm font-bold text-ok"
      >
        ✓
      </span>
      <div>
        <p className="font-semibold text-ink">{titulo}</p>
        <p className="mt-0.5 text-sm text-mute">{t.nota}</p>
      </div>
    </div>
  );
}
