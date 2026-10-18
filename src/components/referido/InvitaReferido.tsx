"use client";

import { useEffect, useState } from "react";
import {
  construirLinkReferido,
  mensajeInvitacion,
} from "@/engine/referidos/referidos";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar, type Proyectado } from "@/i18n/textos";
import { crearClienteNavegador } from "@/lib/supabase/client";
import type { REFERIDO } from "@/textos/referido";

export type TextosReferido = Proyectado<typeof REFERIDO>;

// "Invita a otro dueño" (C7). Con el magic link del fundador obtiene (o crea) su código de referido
// y muestra el botón para compartir por WhatsApp + el conteo real de invitados. Copy honesto:
// atribución + crecimiento, SIN escasez fabricada (no promete reservar cupos). El conteo sale de BD.
// La invitación sale en el idioma de quien invita (`lang`).
export default function InvitaReferido({
  token,
  lang,
  t,
}: {
  token: string;
  lang: Idioma;
  t: TextosReferido;
}) {
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
  const compartir = `https://wa.me/?text=${encodeURIComponent(mensajeInvitacion(link, lang))}`;

  return (
    <section
      aria-labelledby="invita-titulo"
      className="mt-8 rounded-[2rem] bg-cream p-6"
    >
      <h2 id="invita-titulo" className="text-lg font-extrabold text-ink">
        {t.titulo}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray">{t.texto}</p>
      <a
        href={compartir}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-purple px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-transform hover:scale-[1.03] hover:bg-purple-600"
      >
        {t.boton}
      </a>
      {referidos > 0 && (
        <p className="mt-3 text-sm font-semibold text-purple-600">
          {rellenar(referidos === 1 ? t.conteoUno : t.conteoVarios, {
            n: referidos,
          })}
        </p>
      )}
    </section>
  );
}
