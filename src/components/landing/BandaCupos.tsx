"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { rpcPublico } from "@/lib/supabase/rpc-publico";
import { estadoCupos } from "@/engine/cupos/cupos";
import { rellenar, type Proyectado } from "@/i18n/textos";
import type { LANDING } from "@/textos/landing";
import type { CupoZona } from "@/lib/supabase/types";

export type TextosCupos = Proyectado<typeof LANDING.cupos>;

// Banda de cupos de fundador por zona. Carga tras montar (la landing sigue LCP-estática) y SOLO
// aparece si el operador fijó cupo en alguna zona — sin cupos fijados no hay banda (regla dura:
// escasez REAL o no existe; cero contadores fabricados). Los números salen SIEMPRE de la BD.
// Lee vía `rpcPublico` (fetch nativo, sin el cliente supabase) para no cargar ~63 KB gz en la
// landing LCP-crítica — respeta el perf-budget de scripts. Cliente: recibe SOLO los textos de su
// idioma por props.
export default function BandaCupos({ t }: { t: TextosCupos }) {
  const [cupos, setCupos] = useState<CupoZona[] | null>(null);

  useEffect(() => {
    let vivo = true;
    rpcPublico<CupoZona[]>("obtener_cupos").then((data) => {
      if (vivo) setCupos(data ?? []);
    });
    return () => {
      vivo = false;
    };
  }, []);

  if (!cupos || cupos.length === 0) return null;

  const lineas: Array<{ zona: string; texto: string }> = [];
  for (const c of cupos) {
    const estado = estadoCupos(c.cupo_total, c.publicados);
    if (estado === null) continue;
    const plantilla =
      estado.tipo === "completos"
        ? t.completos
        : estado.tipo === "uno"
          ? t.uno
          : t.varios;
    lineas.push({
      zona: c.zona,
      texto: rellenar(plantilla, {
        zona: c.zona,
        n: estado.tipo === "varios" ? estado.restantes : 1,
      }),
    });
  }

  if (lineas.length === 0) return null;

  return (
    <section
      aria-label={t.etiqueta}
      className="border-y border-purple-200 bg-purple-tint"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-6 sm:flex-row sm:justify-between">
        <ul className="flex flex-wrap justify-center gap-2">
          {lineas.map((l) => (
            <li
              key={l.zona}
              className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-purple-600 shadow-soft"
            >
              {l.texto}
            </li>
          ))}
        </ul>
        <Link
          href="/publicar"
          className="shrink-0 rounded-full bg-purple px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-600"
        >
          {t.asegura}
        </Link>
      </div>
    </section>
  );
}
