import { PASOS, progreso, type Paso } from "@/engine/registro/wizard";

const etiquetas: Record<Paso, string> = {
  1: "Tú",
  2: "Tu inmueble",
  3: "Revisa y envía",
};

// Indicador de progreso del wizard. Anuncia el avance a lectores de pantalla.
export default function Progreso({ paso }: { paso: Paso }) {
  const pct = progreso(paso);
  return (
    <div>
      <div className="flex items-center justify-between text-sm font-semibold text-ink">
        <span>
          Paso {paso} de {PASOS.length}
        </span>
        <span className="text-mute">{etiquetas[paso]}</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-purple-tint"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso del registro: paso ${paso} de ${PASOS.length}`}
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
