"use client";

import { useState, type ReactNode } from "react";
import { VistaContexto, type Vista } from "@/components/buscar/VistaContexto";
import type { Proyectado } from "@/i18n/textos";
import type { BUSCAR } from "@/textos/buscar";

export type TextosVista = Proyectado<typeof BUSCAR.vista>;

// La disposición de /buscar: en escritorio, mapa y lista lado a lado; en el teléfono, la LISTA primero y
// un interruptor Lista/Mapa. El armazón de la página sale de inmediato; la lista (`children`) y el mapa
// (`mapa`) llegan del servidor cuando la búsqueda responde. El mapa decide solo cuándo descargarse.
export default function BuscarLayout({
  t,
  mapa,
  children,
}: {
  t: TextosVista;
  mapa: ReactNode;
  children: ReactNode;
}) {
  const [vista, setVista] = useState<Vista>("lista");
  const boton = (v: Vista, texto: string) => (
    <button
      type="button"
      onClick={() => setVista(v)}
      aria-pressed={vista === v}
      className={`rounded-full px-5 py-1.5 text-sm font-semibold transition-colors ${
        vista === v
          ? "bg-purple text-white"
          : "text-purple-600 hover:bg-purple-200"
      }`}
    >
      {texto}
    </button>
  );

  return (
    <VistaContexto.Provider value={{ vista, setVista }}>
      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div
          role="group"
          aria-label={t.etiqueta}
          className="mb-4 inline-flex rounded-full bg-purple-tint p-1 lg:hidden"
        >
          {boton("lista", t.lista)}
          {boton("mapa", t.mapa)}
        </div>

        <div
          className={`h-[70vh] lg:sticky lg:top-4 lg:order-1 lg:block lg:h-[calc(100vh-2rem)] ${
            vista === "mapa" ? "block" : "hidden"
          }`}
        >
          {mapa}
        </div>

        <div
          className={`lg:order-2 lg:block ${vista === "lista" ? "block" : "hidden"}`}
        >
          {children}
        </div>
      </div>
    </VistaContexto.Provider>
  );
}
