"use client";

// El mapa de /buscar (MapLibre GL). Vive en su PROPIO chunk: solo se descarga cuando alguien lo pide
// (el botón «Mapa» en el teléfono; en escritorio, después de pintar la lista). Dibuja los 1 230 barrios
// del catálogo (public/datos/sectores.geojson, Catastro Bogotá CC BY 4.0) coloreados por cuántos
// resultados tiene cada uno, y deja dibujar una zona con toques: esquinas → «Listo» → la URL recibe
// `zona=` y la lista se filtra. Un anuncio es el ÁREA de su barrio, jamás un punto.

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  setWorkerUrl,
  type GeoJSONSource,
  type MapMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  validarZona,
  type MotivoZona,
  type Punto,
} from "@/engine/busqueda/poligono";
import { rellenar, type Proyectado } from "@/i18n/textos";
import type { BUSCAR } from "@/textos/buscar";

export type TextosMapa = Proyectado<typeof BUSCAR.mapa>;

// OpenFreeMap (estilo «liberty»): sin llave, sin registro, uso comercial permitido. El respaldo si
// desapareciera (teselas propias en R2) está en el ADR 014; se cambia con esta variable.
const ESTILO_POR_DEFECTO = "https://tiles.openfreemap.org/styles/liberty";
const DATOS_BARRIOS = "/datos/sectores.geojson";
// El worker lo copia `pnpm build:maplibre` a public/ (el empaquetador no lo deja junto al módulo).
const WORKER = "/maplibre/maplibre-gl-worker.mjs";

// Bogotá urbana: Usaquén al norte, Bosa al suroccidente.
const CENTRO: [number, number] = [-74.09, 4.65];
const ZOOM = 10.6;

const MORADO = "#7b5dd6";
const MORADO_OSCURO = "#6b4bd0";

const vacio = { type: "FeatureCollection", features: [] } as const;

function poligonoGeoJson(puntos: Punto[]) {
  const anillo = puntos.map((p) => [p.lng, p.lat]);
  return {
    type: "FeatureCollection" as const,
    features:
      puntos.length >= 3
        ? [
            {
              type: "Feature" as const,
              properties: {},
              geometry: {
                type: "Polygon" as const,
                coordinates: [[...anillo, anillo[0]]],
              },
            },
          ]
        : puntos.length === 2
          ? [
              {
                type: "Feature" as const,
                properties: {},
                geometry: { type: "LineString" as const, coordinates: anillo },
              },
            ]
          : [],
  };
}

function esquinasGeoJson(puntos: Punto[]) {
  return {
    type: "FeatureCollection" as const,
    features: puntos.map((p) => ({
      type: "Feature" as const,
      properties: {},
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
    })),
  };
}

// Expresión de relleno: cuántos resultados cae en cada barrio → opacidad (1, 2, 3 o más).
function opacidadPorConteo(conteos: Record<string, number>) {
  const por = (min: number, max: number) =>
    Object.entries(conteos)
      .filter(([, n]) => n >= min && n <= max)
      .map(([c]) => c);
  const uno = por(1, 1);
  const dos = por(2, 2);
  const tres = por(3, Infinity);
  const ramas: unknown[] = [];
  if (uno.length) ramas.push(uno, 0.28);
  if (dos.length) ramas.push(dos, 0.45);
  if (tres.length) ramas.push(tres, 0.62);
  return ramas.length
    ? ["match", ["get", "c"], ...ramas, 0]
    : (0 as unknown as never);
}

