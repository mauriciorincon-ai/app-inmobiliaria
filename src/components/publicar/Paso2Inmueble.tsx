import Campo from "@/components/ui/Campo";
import { OPERACIONES } from "@/engine/registro/schema";
import { LOCALIDADES } from "@/engine/zonas/localidades";
import type { EstadoFormulario } from "@/engine/registro/wizard";
import type { Errores } from "@/components/publicar/Paso1Contacto";

type Props = {
  datos: EstadoFormulario;
  errores: Errores;
  set: (campo: keyof EstadoFormulario, valor: string) => void;
};

const opcionOperacion: Record<(typeof OPERACIONES)[number], string> = {
  venta: "Venta",
  arriendo: "Arriendo",
};

const opcionesTipo = [
  { value: "apartamento", label: "Apartamento" },
  { value: "casa", label: "Casa" },
  { value: "apartaestudio", label: "Apartaestudio" },
  { value: "otro", label: "Otro" },
];

// Paso 2 — Datos del inmueble. Lo mínimo indispensable; sin fotos ni documentos.
export default function Paso2Inmueble({ datos, errores, set }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">
          Sobre tu inmueble
        </h2>
        <p className="mt-1 text-sm text-gray">
          Solo lo básico. Las fotos llegan en la próxima etapa.
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-ink">
          ¿Vendes o arriendas?<span className="text-purple-600"> *</span>
        </legend>
        <div className="mt-2 flex gap-3">
          {OPERACIONES.map((op) => {
            const activo = datos.operacion === op;
            return (
              <label
                key={op}
                className={`flex-1 cursor-pointer rounded-2xl border px-4 py-3 text-center text-sm font-semibold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-purple ${
                  activo
                    ? "border-purple bg-purple text-white"
                    : "border-purple-200 bg-white text-ink hover:border-purple"
                }`}
              >
                <input
                  type="radio"
                  name="operacion"
                  value={op}
                  checked={activo}
                  onChange={(e) => set("operacion", e.target.value)}
                  className="sr-only"
                  aria-describedby={
                    errores.operacion ? "operacion-error" : undefined
                  }
                />
                {opcionOperacion[op]}
              </label>
            );
          })}
        </div>
        {errores.operacion && (
          <p
            id="operacion-error"
            role="alert"
            className="mt-1.5 text-sm font-medium text-red-600"
          >
            {errores.operacion}
          </p>
        )}
      </fieldset>

      <Campo
        id="tipo"
        control="select"
        label="Tipo de inmueble"
        requerido
        value={datos.tipo}
        onChange={(v) => set("tipo", v)}
        error={errores.tipo}
        placeholder="Elige el tipo"
        opciones={opcionesTipo}
      />
      <Campo
        id="localidad"
        control="select"
        label="Localidad"
        requerido
        value={datos.localidad}
        onChange={(v) => set("localidad", v)}
        error={errores.localidad}
        hint="Tu localidad de Bogotá. Con ella sabemos cuántos cupos de fundador quedan en tu zona."
        placeholder="Elige tu localidad"
        opciones={LOCALIDADES.map((l) => ({ value: l, label: l }))}
      />
      <Campo
        id="barrio"
        label="Barrio"
        requerido
        value={datos.barrio}
        onChange={(v) => set("barrio", v)}
        error={errores.barrio}
        placeholder="Ej: Cedritos"
      />
      <Campo
        id="direccion_aproximada"
        label="Dirección aproximada (opcional)"
        value={datos.direccion_aproximada}
        onChange={(v) => set("direccion_aproximada", v)}
        error={errores.direccion_aproximada}
        hint="No la mostramos públicamente. Nos ayuda a ubicar la zona."
        placeholder="Ej: Calle 140 con carrera 15"
      />
      <div className="grid grid-cols-2 gap-4">
        <Campo
          id="area_m2"
          label="Área (m²)"
          requerido
          inputMode="numeric"
          value={datos.area_m2}
          onChange={(v) => set("area_m2", v)}
          error={errores.area_m2}
          placeholder="78"
        />
        <Campo
          id="habitaciones"
          label="Habitaciones"
          requerido
          inputMode="numeric"
          value={datos.habitaciones}
          onChange={(v) => set("habitaciones", v)}
          error={errores.habitaciones}
          placeholder="3"
        />
      </div>
      <Campo
        id="precio_esperado"
        label="Precio esperado (COP)"
        requerido
        inputMode="numeric"
        value={datos.precio_esperado}
        onChange={(v) => set("precio_esperado", v)}
        error={errores.precio_esperado}
        hint="Un estimado está bien. Lo puedes ajustar después."
        placeholder="420.000.000"
      />
    </div>
  );
}
