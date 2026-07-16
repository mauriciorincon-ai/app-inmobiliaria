import Campo from "@/components/ui/Campo";
import type { EstadoFormulario } from "@/engine/registro/wizard";

export type Errores = Partial<Record<string, string>>;

type Props = {
  datos: EstadoFormulario;
  errores: Errores;
  set: (campo: keyof EstadoFormulario, valor: string) => void;
};

// Paso 1 — Contacto. MÁXIMO 3 campos (acceptance criterion): nombre, WhatsApp, ciudad.
export default function Paso1Contacto({ datos, errores, set }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">
          Empecemos por ti
        </h2>
        <p className="mt-1 text-sm text-gray">
          Toma menos de un minuto. Sin papeles.
        </p>
      </div>

      <Campo
        id="nombre"
        label="¿Cómo te llamas?"
        requerido
        value={datos.nombre}
        onChange={(v) => set("nombre", v)}
        error={errores.nombre}
        placeholder="Tu nombre"
        autoComplete="name"
      />
      <Campo
        id="whatsapp"
        label="Tu WhatsApp"
        requerido
        type="tel"
        inputMode="tel"
        value={datos.whatsapp}
        onChange={(v) => set("whatsapp", v)}
        error={errores.whatsapp}
        hint="Te escribiremos por aquí sobre tu publicación."
        placeholder="300 123 4567"
        autoComplete="tel"
      />
      <Campo
        id="ciudad"
        label="¿En qué ciudad está tu inmueble?"
        requerido
        value={datos.ciudad}
        onChange={(v) => set("ciudad", v)}
        error={errores.ciudad}
        placeholder="Bogotá"
      />
    </div>
  );
}
