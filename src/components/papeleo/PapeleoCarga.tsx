"use client";

import dynamic from "next/dynamic";
import type {
  TextosClausulas,
  TextosPapeleo,
} from "@/components/papeleo/Papeleo";
import type { EntradaGastos } from "@/engine/papeleo/gastos";
import type { Idioma } from "@/i18n/idiomas";

// El asistente pesa más que el resto de la página (el cálculo, las tarifas, las cláusulas): se carga diferido y el encabezado, que es
// lo que se pinta primero, nace estático en el servidor. El hueco se reserva para que la página no salte.
const Papeleo = dynamic(() => import("@/components/papeleo/Papeleo"), {
  loading: () => <div className="min-h-[36rem]" aria-hidden="true" />,
});

export default function PapeleoCarga(props: {
  lang: Idioma;
  t: TextosPapeleo;
  c: TextosClausulas;
  inicial: EntradaGastos;
  hoy: string;
  desdeAnuncio: boolean;
}) {
  return <Papeleo {...props} />;
}
