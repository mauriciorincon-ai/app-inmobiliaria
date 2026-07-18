"use client";

import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";

// Opt-in Ley 1581: activa/desactiva mostrar el WhatsApp en la ficha pública. Libre y reversible;
// por defecto NO se expone contacto. El cambio va por RPC (token) y recarga el anuncio.
export default function OptInContacto({
  token,
  activo,
  onCambio,
}: {
  token: string;
  activo: boolean;
  onCambio: () => void | Promise<void>;
}) {
  const [ocupado, setOcupado] = useState(false);

  async function alternar() {
    if (ocupado) return;
    setOcupado(true);
    const supabase = crearClienteNavegador();
    await supabase.rpc("guardar_contacto_publico", {
      p_token: token,
      p_activo: !activo,
    });
    await onCambio();
    setOcupado(false);
  }

  return (
    <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl bg-cream px-4 py-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-purple">
      <input
        type="checkbox"
        checked={activo}
        disabled={ocupado}
        onChange={() => void alternar()}
        className="mt-1 h-5 w-5 accent-purple"
      />
      <span className="text-sm text-gray">
        <span className="font-semibold text-ink">
          Mostrar mi WhatsApp en la ficha pública
        </span>
        <br />
        Los interesados podrán escribirte directo. Puedes desactivarlo cuando
        quieras. Sin esto, tu contacto no aparece.
      </span>
    </label>
  );
}
