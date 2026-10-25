"use client";

import Aviso from "@/components/papeleo/Aviso";
import Sello from "@/components/papeleo/Sello";
import { DOCUMENTOS_CLAUSULAS, clausulasDe } from "@/engine/papeleo/guia";
import type { TextosClausulas } from "@/components/papeleo/Papeleo";
import { localeIntl, type Idioma } from "@/i18n/idiomas";
import { rellenar } from "@/i18n/textos";

// «Qué dice cada documento»: texto fijo, sin IA y sin leer el documento de nadie. Cada cláusula con su artículo; el aviso de que
// explica la norma y no es asesoría legal va en CADA documento, no una sola vez al final.
export default function PapeleoClausulas({
  c,
  credito,
  lang,
  leidas,
  estadoNorma,
}: {
  c: TextosClausulas;
  credito: boolean;
  lang: Idioma;
  /** La fecha (YYYY-MM-DD) en que se leyeron las normas citadas. */
  leidas: string;
  estadoNorma: string;
}) {
  const fecha = new Intl.DateTimeFormat(localeIntl(lang), {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${leidas}T00:00:00Z`));
  return (
    <div className="space-y-5">
      <p className="text-sm text-gray">{c.bajada}</p>
      {DOCUMENTOS_CLAUSULAS.map((doc) => (
        <section
          key={doc}
          aria-labelledby={`papeleo-doc-${doc}`}
          className="space-y-3 rounded-2xl bg-cream p-5"
        >
          <h3 id={`papeleo-doc-${doc}`} className="text-lg font-bold text-ink">
            {c.documentos[doc].titulo}
          </h3>
          <p className="text-sm text-gray">{c.documentos[doc].bajada}</p>
          <Aviso clase="bg-sky text-ink" simbolo="i">
            {c.aviso}
          </Aviso>
          <ul className="space-y-3">
            {clausulasDe(doc, credito).map((cl) => {
              const x = c.clausulas[cl.id];
              return (
                <li
                  key={cl.id}
                  className="rounded-2xl border border-purple-200 bg-white p-4"
                >
                  <h4 className="font-semibold text-ink">{x.titulo}</h4>
                  <dl className="mt-2 space-y-2 text-sm">
                    <div>
                      <dt className="font-semibold text-gray">
                        {c.rotulos.queDice}
                      </dt>
                      <dd className="text-ink">{x.queDice}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray">
                        {c.rotulos.queMirar}
                      </dt>
                      <dd className="text-ink">{x.queMirar}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray">
                        {c.rotulos.norma}
                      </dt>
                      <dd className="flex flex-wrap items-center gap-2 text-mute">
                        <Sello estado={cl.estado} etiqueta={estadoNorma} />
                        <span>{x.norma}</span>
                      </dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="text-xs text-mute">{rellenar(c.leidas, { fecha })}</p>
    </div>
  );
}
