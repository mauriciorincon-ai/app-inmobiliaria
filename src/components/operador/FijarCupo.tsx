"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/client";

// Fija (o quita) el cupo de fundador de una zona. Vacío ⇒ null ⇒ la zona deja de mostrar contador
// (escasez real o no existe). El número es decisión operativa del operador.
export default function FijarCupo({
  zonaId,
  cupoActual,
}: {
  zonaId: string;
  cupoActual: number | null;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(
    cupoActual === null ? "" : String(cupoActual),
  );
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (guardando) return;
    setGuardando(true);
    const supabase = crearClienteNavegador();
    const n = valor.trim() === "" ? null : Math.trunc(Number(valor));
    const cupo = n !== null && Number.isFinite(n) && n >= 0 ? n : null;
    await supabase.rpc("fijar_cupo", { p_zona_id: zonaId, p_cupo: cupo });
    setGuardando(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor={`cupo-${zonaId}`}>
        Cupo total de la zona
      </label>
      <input
        id={`cupo-${zonaId}`}
        type="number"
        min={0}
        inputMode="numeric"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="—"
        className="w-20 rounded-lg border border-purple-200 px-2 py-1 text-sm text-ink focus:border-purple focus:outline-none"
      />
      <button
        type="button"
        onClick={() => void guardar()}
        disabled={guardando}
        className="rounded-full bg-purple px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
      >
        {guardando ? "…" : "Fijar"}
      </button>
    </div>
  );
}
