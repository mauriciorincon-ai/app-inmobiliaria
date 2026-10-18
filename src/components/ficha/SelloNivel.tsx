import type { Proyectado } from "@/i18n/textos";
import type { NivelVerificacion } from "@/lib/supabase/types";
import type { FICHA } from "@/textos/ficha";

export type TextosSello = Proyectado<typeof FICHA.sello>;

// Sello del nivel de verificación. "Fundador" (nivel 1) y "Propietario verificado ⭐" (nivel 2,
// tras que el operador vea el CTL). El sello es señal de confianza, no expone datos.
export default function SelloNivel({
  nivel,
  t,
}: {
  nivel: NivelVerificacion;
  t: TextosSello;
}) {
  if (nivel === "verificado") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple px-3 py-1 text-sm font-semibold text-white">
        {t.verificado}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-tint px-3 py-1 text-sm font-semibold text-purple-600">
      {t.fundador}
    </span>
  );
}
