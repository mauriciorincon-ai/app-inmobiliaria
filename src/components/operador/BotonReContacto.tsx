"use client";

import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { construirLinkAnuncio } from "@/engine/token/token";
import { construirWaMe, mensajeReContacto } from "@/engine/format/whatsapp";

// Re-contacto de un fundador (sobre todo los del S1, sin fotos): genera un magic link fresco
// (rota el token) y abre WhatsApp con el mensaje prellenado que lo invita a completar su anuncio.
export default function BotonReContacto({
  inmuebleId,
  nombre,
  whatsapp,
}: {
  inmuebleId: string;
  nombre: string;
  whatsapp: string;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(false);

  async function reContactar() {
    if (ocupado) return;
    setOcupado(true);
    setError(false);
    const supabase = crearClienteNavegador();
    const { data, error: err } = await supabase.rpc("generar_link_anuncio", {
      p_inmueble_id: inmuebleId,
    });
    setOcupado(false);
    if (err || !data) {
      setError(true);
      return;
    }
    const link = construirLinkAnuncio(window.location.origin, data);
    const url = construirWaMe(whatsapp, mensajeReContacto(nombre, link));
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void reContactar()}
        disabled={ocupado || !whatsapp}
        className="rounded-full border border-purple-200 px-4 py-1.5 text-xs font-semibold text-purple-600 hover:bg-purple-tint disabled:opacity-50"
      >
        {ocupado ? "Generando…" : "Re-contactar por WhatsApp"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-red-600">
          No se pudo generar el enlace.
        </p>
      )}
    </div>
  );
}
