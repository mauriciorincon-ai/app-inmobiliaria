import dynamic from "next/dynamic";
import type { TextosRangoDueno } from "@/components/precio/RangoDueno";
import Campo from "@/components/ui/Campo";
import { esEnteroEscrito, parsearCOP } from "@/engine/format/cop";
import { OPERACIONES, TIPOS } from "@/engine/registro/schema";
import { LOCALIDADES } from "@/engine/zonas/localidades";
import { sectorPorNombre, sectoresDeLocalidad } from "@/engine/zonas/sectores";
import type { EstadoFormulario } from "@/engine/registro/wizard";
import type { Errores } from "@/components/publicar/Paso1Contacto";
import type { Idioma } from "@/i18n/idiomas";
import type { Proyectado } from "@/i18n/textos";
import type { COMUN } from "@/textos/comun";
import type { PUBLICAR } from "@/textos/publicar";

export type TextosPaso2 = Proyectado<typeof PUBLICAR.paso2>;
export type Dominio = Proyectado<typeof COMUN.dominio>;

// El rango de la zona pesa (consulta la base y corre el motor): solo se descarga al llegar a este paso.
const RangoDueno = dynamic(() => import("@/components/precio/RangoDueno"), {
  loading: () => null,
});

type Props = {
  lang: Idioma;
  t: TextosPaso2;
  precio: TextosRangoDueno;
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
  lang,
  t,
  precio,
  dominio,
  datos,
  errores,
  set,
}: Props) {
  const area = /^\d{1,5}$/.test(datos.area_m2.trim())
    ? Number(datos.area_m2.trim())
    : null;
  const valorPrecio = esEnteroEscrito(datos.precio_esperado)
    ? parsearCOP(datos.precio_esperado)
    : null;
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
        onChange={(v) => {
          set("localidad", v);
          // Un barrio de otra localidad ya no vale: se vuelve a elegir.
          if (datos.barrio && !sectorPorNombre(v, datos.barrio))
            set("barrio", "");
        }}
        error={errores.localidad}
        hint={t.localidad.ayuda}
        placeholder={t.localidad.ejemplo}
        opciones={LOCALIDADES.map((l) => ({ value: l, label: l }))}
      />
      <Campo
        id="barrio"
        control="select"
        label={t.barrio.etiqueta}
        requerido
        value={datos.barrio}
        onChange={(v) => set("barrio", v)}
        error={errores.barrio}
        hint={t.barrio.ayuda}
        deshabilitado={!datos.localidad}
        placeholder={
          datos.localidad ? t.barrio.ejemplo : t.barrio.primeroLocalidad
        }
        opciones={sectoresDeLocalidad(datos.localidad).map((s) => ({
          value: s.nombre,
          label: s.nombre,
        }))}
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
      <RangoDueno
        lang={lang}
        t={precio}
        operacion={OPERACIONES.find((o) => o === datos.operacion) ?? ""}
        tipo={TIPOS.find((v) => v === datos.tipo) ?? ""}
        localidad={datos.localidad || null}
        sectorCodigo={
          sectorPorNombre(datos.localidad, datos.barrio)?.codigo ?? null
        }
        area={area}
        precio={valorPrecio}
      />
    </div>
  );
}
