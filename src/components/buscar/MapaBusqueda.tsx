"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { aParams, type Filtros } from "@/engine/busqueda/filtros";
import { serializarZona, type Punto } from "@/engine/busqueda/poligono";
import type { TextosMapa } from "@/components/buscar/MapaMaplibre";
import { useVista } from "@/components/buscar/VistaContexto";

// MapLibre pesa ~270 KB comprimido: va en su propio chunk, sin SSR, y solo se pide cuando el mapa se
// ve (escritorio, tras pintar la lista) o cuando alguien lo abre (teléfono). Lighthouse mide /buscar
// sin él.
const MapaMaplibre = dynamic(() => import("@/components/buscar/MapaMaplibre"), {
  ssr: false,
});

const ESCRITORIO = "(min-width: 1024px)";

// Envoltorio del mapa: decide CUÁNDO cargarlo, cuenta cuál es la zona vigente y navega al dibujarla.
export default function MapaBusqueda({
  t,
  filtros,
  conteos,
}: {
  t: TextosMapa;
  filtros: Filtros;
  conteos: Record<string, number>;
}) {
  const router = useRouter();
  const { vista, setVista } = useVista();
  const abierto = vista === "mapa";
  // Al navegar con la zona nueva, en el teléfono la vista vuelve a la lista, donde están los resultados.
  const alBuscar = useCallback(() => setVista("lista"), [setVista]);
  const [escritorio, setEscritorio] = useState(false);
  const [cargarMapa, setCargarMapa] = useState(false);
  const [caido, setCaido] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia(ESCRITORIO);
    const aplicar = () => setEscritorio(mq.matches);
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, []);

  // Una vez pedido, el mapa no se descarga de nuevo aunque se vuelva a la pestaña «Lista».
  if ((escritorio || abierto) && !cargarMapa) setCargarMapa(true);

  const alZona = useCallback(
    (zona: Punto[] | null) => {
      alBuscar();
      const params = aParams({ ...filtros, zona: zona ?? undefined });
      if (zona) params.set("zona", serializarZona(zona));
      const q = params.toString();
      router.push(q ? `/buscar?${q}` : "/buscar");
    },
    [filtros, router, alBuscar],
  );

  if (!cargarMapa)
    return <div className="h-full min-h-[22rem]" aria-hidden="true" />;

  if (caido) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700"
      >
        <p className="font-semibold">✕ {t.caido.titulo}</p>
        <p className="mt-1 text-sm">{t.caido.detalle}</p>
        <button
          type="button"
          onClick={() => {
            setCaido(false);
            setIntento((n) => n + 1);
          }}
          className="mt-3 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          {t.caido.reintentar}
        </button>
      </div>
    );
  }

  return (
    <MapaMaplibre
      key={intento}
      t={t}
      conteos={conteos}
      zona={filtros.zona ?? null}
      onZona={alZona}
      onCaido={() => setCaido(true)}
      visible={abierto || escritorio}
    />
  );
}
