"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { extraerTokenDeHash } from "@/engine/token/token";
import { rellenar, type Proyectado } from "@/i18n/textos";
import { enviarJson } from "@/lib/api-cliente";
import type { ALERTAS } from "@/textos/alertas";

export type TextosBaja = Proyectado<typeof ALERTAS.baja>;

type Fase =
  | { fase: "cargando" }
  | { fase: "listo"; nombre: string }
  | { fase: "invalido" }
  | { fase: "error" };

// La baja en UN clic, sin sesión (S9, ADR 017). El enlace del correo trae el token de BAJA en el fragmento;
// esta página hace el POST apenas carga. Así un escáner de enlaces que no ejecuta JavaScript no da de baja a
// nadie, y la persona da un solo clic. Repetirla no hace nada nuevo.
export default function Baja({ t }: { t: TextosBaja }) {
  const [estado, setEstado] = useState<Fase>({ fase: "cargando" });

  const darDeBaja = useCallback(async (token: string) => {
    setEstado({ fase: "cargando" });
    const r = await enviarJson<{ nombre: string }>("/api/alertas/baja", {
      token,
    });
    if (r.ok) return setEstado({ fase: "listo", nombre: r.datos.nombre });
    setEstado({
      fase: r.status === 0 || r.status >= 500 ? "error" : "invalido",
    });
  }, []);

  useEffect(() => {
    const token = extraerTokenDeHash(window.location.hash);
    if (!token) {
      // El fragmento solo existe en el navegador: se resuelve tras montar.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEstado({ fase: "invalido" });
      return;
    }
    void darDeBaja(token);
  }, [darDeBaja]);

  if (estado.fase === "cargando") {
    return (
      <p className="text-sm text-mute" role="status">
        {t.cargando}
      </p>
    );
  }
  if (estado.fase === "listo") {
    return (
      <section
        aria-labelledby="baja-titulo"
        className="rounded-3xl bg-white p-6 shadow-card"
      >
        <h1 id="baja-titulo" className="text-2xl font-bold text-ink">
          ✓ {t.listo.titulo}
        </h1>
        <p className="mt-2 text-sm text-gray">
          {rellenar(t.listo.texto, { nombre: estado.nombre })}
        </p>
        <Link
          href="/alertas"
          className="mt-5 inline-flex items-center justify-center rounded-full border border-purple-200 px-5 py-2.5 text-sm font-semibold text-purple-600 hover:bg-purple-tint"
        >
          {t.verAlertas}
        </Link>
      </section>
    );
  }
  if (estado.fase === "invalido") {
    return (
      <div className="rounded-[2rem] bg-cream px-6 py-12 text-center">
        <h1 className="text-lg font-bold text-ink">{t.invalido.titulo}</h1>
        <p className="mt-2 text-sm text-gray">{t.invalido.texto}</p>
        <Link
          href="/alertas"
          className="mt-4 inline-flex items-center justify-center rounded-full bg-purple px-5 py-2 text-sm font-semibold text-white hover:bg-purple-600"
        >
          {t.verAlertas}
        </Link>
      </div>
    );
  }
  return (
    <div
      role="alert"
      className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
    >
      <p>{t.error}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-3 rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        {t.reintentar}
      </button>
    </div>
  );
}
