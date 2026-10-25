"use client";

import { useState } from "react";
import Casilla from "@/components/papeleo/Casilla";
import Sello from "@/components/papeleo/Sello";
import type { TextosPapeleo } from "@/components/papeleo/Papeleo";
import { DOCUMENTOS, PLAZOS, pasosDe } from "@/engine/papeleo/guia";

// Qué pedir antes de firmar y cuánto tarda cada paso. La estructura (qué aplica con crédito, si cada paso es norma leída o práctica)
// viene de `guia.ts`; el texto, de `textos/papeleo.ts`. Las casillas son de esta pantalla: no se guardan en ninguna parte.
export function Documentos({
  credito,
  t,
}: {
  credito: boolean;
  t: TextosPapeleo;
}) {
  const [marcados, setMarcados] = useState<ReadonlySet<string>>(new Set());
  function marcar(id: string, marcada: boolean) {
    setMarcados((prev) => {
      const sig = new Set(prev);
      if (marcada) sig.add(id);
      else sig.delete(id);
      return sig;
    });
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray">{t.guia.documentos.bajada}</p>
      <ul className="space-y-3">
        {pasosDe(DOCUMENTOS, credito).map((d) => {
          const x = t.documentos[d.id];
          return (
            <li
              key={d.id}
              className="rounded-2xl border border-purple-200 bg-white p-4"
            >
              <Casilla
                id={`papeleo-doc-${d.id}`}
                etiqueta={x.titulo}
                ayuda={x.detalle}
                marcada={marcados.has(d.id)}
                onChange={(m) => marcar(d.id, m)}
              />
              <p className="ml-8 mt-2 flex flex-wrap items-center gap-2 text-xs text-mute">
                <Sello estado={d.estado} etiqueta={t.estados[d.estado]} />
                <span>
                  {t.guia.norma}: {x.norma}
                </span>
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Plazos({ credito, t }: { credito: boolean; t: TextosPapeleo }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray">{t.guia.plazos.bajada}</p>
      <ol className="space-y-3">
        {pasosDe(PLAZOS, credito).map((p, i) => {
          const x = t.plazos[p.id];
          return (
            <li
              key={p.id}
              className="flex gap-3 rounded-2xl border border-purple-200 bg-white p-4"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-tint font-bold text-purple-600"
              >
                {i + 1}
              </span>
              <div className="space-y-1">
                <h3 className="font-semibold text-ink">{x.titulo}</h3>
                <p className="text-sm text-gray">{x.texto}</p>
                <p className="flex flex-wrap items-center gap-2 text-xs text-mute">
                  <Sello estado={p.estado} etiqueta={t.estados[p.estado]} />
                  <span>
                    {t.guia.norma}: {x.norma}
                  </span>
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
