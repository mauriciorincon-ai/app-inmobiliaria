"use client";

import { useState } from "react";
import { esEnteroEscrito, formatearCOP, parsearCOP } from "@/engine/format/cop";
import type { Idioma } from "@/i18n/idiomas";
import type { Proyectado } from "@/i18n/textos";
import { crearClienteNavegador } from "@/lib/supabase/client";
import type { MI_ANUNCIO } from "@/textos/mi-anuncio";

export type TextosPrecio = Proyectado<typeof MI_ANUNCIO.precio>;

// Cambiar el precio desde «Mi anuncio» (S9, ADR 017). Va directo a la base con el token del enlace privado, como
// el resto de esta pantalla. La base valida el rango y limita los cambios por día; cada cambio queda en el
// historial que alimenta el aviso de «bajó de precio» (una subida no avisa a nadie).
export default function EditorPrecio({
  t,
  lang,
  token,
  valorInicial,
  onGuardado,
}: {
  t: TextosPrecio;
  lang: Idioma;
  token: string;
  valorInicial: number;
  onGuardado: () => void | Promise<void>;
}) {
  const [texto, setTexto] = useState(String(valorInicial));
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valor = esEnteroEscrito(texto) ? parsearCOP(texto) : null;

  async function guardar(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    if (valor === null || valor === valorInicial) {
      return setError(valor === null ? t.errores.invalido : null);
    }
    setGuardando(true);
    const { error: e } = await crearClienteNavegador().rpc("guardar_precio", {
      p_token: token,
      p_precio: valor,
    });
    setGuardando(false);
    if (e) {
      const mensaje = e.message ?? "";
      return setError(
        mensaje.includes("precio_invalido")
          ? t.errores.invalido
          : mensaje.includes("demasiados_cambios")
            ? t.errores.demasiados
            : t.errores.servidor,
      );
    }
    setGuardado(true);
    await onGuardado();
  }

  return (
    <form onSubmit={(ev) => void guardar(ev)} className="mt-3" noValidate>
      <label
        htmlFor="precio-esperado"
        className="block text-sm font-semibold text-ink"
      >
        {t.etiqueta}
      </label>
      <p id="precio-ayuda" className="mt-1 text-xs text-mute">
        {t.ayuda}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          id="precio-esperado"
          inputMode="numeric"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setGuardado(false);
            setError(null);
          }}
          aria-describedby="precio-ayuda"
          aria-invalid={error ? true : undefined}
          className="w-56 rounded-2xl border border-purple-200 bg-white px-4 py-2.5 text-base text-ink focus:border-purple focus:outline-none"
        />
        <button
          type="submit"
          disabled={guardando}
          className="rounded-full bg-purple px-5 py-2 text-sm font-semibold text-white shadow-card transition-transform hover:bg-purple-600 hover:scale-[1.03] disabled:opacity-50"
        >
          {guardando ? t.guardando : guardado ? t.guardado : t.guardar}
        </button>
      </div>
      {valor !== null && (
        <p className="mt-1 text-sm text-gray">{formatearCOP(valor, lang)}</p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
