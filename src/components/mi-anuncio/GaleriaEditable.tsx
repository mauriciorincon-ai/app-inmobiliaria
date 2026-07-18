"use client";

import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { urlPublicaFoto, keyThumb } from "@/lib/fotos-url";
import type { FotoMiAnuncio } from "@/lib/supabase/types";

// Galería de las fotos ya subidas: elegir portada, eliminar. Las acciones van por RPC (token) y
// tras cada una se recarga el anuncio.
export default function GaleriaEditable({
  fotos,
  token,
  onCambio,
}: {
  fotos: FotoMiAnuncio[];
  token: string;
  onCambio: () => void | Promise<void>;
}) {
  const [ocupado, setOcupado] = useState(false);

  if (fotos.length === 0) return null;

  async function marcarPortada(fotoId: string) {
    if (ocupado) return;
    setOcupado(true);
    const supabase = crearClienteNavegador();
    await supabase.rpc("marcar_portada", { p_token: token, p_foto_id: fotoId });
    await onCambio();
    setOcupado(false);
  }

  async function eliminar(fotoId: string) {
    if (ocupado) return;
    setOcupado(true);
    const supabase = crearClienteNavegador();
    await supabase.rpc("eliminar_foto", { p_token: token, p_foto_id: fotoId });
    await onCambio();
    setOcupado(false);
  }

  return (
    <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {fotos.map((f) => (
        <li
          key={f.id}
          className="relative overflow-hidden rounded-2xl border border-purple-200 bg-cream"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- WebP ya optimizado en R2; next/image no aporta */}
          <img
            src={urlPublicaFoto(keyThumb(f.r2_key))}
            alt={f.es_portada ? "Foto de portada" : "Foto del inmueble"}
            className="aspect-[4/3] w-full object-cover"
            loading="lazy"
          />
          {f.es_portada && (
            <span className="absolute left-2 top-2 rounded-full bg-purple px-2 py-0.5 text-xs font-semibold text-white">
              Portada
            </span>
          )}
          <div className="flex items-center justify-between gap-1 px-2 py-1.5">
            <button
              type="button"
              onClick={() => void marcarPortada(f.id)}
              disabled={ocupado || f.es_portada}
              className="rounded-full px-2 py-1 text-xs font-semibold text-purple-600 hover:bg-purple-tint disabled:opacity-50"
            >
              {f.es_portada ? "Es portada" : "Portada"}
            </button>
            <button
              type="button"
              onClick={() => void eliminar(f.id)}
              disabled={ocupado}
              className="rounded-full px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Eliminar
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
