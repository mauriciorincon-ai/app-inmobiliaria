"use client";

import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import {
  estaVigente,
  diasRestantes,
  POR_VENCER_DIAS,
  VIGENCIA_DIAS,
} from "@/engine/vigencia/vigencia";
import { localeIntl, type Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import type { RenovacionResult } from "@/lib/supabase/types";
import type { VIGENCIA } from "@/textos/mi-anuncio";

export type TextosTarjeta = Proyectado<typeof VIGENCIA.tarjeta>;

// La fecha se escribe como la escribe quien lee: «20 de diciembre de 2026» o «December 20, 2026».
const fmtFecha = (iso: string, idioma: Idioma) =>
  new Date(iso).toLocaleDateString(localeIntl(idioma), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// Anti-zombie B3: renovar la vigencia con un clic. Es un POST (RPC `renovar_vigencia`), jamás un
// GET mutador. Muestra el estado honesto ("vivo hasta —" / "venció") y extiende +60 días al renovar.
export default function RenovarVigencia({
  lang,
  t,
  token,
  vigenteHastaInicial,
  pausadoInicial = false,
}: {
  lang: Idioma;
  t: TextosTarjeta;
  token: string;
  vigenteHastaInicial: string;
  /** S15 — el equipo lo tiene en pausa: renovar le da más días, pero no lo vuelve a mostrar. */
  pausadoInicial?: boolean;
}) {
  const [vigenteHasta, setVigenteHasta] = useState(vigenteHastaInicial);
  const [pausado, setPausado] = useState(pausadoInicial);
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
      const r = data as RenovacionResult;
      setVigenteHasta(r.vigente_hasta);
      setPausado(r.pausado === true);
    }
    setRenovando(false);
  }

  return (
    <section
      aria-labelledby="vigencia-titulo"
      className={`mt-8 rounded-[2rem] p-6 ${porVencer || !vigente ? "bg-amber-50" : "bg-cream"}`}
    >
      <h2 id="vigencia-titulo" className="text-lg font-extrabold text-ink">
        {vigente ? t.vivo : t.vencido}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray">
        {vigente ? (
          <>
            {t.vivoAntes}
            <span className="font-semibold text-ink">
              {fmtFecha(vigenteHasta, lang)}
            </span>
            {porVencer
              ? rellenar(dias === 1 ? t.faltaUno : t.faltanVarios, { n: dias })
              : ""}
            .{t.vivoDespues}
          </>
        ) : (
          t.vencidoTexto
        )}
      </p>
      {pausado && (
        <p
          role="status"
          data-testid="renovar-pausado"
          className="mt-3 flex gap-2 text-sm font-semibold text-ink"
        >
          <span aria-hidden="true">⏸</span>
          {t.pausado}
        </p>
      )}
      <button
        type="button"
        onClick={() => void renovar()}
        disabled={renovando}
        className="mt-4 rounded-full bg-purple px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-transform hover:scale-[1.03] hover:bg-purple-600 disabled:opacity-60"
      >
        {renovando ? t.renovando : rellenar(t.renovar, { dias: VIGENCIA_DIAS })}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {t.error}
        </p>
      )}
    </section>
  );
}
