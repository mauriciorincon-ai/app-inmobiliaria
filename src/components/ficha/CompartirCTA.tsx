"use client";

import { useState } from "react";

// Botón para compartir/copiar el enlace de la ficha (útil single-player: el vendedor la comparte
// por WhatsApp aunque aún no existan compradores).
export default function CompartirCTA() {
  const [copiado, setCopiado] = useState(false);

  async function compartir() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // el usuario canceló el diálogo nativo: caemos a copiar
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void compartir()}
      className="inline-flex items-center gap-2 rounded-full border border-purple-200 px-5 py-2.5 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-tint"
    >
      {copiado ? "Enlace copiado ✓" : "Compartir este inmueble"}
    </button>
  );
}
