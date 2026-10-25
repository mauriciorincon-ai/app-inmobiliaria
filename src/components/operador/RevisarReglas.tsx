"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { rellenar, type Proyectado } from "@/i18n/textos";
import type { ANTIFRAUDE } from "@/textos/antifraude";

export type TextosRevisar = Pick<
  Proyectado<typeof ANTIFRAUDE.cola>,
  "revisar" | "revisando" | "revisado" | "errores"
>;

// «Revisar reglas ahora» (S15): corre las cuatro reglas y recarga la cola. El trabajo diario hace lo mismo cada mañana.
export default function RevisarReglas({ t }: { t: TextosRevisar }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function revisar() {
    setOcupado(true);
    setError(false);
    setResultado(null);
    try {
      const res = await fetch("/api/operador/antifraude/revisar", {
        method: "POST",
      });
      if (!res.ok) return setError(true);
      const conteo = (await res.json()) as Record<string, number>;
      setResultado(rellenar(t.revisado, conteo));
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div aria-live="polite">
      <button
        type="button"
        disabled={ocupado}
        onClick={() => void revisar()}
        className="inline-flex items-center justify-center rounded-full bg-purple px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-600 disabled:opacity-60"
      >
        {ocupado ? t.revisando : t.revisar}
      </button>
      {resultado && (
        <p className="mt-2 text-sm text-gray">
          <span aria-hidden="true">✓ </span>
          {resultado}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          <span aria-hidden="true">✕ </span>
          {t.errores.servidor}
        </p>
      )}
    </div>
  );
}
