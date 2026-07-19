"use client";

import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import {
  estaVigente,
  diasRestantes,
  POR_VENCER_DIAS,
} from "@/engine/vigencia/vigencia";
import type { RenovacionResult } from "@/lib/supabase/types";

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// Anti-zombie B3: renovar la vigencia con un clic. Es un POST (RPC `renovar_vigencia`), jamás un
// GET mutador. Muestra el estado honesto ("vivo hasta —" / "venció") y extiende +60 días al renovar.
export default function RenovarVigencia({
  token,
  vigenteHastaInicial,
}: {
  token: string;
  vigenteHastaInicial: string;
}) {
  const [vigenteHasta, setVigenteHasta] = useState(vigenteHastaInicial);
  const [renovando, setRenovando] = useState(false);
  const [error, setError] = useState(false);

  const vigente = estaVigente(vigenteHasta);
  const dias = diasRestantes(vigenteHasta);
  const porVencer = vigente && dias <= POR_VENCER_DIAS;

  async function renovar() {
    if (renovando) return;
    setRenovando(true);
    setError(false);
    const supabase = crearClienteNavegador();
    const { data, error: err } = await supabase.rpc("renovar_vigencia", {
      p_token: token,
    });
    if (err || !data) {
      setError(true);
    } else {
      setVigenteHasta((data as RenovacionResult).vigente_hasta);
    }
    setRenovando(false);
  }

  return (
    <section
      aria-labelledby="vigencia-titulo"
      className={`mt-8 rounded-[2rem] p-6 ${porVencer || !vigente ? "bg-amber-50" : "bg-cream"}`}
    >
      <h2 id="vigencia-titulo" className="text-lg font-extrabold text-ink">
        {vigente ? "Tu anuncio está vivo" : "Tu anuncio venció"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray">
        {vigente ? (
          <>
            Sigue publicado hasta el{" "}
            <span className="font-semibold text-ink">
              {fmtFecha(vigenteHasta)}
            </span>
            {porVencer
              ? ` (faltan ${dias} ${dias === 1 ? "día" : "días"}).`
              : "."}{" "}
            Renuévalo cuando quieras para que nunca desaparezca.
          </>
        ) : (
          <>
            Dejó de aparecer en la ficha pública. Renuévalo y vuelve a estar
            visible al instante.
          </>
        )}
      </p>
      <button
        type="button"
        onClick={() => void renovar()}
        disabled={renovando}
        className="mt-4 rounded-full bg-purple px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-transform hover:scale-[1.03] hover:bg-purple-600 disabled:opacity-60"
      >
        {renovando ? "Renovando…" : "Renovar 60 días más"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          No pudimos renovar. Inténtalo de nuevo en un momento.
        </p>
      )}
    </section>
  );
}
