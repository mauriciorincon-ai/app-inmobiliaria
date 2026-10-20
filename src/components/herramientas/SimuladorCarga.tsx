"use client";

import dynamic from "next/dynamic";
import type { Idioma } from "@/i18n/idiomas";
import type {
  TasaReferencia,
  TextosSimulador,
} from "@/components/herramientas/Simulador";

// El simulador pesa más que el resto de la página (el cálculo, el formulario, el almacén): se carga diferido y el
// encabezado, que es lo que se pinta primero, nace estático en el servidor. El hueco se reserva para que no salte.
const Simulador = dynamic(() => import("@/components/herramientas/Simulador"), {
  loading: () => <div className="min-h-[36rem]" aria-hidden="true" />,
});

export default function SimuladorCarga(props: {
  lang: Idioma;
  t: TextosSimulador;
  tasa: TasaReferencia;
  precioInicial: number | null;
}) {
  return <Simulador {...props} />;
}
