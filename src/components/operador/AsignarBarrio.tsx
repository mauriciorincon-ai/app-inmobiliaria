"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALIDADES } from "@/engine/zonas/localidades";
import { sectoresDeLocalidad } from "@/engine/zonas/sectores";
import { rellenar, type Proyectado } from "@/i18n/textos";
import { crearClienteNavegador } from "@/lib/supabase/client";
import type { OPERADOR } from "@/textos/operador";

export type TextosAsignarBarrio = Proyectado<typeof OPERADOR.asignarBarrio>;

// Asigna a mano un barrio del catálogo a un anuncio de antes del catálogo (barrio escrito a mano).
// Fija `barrio` y `sector_codigo` juntos: la asignación explícita manda sobre la coincidencia por
// nombre del trigger. El operador ya tiene UPDATE sobre `inmuebles` por RLS; no hace falta una RPC.
export default function AsignarBarrio({
  t,
  inmuebleId,
  barrioEscrito,
  localidadInicial,
}: {
  t: TextosAsignarBarrio;
  inmuebleId: string;
  barrioEscrito: string;
  localidadInicial: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [localidad, setLocalidad] = useState(
    (LOCALIDADES as readonly string[]).includes(localidadInicial)
      ? localidadInicial
      : "",
  );
  const [codigo, setCodigo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sectores = localidad ? sectoresDeLocalidad(localidad) : [];

  async function asignar() {
    const sector = sectores.find((s) => s.codigo === codigo);
    if (!sector || guardando) return;
    setGuardando(true);
    setError(null);
    const supabase = crearClienteNavegador();
    const { error: err } = await supabase
      .from("inmuebles")
      .update({ barrio: sector.nombre, sector_codigo: sector.codigo })
      .eq("id", inmuebleId);
    setGuardando(false);
    if (err) {
      setError(t.error);
      return;
    }
    setAbierto(false);
    router.refresh();
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-full bg-purple-tint px-3 py-1 text-xs font-semibold text-purple-600 hover:bg-purple-200"
      >
        {t.boton}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-purple-200 bg-white p-3">
      <p className="text-xs text-gray">
        {rellenar(t.escrito, { barrio: barrioEscrito })}
      </p>
      <label
        htmlFor={`loc-${inmuebleId}`}
        className="mt-2 block text-xs font-semibold text-ink"
      >
        {t.localidad}
      </label>
      <select
        id={`loc-${inmuebleId}`}
        value={localidad}
        onChange={(e) => {
          setLocalidad(e.target.value);
          setCodigo("");
        }}
        className="mt-1 w-full rounded-xl border border-purple-200 px-3 py-1.5 text-sm text-ink focus:border-purple focus:outline-none"
      >
        <option value="" disabled>
          {t.elegirLocalidad}
        </option>
        {LOCALIDADES.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <label
        htmlFor={`bar-${inmuebleId}`}
        className="mt-2 block text-xs font-semibold text-ink"
      >
        {t.barrio}
      </label>
      <select
        id={`bar-${inmuebleId}`}
        value={codigo}
        disabled={!localidad}
        onChange={(e) => setCodigo(e.target.value)}
        className="mt-1 w-full rounded-xl border border-purple-200 px-3 py-1.5 text-sm text-ink focus:border-purple focus:outline-none disabled:opacity-60"
      >
        <option value="" disabled>
          {t.elegirBarrio}
        </option>
        {sectores.map((s) => (
          <option key={s.codigo} value={s.codigo}>
            {s.nombre}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => void asignar()}
          disabled={!codigo || guardando}
          className="rounded-full bg-purple px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          {guardando ? t.guardando : t.confirmar}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-full px-3 py-1 text-xs font-semibold text-mute hover:bg-cream"
        >
          {t.cancelar}
        </button>
      </div>
    </div>
  );
}
