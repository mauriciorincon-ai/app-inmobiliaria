"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Proyectado } from "@/i18n/textos";
import { crearClienteNavegador } from "@/lib/supabase/client";
import type { OPERADOR } from "@/textos/operador";

export type TextosVerificar = Proyectado<typeof OPERADOR.marcarVerificado>;

// Ejemplo de formato de una matrícula, no es texto de la interfaz: no se traduce.
const EJEMPLO_MATRICULA = "50N-1234567";

// Verificación nivel 2 desde el panel. El operador YA vio el CTL (documento JAMÁS almacenado:
// ni upload, ni logs) y aquí solo captura la matrícula + confirma que lo vio. La RPC persiste
// matrícula + verificado_at + nivel. Regla de dominio 3.
export default function MarcarVerificado({
  t,
  inmuebleId,
}: {
  t: TextosVerificar;
  inmuebleId: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [matricula, setMatricula] = useState("");
  const [visto, setVisto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listo = matricula.trim().length >= 4 && visto;

  async function confirmar() {
    if (!listo || guardando) return;
    setGuardando(true);
    setError(null);
    const supabase = crearClienteNavegador();
    const { error: err } = await supabase.rpc("marcar_verificado", {
      p_inmueble_id: inmuebleId,
      p_matricula: matricula.trim(),
    });
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
        className="rounded-full bg-purple px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-600"
      >
        {t.boton}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-purple-200 bg-white p-3">
      <label
        htmlFor={`mat-${inmuebleId}`}
        className="block text-xs font-semibold text-ink"
      >
        {t.matricula}
      </label>
      <input
        id={`mat-${inmuebleId}`}
        value={matricula}
        onChange={(e) => setMatricula(e.target.value)}
        placeholder={EJEMPLO_MATRICULA}
        className="mt-1 w-full rounded-xl border border-purple-200 px-3 py-1.5 text-sm text-ink focus:border-purple focus:outline-none"
      />
      <label className="mt-2 flex items-start gap-2 text-xs text-gray">
        <input
          type="checkbox"
          checked={visto}
          onChange={(e) => setVisto(e.target.checked)}
          className="mt-0.5 accent-purple"
        />
        {t.visto}
      </label>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => void confirmar()}
          disabled={!listo || guardando}
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
