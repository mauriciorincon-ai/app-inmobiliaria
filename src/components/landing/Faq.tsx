"use client";

import { useState } from "react";
import type { Proyectado } from "@/i18n/textos";
import type { LANDING } from "@/textos/landing";

export type TextosFaq = Proyectado<typeof LANDING.faq>;

// Acordeón accesible (corrige el gap de la base: aria-expanded/aria-controls + región asociada).
// Animación por CSS (grid-rows), sin GSAP. El primer ítem abre por defecto. Cliente: recibe SOLO
// los textos de su idioma por props.
export default function Faq({ t }: { t: TextosFaq }) {
  const [abierta, setAbierta] = useState<number | null>(0);

  return (
    <section className="section-soft">
      <div className="mx-auto max-w-3xl px-6 py-24 lg:px-10 lg:py-28">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {t.titulo.antes}
          <span className="underline-doodle">{t.titulo.resaltado}</span>
        </h2>

        <div className="mt-10 divide-y divide-purple-200">
          {t.preguntas.map((p, i) => {
            const open = abierta === i;
            const panelId = `faq-panel-${i}`;
            const botonId = `faq-boton-${i}`;
            return (
              <div key={p.q} className="py-2">
                <h3>
                  <button
                    id={botonId}
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setAbierta(open ? null : i)}
                    className="flex w-full items-center justify-between gap-4 py-4 text-left text-base font-bold text-ink"
                  >
                    {p.q}
                    <span
                      aria-hidden="true"
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-purple-tint text-purple-600 transition-transform ${
                        open ? "rotate-45" : ""
                      }`}
                    >
                      +
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={botonId}
                  hidden={!open}
                  className="grid transition-all"
                >
                  <p className="pb-5 text-sm leading-relaxed text-gray">
                    {p.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
