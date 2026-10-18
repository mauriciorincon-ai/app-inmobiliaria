import { PASOS, progreso, type Paso } from "@/engine/registro/wizard";
import { rellenar, type Proyectado } from "@/i18n/textos";
import type { PUBLICAR } from "@/textos/publicar";

export type TextosProgreso = Proyectado<typeof PUBLICAR.progreso>;

// Indicador de progreso del wizard. Anuncia el avance a lectores de pantalla.
export default function Progreso({
  paso,
  t,
}: {
  paso: Paso;
  t: TextosProgreso;
}) {
  const pct = progreso(paso);
  const valores = { paso, total: PASOS.length };
  return (
    <div>
      <div className="flex items-center justify-between text-sm font-semibold text-ink">
        <span>{rellenar(t.paso, valores)}</span>
        <span className="text-mute">{t.etiquetas[paso - 1]}</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-purple-tint"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={rellenar(t.aria, valores)}
      >
        <div
          className="h-full rounded-full bg-purple transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Export nombrado además del default: `export *` (barriles, design-sync) no re-exporta defaults.
export { Progreso };
