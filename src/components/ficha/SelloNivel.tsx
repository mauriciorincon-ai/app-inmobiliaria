import type { NivelVerificacion } from "@/lib/supabase/types";

// Sello del nivel de verificación. "Fundador" (nivel 1) y "Propietario verificado ⭐" (nivel 2,
// tras que el operador vea el CTL). El sello es señal de confianza, no expone datos.
export default function SelloNivel({ nivel }: { nivel: NivelVerificacion }) {
  if (nivel === "verificado") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple px-3 py-1 text-sm font-semibold text-white">
        ⭐ Propietario verificado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-tint px-3 py-1 text-sm font-semibold text-purple-600">
      Fundador
    </span>
  );
}