export default function MapaMaplibre({
  t,
  conteos,
  zona,
  onZona,
  onCaido,
  visible,
}: {
  t: TextosMapa;
  conteos: Record<string, number>;
  zona: Punto[] | null;
  onZona: (zona: Punto[] | null) => void;
  onCaido: () => void;
  visible: boolean;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapLibreMap | null>(null);
  const listo = useRef(false);
  const [cargado, setCargado] = useState(false);
  const [dibujando, setDibujando] = useState(false);
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [aviso, setAviso] = useState<MotivoZona | null>(null);

  // Referencias vivas para los manejadores del mapa (se registran una sola vez). Se actualizan en un
  // efecto, nunca durante el render.
  const dibujandoRef = useRef(dibujando);
  const conteosRef = useRef(conteos);
  const zonaRef = useRef(zona);
  const onCaidoRef = useRef(onCaido);
  useEffect(() => {
    dibujandoRef.current = dibujando;
    conteosRef.current = conteos;
    zonaRef.current = zona;
    onCaidoRef.current = onCaido;
  });

  // Crea el mapa una sola vez.
  useEffect(() => {
    if (!contenedor.current) return;
    let m: MapLibreMap;
    try {
      setWorkerUrl(WORKER);
      m = new MapLibreMap({
        container: contenedor.current,
        style: process.env.NEXT_PUBLIC_MAPA_ESTILO_URL || ESTILO_POR_DEFECTO,
        center: CENTRO,
        zoom: ZOOM,
        attributionControl: { customAttribution: t.atribucionCatastro },
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch {
      // Sin WebGL (o el navegador no lo deja): el mapa «no cargó», la lista sigue.
      onCaidoRef.current();
      return;
    }
    mapa.current = m;

    m.on("error", (e) => {
      // Un fallo del estilo base (sin red, el servicio caído) tumba el mapa; un mosaico suelto no.
      if (!listo.current && e.error) onCaidoRef.current();
    });

    m.on("load", () => {
      listo.current = true;
      m.addSource("barrios", {
        type: "geojson",
        data: DATOS_BARRIOS,
        promoteId: "c",
      });
      m.addLayer({
        id: "barrios-relleno",
        type: "fill",
        source: "barrios",
        paint: {
          "fill-color": MORADO,
          "fill-opacity": opacidadPorConteo(conteosRef.current) as never,
        },
      });
      m.addLayer({
        id: "barrios-linea",
        type: "line",
        source: "barrios",
        paint: {
          "line-color": MORADO_OSCURO,
          "line-opacity": 0.25,
          "line-width": 0.6,
        },
      });
      m.addSource("zona", { type: "geojson", data: vacio });
      m.addSource("esquinas", { type: "geojson", data: vacio });
      m.addLayer({
        id: "zona-relleno",
        type: "fill",
        source: "zona",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": MORADO, "fill-opacity": 0.12 },
      });
      m.addLayer({
        id: "zona-linea",
        type: "line",
        source: "zona",
        paint: { "line-color": MORADO_OSCURO, "line-width": 2.5 },
      });
      m.addLayer({
        id: "esquinas-puntos",
        type: "circle",
        source: "esquinas",
        paint: {
          "circle-radius": 6,
          "circle-color": "#ffffff",
          "circle-stroke-color": MORADO_OSCURO,
          "circle-stroke-width": 3,
        },
      });
      const actual = zonaRef.current;
      if (actual) {
        (m.getSource("zona") as GeoJSONSource).setData(poligonoGeoJson(actual));
        const lngs = actual.map((p) => p.lng);
        const lats = actual.map((p) => p.lat);
        m.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: 60, animate: false },
        );
      }
      setCargado(true);
    });

    m.on("click", (e: MapMouseEvent) => {
      if (!dibujandoRef.current) return;
      setAviso(null);
      setPuntos((prev) => [...prev, { lat: e.lngLat.lat, lng: e.lngLat.lng }]);
    });

    // El contenedor cambia de tamaño sin que cambie la ventana (la pestaña «Mapa» del teléfono, el
    // mapa pegajoso del escritorio): el lienzo lo sigue.
    const observador = new ResizeObserver(() => m.resize());
    observador.observe(contenedor.current);

    return () => {
      observador.disconnect();
      m.remove();
      mapa.current = null;
      listo.current = false;
    };
    // El mapa se crea una vez; los textos se leen al crearlo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El color de cada barrio sigue a los resultados.
  useEffect(() => {
    const m = mapa.current;
    if (!m || !cargado) return;
    m.setPaintProperty(
      "barrios-relleno",
      "fill-opacity",
      opacidadPorConteo(conteos) as never,
    );
  }, [conteos, cargado]);

  // La zona que llegó por la URL (o su ausencia) se dibuja.
  useEffect(() => {
    const m = mapa.current;
    if (!m || !cargado || dibujando) return;
    (m.getSource("zona") as GeoJSONSource).setData(
      zona ? poligonoGeoJson(zona) : vacio,
    );
  }, [zona, cargado, dibujando]);

  // Mientras se dibuja, la vista previa sigue a los toques.
  useEffect(() => {
    const m = mapa.current;
    if (!m || !cargado || !dibujando) return;
    (m.getSource("zona") as GeoJSONSource).setData(poligonoGeoJson(puntos));
    (m.getSource("esquinas") as GeoJSONSource).setData(esquinasGeoJson(puntos));
  }, [puntos, cargado, dibujando]);

  // Si el contenedor estaba oculto (pestaña «Lista» en el teléfono), el lienzo se reajusta al mostrarlo.
  useEffect(() => {
    if (visible) mapa.current?.resize();
  }, [visible]);

  function empezar() {
    setPuntos([]);
    setAviso(null);
    setDibujando(true);
    const m = mapa.current;
    if (m) {
      (m.getSource("zona") as GeoJSONSource).setData(vacio);
      m.getCanvas().style.cursor = "crosshair";
    }
  }

  function terminar(cancelar: boolean) {
    setDibujando(false);
    const m = mapa.current;
    if (m) {
      m.getCanvas().style.cursor = "";
      (m.getSource("esquinas") as GeoJSONSource).setData(vacio);
    }
    if (cancelar) setPuntos([]);
  }

  function listoClick() {
    const veredicto = validarZona(puntos);
    if (!veredicto.ok) {
      setAviso(veredicto.motivo);
      return;
    }
    const zonaNueva = puntos;
    terminar(false);
    onZona(zonaNueva);
  }

  function borrar() {
    terminar(true);
    setAviso(null);
    onZona(null);
  }

  return (
    <div
      className="relative h-full min-h-[22rem] overflow-hidden rounded-2xl border border-purple-200 bg-sky"
      role="region"
      aria-label={t.etiqueta}
      data-mapa-listo={cargado ? "true" : "false"}
    >
      {/* MapLibre le pone `position: relative`: el tamaño sale de la región, no de `absolute inset-0`. */}
      <div ref={contenedor} className="h-full w-full" />

      {!cargado && (
        <p className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-mute">
          {t.cargando}
        </p>
      )}

      <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
        {cargado && !dibujando && (
          <button
            type="button"
            onClick={empezar}
            className="rounded-full bg-purple px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-purple-600"
          >
            ✎ {t.dibujar}
          </button>
        )}
        {cargado && (zona || dibujando) && (
          <button
            type="button"
            onClick={borrar}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-purple-600 shadow-soft hover:bg-purple-tint"
          >
            ✕ {t.borrar}
          </button>
        )}
      </div>

      {dibujando && (
        <div
          role="status"
          className="absolute inset-x-3 top-16 z-10 rounded-2xl bg-white p-3 shadow-card"
        >
          <p className="text-sm font-semibold text-ink">{t.guia}</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-mute">
              {rellenar(t.puntos, { n: puntos.length })}
            </span>
            <button
              type="button"
              onClick={listoClick}
              disabled={puntos.length < 3}
              className="rounded-full bg-purple px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t.listo}
            </button>
          </div>
          {aviso && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-600">
              {t.motivo[aviso]}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
