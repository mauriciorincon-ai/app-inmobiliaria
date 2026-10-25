"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { huellaDeImagen } from "@/lib/huella-cliente";
import { rellenar, type Proyectado } from "@/i18n/textos";
import type { ANTIFRAUDE } from "@/textos/antifraude";

export type TextosHuellar = Pick<
  Proyectado<typeof ANTIFRAUDE.cola>,
  "huellar" | "huellando" | "huellado" | "errores"
>;

// Las fotos subidas antes del S15 no tienen huella. El navegador del operador baja cada miniatura por la ruta del panel (mismo
// origen: el bucket público no manda CORS), calcula la huella con el MISMO código de la subida y la guarda. Sin llaves nuevas.
export default function HuellarFotos({
  pendientes,
  t,
}: {
  pendientes: readonly { id: string; r2_key: string }[];
  t: TextosHuellar;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function huellar() {
    setOcupado(true);
    setError(false);
    setResultado(null);
    const huellas: { fotoId: string; huella: string }[] = [];
    let fallidas = 0;
    for (const p of pendientes) {
      try {
        const res = await fetch(
          `/api/operador/fotos/miniatura?key=${encodeURIComponent(p.r2_key)}`,
          { cache: "no-store" },
        );
        const huella = res.ok ? await huellaDeImagen(await res.blob()) : null;
        if (huella) huellas.push({ fotoId: p.id, huella });
        else fallidas++;
      } catch {
        fallidas++;
      }
    }
    try {
      let ok = 0;
      if (huellas.length > 0) {
        const res = await fetch("/api/operador/fotos/huellas", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ huellas }),
        });
        if (!res.ok) return setError(true);
        ok = ((await res.json()) as { guardadas: number }).guardadas;
      }
      setResultado(rellenar(t.huellado, { ok, fallidas }));
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setOcupado(false);
    }
  }

  if (pendientes.length === 0) return null;
  return (
    <div aria-live="polite">
      <button
        type="button"
        disabled={ocupado}
        onClick={() => void huellar()}
        className="inline-flex items-center justify-center rounded-full border border-purple-200 px-5 py-2 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-tint disabled:opacity-60"
      >
        {ocupado
          ? rellenar(t.huellando, { n: pendientes.length })
          : `${t.huellar} (${pendientes.length})`}
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
