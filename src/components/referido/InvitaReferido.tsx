"use client";

import { useEffect, useState } from "react";
import {
  construirLinkReferido,
  mensajeInvitacion,
} from "@/engine/referidos/referidos";
import { crearClienteNavegador } from "@/lib/supabase/client";

// "Invita a otro dueño" (C7). Con el magic link del fundador obtiene (o crea) su código de referido
// y muestra el botón para compartir por WhatsApp + el conteo real de invitados. Copy honesto:
// atribución + crecimiento, SIN escasez fabricada (no promete reservar cupos). El conteo sale de BD.
export default function InvitaReferido({ token }: { token: string }) {
  const [codigo, setCodigo] = useState<string | null>(null);
  const [referidos, setReferidos] = useState(0);

  useEffect(() => {
    let vivo = true;
    const supabase = crearClienteNavegador();
    supabase
      .rpc("obtener_codigo_referido", { p_token: token })
      .then(({ data }) => {
        if (vivo && typeof data === "string") setCodigo(data);
      });
    supabase
      .rpc("obtener_mis_referidos", { p_token: token })
      .then(({ data }) => {
        if (vivo && typeof data === "number") setReferidos(data);
      });
    return () => {
      vivo = false;
    };
  }, [token]);

  if (!codigo) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = construirLinkReferido(origin, codigo);
  // Compartir por WhatsApp sin destinatario fijo: `wa.me/?text=` abre el selector de contactos.
  const compartir = `https://wa.me/?text=${encodeURIComponent(mensajeInvitacion(link))}`;

  return (
    <section
      aria-labelledby="invita-titulo"
      className="mt-8 rounded-[2rem] bg-cream p-6"
    >
      <h2 id="invita-titulo" className="text-lg font-extrabold text-ink">
        Invita a otro dueño
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray">
        Comparte tu enlace con otros dueños de Bogotá. Cada uno que publique con
        él se suma a tu red de fundadores.
      </p>
      <a
        href={compartir}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-purple px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-transform hover:scale-[1.03] hover:bg-purple-600"
      >
        Invitar por WhatsApp
      </a>
      {referidos > 0 && (
        <p className="mt-3 text-sm font-semibold text-purple-600">
          Ya {referidos === 1 ? "se registró" : "se registraron"} {referidos}{" "}
          {referidos === 1 ? "dueño" : "dueños"} con tu enlace.
        </p>
      )}
    </section>
  );
}
