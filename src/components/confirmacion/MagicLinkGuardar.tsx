"use client";

import { useEffect, useState } from "react";
import { CLAVE_LINK, extraerTokenDeHash } from "@/engine/token/token";
import InvitaReferido from "@/components/referido/InvitaReferido";

// Muestra el magic link recién generado (leído de sessionStorage) para que el fundador lo
// guarde y complete su anuncio. Si no hay link (visita directa, Lighthouse, e2e de regresión),
// no renderiza NADA → la confirmación conserva su naturaleza estática/stateless.
export default function MagicLinkGuardar() {
  const [link, setLink] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    try {
      // sessionStorage solo existe en el cliente → leerlo tras montar es lo correcto.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLink(sessionStorage.getItem(CLAVE_LINK));
    } catch {
      // sin sessionStorage: no mostramos nada
    }
  }, []);

  if (!link) return null;

  // El link es `${origin}/mi-anuncio#t=${token}`: extraemos el token para el bloque de referido.
  const token = extraerTokenDeHash(new URL(link).hash);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link!);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <>
      <section
        className="mt-8 rounded-[2rem] bg-purple-tint p-6"
        aria-labelledby="link-titulo"
      >
        <h2 id="link-titulo" className="text-lg font-extrabold text-ink">
          Este es tu enlace privado — guárdalo
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray">
          Con él vuelves cuando quieras a completar tu anuncio con fotos y
          descripción. Es solo tuyo: no lo compartas.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            readOnly
            value={link}
            aria-label="Tu enlace privado"
            className="min-w-0 flex-1 rounded-full border border-purple-200 bg-white px-4 py-2.5 text-sm text-ink"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            onClick={() => void copiar()}
            className="rounded-full bg-purple px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-transform hover:bg-purple-600 hover:scale-[1.03]"
          >
            {copiado ? "Copiado ✓" : "Copiar enlace"}
          </button>
        </div>
        <a
          href={link}
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-purple-600 underline-offset-4 hover:underline"
        >
          Completar mi anuncio ahora →
        </a>
      </section>
      {token && <InvitaReferido token={token} />}
    </>
  );
}
