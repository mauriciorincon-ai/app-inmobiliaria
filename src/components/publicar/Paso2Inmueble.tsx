import Campo from "@/components/ui/Campo";
import { OPERACIONES, TIPOS } from "@/engine/registro/schema";
import { LOCALIDADES } from "@/engine/zonas/localidades";
import type { EstadoFormulario } from "@/engine/registro/wizard";
import type { Errores } from "@/components/publicar/Paso1Contacto";
import type { Proyectado } from "@/i18n/textos";
import type { COMUN } from "@/textos/comun";
import type { PUBLICAR } from "@/textos/publicar";

export type TextosPaso2 = Proyectado<typeof PUBLICAR.paso2>;
export type Dominio = Proyectado<typeof COMUN.dominio>;

type Props = {
  t: TextosPaso2;
  dominio: Dominio;
  datos: EstadoFormulario;
  errores: Errores;
  set: (campo: keyof EstadoFormulario, valor: string) => void;
};

// Ejemplos de formato, no son texto de la interfaz: no se traducen.
const EJEMPLO_AREA = "78";
const EJEMPLO_HABITACIONES = "3";

// Paso 2 — Datos del inmueble. Lo mínimo indispensable; sin fotos ni documentos.
export default function Paso2Inmueble({
  t,
  dominio,
  datos,
  errores,
  set,
}: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">
          {t.titulo}
        </h2>
        <p className="mt-1 text-sm text-gray">{t.subtitulo}</p>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-ink">
          {t.operacion.etiqueta}
          <span className="text-purple-600"> *</span>
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
                {dominio.operacion[op]}
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
        label={t.tipo.etiqueta}
        requerido
        value={datos.tipo}
        onChange={(v) => set("tipo", v)}
        error={errores.tipo}
        placeholder={t.tipo.ejemplo}
        opciones={TIPOS.map((v) => ({ value: v, label: dominio.tipo[v] }))}
      />
      <Campo
        id="localidad"
        control="select"
        label={t.localidad.etiqueta}
        requerido
        value={datos.localidad}
        onChange={(v) => set("localidad", v)}
        error={errores.localidad}
        hint={t.localidad.ayuda}
        placeholder={t.localidad.ejemplo}
        opciones={LOCALIDADES.map((l) => ({ value: l, label: l }))}
      />
      <Campo
        id="barrio"
        label={t.barrio.etiqueta}
        requerido
        value={datos.barrio}
        onChange={(v) => set("barrio", v)}
        error={errores.barrio}
        placeholder={t.barrio.ejemplo}
      />
      <Campo
        id="direccion_aproximada"
        label={t.direccion.etiqueta}
        value={datos.direccion_aproximada}
        onChange={(v) => set("direccion_aproximada", v)}
        error={errores.direccion_aproximada}
        hint={t.direccion.ayuda}
        placeholder={t.direccion.ejemplo}
      />
      <div className="grid grid-cols-2 gap-4">
        <Campo
          id="area_m2"
          label={t.area.etiqueta}
          requerido
          inputMode="numeric"
          value={datos.area_m2}
          onChange={(v) => set("area_m2", v)}
          error={errores.area_m2}
          placeholder={EJEMPLO_AREA}
        />
        <Campo
          id="habitaciones"
          label={t.habitaciones.etiqueta}
          requerido
          inputMode="numeric"
          value={datos.habitaciones}
          onChange={(v) => set("habitaciones", v)}
          error={errores.habitaciones}
          placeholder={EJEMPLO_HABITACIONES}
        />
      </div>
      <Campo
        id="precio_esperado"
        label={t.precio.etiqueta}
        requerido
        inputMode="numeric"
        value={datos.precio_esperado}
        onChange={(v) => set("precio_esperado", v)}
        error={errores.precio_esperado}
        hint={t.precio.ayuda}
        placeholder={t.precio.ejemplo}
      />
    </div>
  );
}
