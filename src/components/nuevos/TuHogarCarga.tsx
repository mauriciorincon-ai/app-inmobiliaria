"use client";

import dynamic from "next/dynamic";

// «Tu hogar» corre el motor completo en el teléfono: se carga diferido para que la página (los hogares de ejemplo, que
// ya vienen calculados) nazca estática y el LCP no espere por él. El hueco se reserva para que no salte.
const TuHogar = dynamic(() => import("@/components/nuevos/TuHogar"), {
  loading: () => <div className="mt-8 min-h-48" aria-hidden="true" />,
});

export default TuHogar;
