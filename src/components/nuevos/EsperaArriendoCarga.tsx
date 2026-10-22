"use client";

import dynamic from "next/dynamic";
import type { Idioma } from "@/i18n/idiomas";
import type { TextosArriendo } from "./EsperaArriendo";

// La isla del arriendo se carga diferido: la ficha (precio, ficha honesta, los meses de espera) nace estática en el
// servidor y solo el campo del arriendo espera a su script. El hueco se reserva para que la página no salte.
const EsperaArriendo = dynamic(() => import("./EsperaArriendo"), {
  loading: () => <div className="mt-3 min-h-[9rem]" aria-hidden="true" />,
});

export default function EsperaArriendoCarga(props: {
  meses: number;
  lang: Idioma;
  t: TextosArriendo;
}) {
  return <EsperaArriendo {...props} />;
}
