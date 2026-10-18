import Campo from "@/components/ui/Campo";
import type { EstadoFormulario } from "@/engine/registro/wizard";
import type { Proyectado } from "@/i18n/textos";
import type { PUBLICAR } from "@/textos/publicar";

export type Errores = Partial<Record<string, string>>;
export type TextosPaso1 = Proyectado<typeof PUBLICAR.paso1>;

type Props = {
  t: TextosPaso1;
  datos: EstadoFormulario;
  errores: Errores;
  set: (campo: keyof EstadoFormulario, valor: string) => void;
};

// Ejemplos de formato, no son texto de la interfaz: no se traducen.
const EJEMPLO_WHATSAPP = "300 123 4567";
const EJEMPLO_CIUDAD = "Bogotá";

// Paso 1 — Contacto. MÁXIMO 3 campos (acceptance criterion): nombre, WhatsApp, ciudad.
export default function Paso1Contacto({ t, datos, errores, set }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">
          {t.titulo}
        </h2>
        <p className="mt-1 text-sm text-gray">{t.subtitulo}</p>
      </div>

      <Campo
        id="nombre"
        label={t.nombre.etiqueta}
        requerido
        value={datos.nombre}
        onChange={(v) => set("nombre", v)}
        error={errores.nombre}
        placeholder={t.nombre.ejemplo}
        autoComplete="name"
      />
      <Campo
        id="whatsapp"
        label={t.whatsapp.etiqueta}
        requerido
        type="tel"
        inputMode="tel"
        value={datos.whatsapp}
        onChange={(v) => set("whatsapp", v)}
        error={errores.whatsapp}
        hint={t.whatsapp.ayuda}
        placeholder={EJEMPLO_WHATSAPP}
        autoComplete="tel"
      />
      <Campo
        id="ciudad"
        label={t.ciudad.etiqueta}
        requerido
        value={datos.ciudad}
        onChange={(v) => set("ciudad", v)}
        error={errores.ciudad}
        placeholder={EJEMPLO_CIUDAD}
      />
    </div>
  );
}
