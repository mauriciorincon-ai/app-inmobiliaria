"use client";

import { useState, useSyncExternalStore } from "react";
import Campo from "@/components/ui/Campo";
import { formatearCOP } from "@/engine/format/cop";
import {
  arriendoEscrito,
  leerArriendo,
  totalEspera,
} from "@/engine/vivienda-nueva/arriendo-local";
import type { Idioma } from "@/i18n/idiomas";
import { rellenar } from "@/i18n/textos";
import {
  guardarArriendo,
  instantaneaArriendo,
  olvidarArriendo,
  suscribirArriendo,
} from "@/lib/arriendo-cliente";

/** Los textos de la isla, ya proyectados a un idioma (el bundle del navegador no lleva el otro). */
export type TextosArriendo = {
  etiqueta: string;
  ayuda: string;
  ejemplo: string;
  total: string;
  invalido: string;
  borrar: string;
  guardado: string;
};

// «La espera» (maqueta 02): mientras construyen, el comprador sigue pagando arriendo. El servidor da los MESES; el teléfono
// los multiplica por el arriendo que la persona escribe aquí. Ese número se guarda solo en este teléfono (`inn:arriendo:v1`)
// y ninguna petición lo lleva, ni el total. Validación a mano: sin zod (+48 KB de script en una página que no lo necesita).
export default function EsperaArriendo({
  meses,
  lang,
  t,
}: {
  meses: number;
  lang: Idioma;
  t: TextosArriendo;
}) {
  const guardado = leerArriendo(
    useSyncExternalStore(suscribirArriendo, instantaneaArriendo, () => ""),
  );
  const [escrito, setEscrito] = useState<string | null>(null);
  const valor =
    escrito ?? (guardado === null ? "" : formatearCOP(guardado, lang));
  const arriendo = escrito === null ? guardado : arriendoEscrito(escrito);
  const malo = escrito !== null && escrito.trim() !== "" && arriendo === null;

  function cambiar(texto: string) {
    setEscrito(texto);
    if (texto.trim() === "") {
      olvidarArriendo();
      return;
    }
    const n = arriendoEscrito(texto);
    if (n !== null) guardarArriendo(n);
  }

  return (
    <div className="mt-3">
      <Campo
        id="arriendo"
        label={t.etiqueta}
        hint={t.ayuda}
        placeholder={t.ejemplo}
        type="text"
        inputMode="numeric"
        value={valor}
        onChange={cambiar}
        error={malo ? t.invalido : undefined}
      />
      <div aria-live="polite" className="mt-3 min-h-[3rem]">
        {arriendo !== null && !malo && (
          <>
            <p className="text-2xl font-extrabold text-ink">
              {rellenar(t.total, {
                total: formatearCOP(totalEspera(meses, arriendo), lang),
              })}
            </p>
            <p className="text-sm text-mute">{t.guardado}</p>
          </>
        )}
      </div>
      {guardado !== null && (
        <button
          type="button"
          onClick={() => {
            olvidarArriendo();
            setEscrito("");
          }}
          className="mt-1 rounded-full px-3 py-1.5 text-sm font-semibold text-purple-600 hover:bg-purple-tint"
        >
          {t.borrar}
        </button>
      )}
    </div>
  );
}
