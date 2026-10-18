"use client";

import { useEffect, useState } from "react";
import { extraerTokenDeHash } from "@/engine/token/token";
import { crearClienteNavegador } from "@/lib/supabase/client";
import RenovarVigencia, {
  type TextosTarjeta,
} from "@/components/vigencia/RenovarVigencia";
import type { Idioma } from "@/i18n/idiomas";
import type { Proyectado } from "@/i18n/textos";
import type { MiAnuncioData } from "@/lib/supabase/types";
import type { VIGENCIA } from "@/textos/mi-anuncio";

export type TextosRenovar = Proyectado<typeof VIGENCIA.pagina>;

// Prefijo del enlace privado que se muestra de ejemplo; es parte de la URL, no se traduce.
const PREFIJO_ENLACE = "mi-anuncio#t=";

type Estado = "cargando" | "sin-token" | "listo" | "error";

// Resuelve el token del fragment (#t=…) y carga la vigencia actual para mostrar el botón de renovar.
// Cliente: recibe SOLO los textos de su idioma por props.
export default function RenovarPagina({
  lang,
  t,
  tarjeta,
}: {
  lang: Idioma;
  t: TextosRenovar;
  tarjeta: TextosTarjeta;
}) {
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
        {t.cargando}
      </p>
    );
  }

  if (estado === "sin-token") {
    return (
      <div className="mt-8 rounded-[2rem] bg-cream px-6 py-12 text-center">
        <p className="text-lg font-bold text-ink">{t.sinEnlace.titulo}</p>
        <p className="mt-2 text-sm text-gray">
          {t.sinEnlace.antes}
          <span className="font-medium">{PREFIJO_ENLACE}</span>
          {t.sinEnlace.despues}
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
        {t.error}
      </div>
    );
  }

  return (
    <RenovarVigencia
      lang={lang}
      t={tarjeta}
      token={token}
      vigenteHastaInicial={vigenteHasta}
    />
  );
}
