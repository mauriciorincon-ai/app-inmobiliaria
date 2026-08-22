"use client";

import { useEffect, useState } from "react";
import { extraerTokenDeHash } from "@/engine/token/token";
import { crearClienteNavegador } from "@/lib/supabase/client";
import RenovarVigencia from "@/components/vigencia/RenovarVigencia";
import type { MiAnuncioData } from "@/lib/supabase/types";

type Estado = "cargando" | "sin-token" | "listo" | "error";

// Resuelve el token del fragment (#t=…) y carga la vigencia actual para mostrar el botón de renovar.
export default function RenovarPagina() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [token, setToken] = useState<string | null>(null);
  const [vigenteHasta, setVigenteHasta] = useState<string | null>(null);

  useEffect(() => {
    const t = extraerTokenDeHash(
      typeof window !== "undefined" ? window.location.hash : "",
    );
    if (!t) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEstado("sin-token");
      return;
    }
    setToken(t);
    const supabase = crearClienteNavegador();
    supabase
      .rpc("obtener_mi_anuncio", { p_token: t })
      .then(({ data, error }) => {
        if (error) {
          setEstado("error");
          return;
        }
        if (!data) {
          setEstado("sin-token");
          return;
        }
        setVigenteHasta((data as MiAnuncioData).vigente_hasta);
        setEstado("listo");
      });
  }, []);

  if (estado === "cargando") {
    return (
      <p role="status" className="mt-8 text-sm text-mute">
        Cargando tu anuncio…
      </p>
    );
  }

  if (estado === "sin-token") {
    return (
      <div className="mt-8 rounded-[2rem] bg-cream px-6 py-12 text-center">
        <p className="text-lg font-bold text-ink">Necesitas tu enlace</p>
        <p className="mt-2 text-sm text-gray">
          Abre esta página desde el enlace privado que te dimos al publicar
          (empieza por <span className="font-medium">mi-anuncio#t=</span> o
          llega desde el correo de renovación).
        </p>
      </div>
    );
  }

  if (estado === "error" || !token || !vigenteHasta) {
    return (
      <div
        role="alert"
        className="mt-8 rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
      >
        No pudimos cargar tu anuncio. Recarga la página o inténtalo en un
        momento.
      </div>
    );
  }

  return <RenovarVigencia token={token} vigenteHastaInicial={vigenteHasta} />;
}
