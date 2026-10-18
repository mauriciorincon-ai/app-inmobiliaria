"use client";

import { useState } from "react";
import { rellenar, type Proyectado } from "@/i18n/textos";
import { crearClienteNavegador } from "@/lib/supabase/client";
import type { MI_ANUNCIO } from "@/textos/mi-anuncio";

export type TextosEditor = Proyectado<typeof MI_ANUNCIO.editor>;

// Editor de la descripción con plantilla guía + contador. Guarda al presionar "Guardar" (evita
// escribir en BD en cada tecla). El largo en vivo alimenta el score vía onEscribir.
export default function EditorDescripcion({
  t,
  token,
  valorInicial,
  minimo,
  onEscribir,
  onGuardado,
}: {
  t: TextosEditor;
  token: string;
  valorInicial: string;
  minimo: number;
  onEscribir: (largo: number) => void;
  onGuardado: () => void | Promise<void>;
}) {
  const [texto, setTexto] = useState(valorInicial);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const suficiente = texto.trim().length >= minimo;

  function cambiar(v: string) {
    setTexto(v);
    setGuardado(false);
    onEscribir(v.trim().length);
  }

  async function guardar() {
    if (guardando || !suficiente) return;
    setGuardando(true);
    const supabase = crearClienteNavegador();
    await supabase.rpc("guardar_descripcion", {
      p_token: token,
      p_descripcion: texto.trim(),
    });
    await onGuardado();
    setGuardando(false);
    setGuardado(true);
  }

  return (
    <div className="mt-3">
      <label htmlFor="descripcion" className="sr-only">
        {t.etiqueta}
      </label>
      <textarea
        id="descripcion"
        value={texto}
        onChange={(e) => cambiar(e.target.value)}
        rows={5}
        maxLength={2000}
        placeholder={t.guia}
        className="w-full rounded-2xl border border-purple-200 bg-white px-4 py-3 text-base text-ink placeholder:text-mute focus:border-purple focus:outline-none focus-visible:outline-none"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-mute">
          {suficiente ? (
            <span className="font-medium text-ink">{t.buena}</span>
          ) : (
            rellenar(t.faltan, { minimo, largo: texto.trim().length })
          )}
        </p>
        <button
          type="button"
          onClick={() => void guardar()}
          disabled={guardando || !suficiente}
          className="rounded-full bg-purple px-5 py-2 text-sm font-semibold text-white shadow-card transition-transform hover:bg-purple-600 hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100"
        >
          {guardando ? t.guardando : guardado ? t.guardado : t.guardar}
        </button>
      </div>
    </div>
  );
}
