// Los criterios de una alerta (S9, ADR 017) son los de una búsqueda de `/buscar` (S6): se leen de la URL con
// el mismo `leerFiltros` (nunca lanza; lo inválido se descarta), se guardan en columnas tipadas y vuelven a
// ser una URL de `/buscar` para el botón «Ver en el mapa». Aquí también el resumen en palabras y el nombre por
// omisión. Puro.
import {
  aParams,
  hayFiltros,
  leerFiltros,
  type Filtros,
} from "@/engine/busqueda/filtros";
import {
  aTextoPostgres,
  validarZona,
  ZONA_MAX_VERTICES,
  type Punto,
} from "@/engine/busqueda/poligono";
import { formatearCOP } from "@/engine/format/cop";
import {
  OPERACIONES,
  TIPOS,
  type Operacion,
  type TipoInmueble,
} from "@/engine/registro/schema";
import { LOCALIDADES, type Localidad } from "@/engine/zonas/localidades";
import type { Idioma } from "@/i18n/idiomas";
import { enIdioma, rellenar } from "@/i18n/textos";
import { ALERTAS } from "@/textos/alertas";
import { COMUN } from "@/textos/comun";

export const NOMBRE_MAX = 80;

/** Una alerta tal como la guarda la base (columnas tipadas). */
export type CriteriosAlerta = {
  operacion: Operacion | null;
  tipo: TipoInmueble | null;
  localidad: string | null;
  precio_min: number | null;
  precio_max: number | null;
  habitaciones_min: number | null;
  poligono: string | null;
};

export type ArgsCriterios = {
  p_operacion: Operacion | null;
  p_tipo: TipoInmueble | null;
  p_localidad: Localidad | null;
  p_precio_min: number | null;
  p_precio_max: number | null;
  p_habitaciones_min: number | null;
  p_poligono: string | null;
};

/** La consulta de `/buscar` («op=venta&max=…») → filtros. Sin filtros válidos ⇒ null (no hay alerta). */
export function filtrosDeConsulta(consulta: string): Filtros | null {
  const f = leerFiltros(new URLSearchParams(consulta.replace(/^\?/, "")));
  return hayFiltros(f) ? f : null;
}

export function aArgsCriterios(f: Filtros): ArgsCriterios {
  return {
    p_operacion: f.operacion ?? null,
    p_tipo: f.tipo ?? null,
    p_localidad: f.localidad ?? null,
    p_precio_min: f.precioMin ?? null,
    p_precio_max: f.precioMax ?? null,
    p_habitaciones_min: f.habitacionesMin ?? null,
    p_poligono: f.zona ? aTextoPostgres(f.zona) : null,
  };
}

/** El `polygon` de Postgres («((lng,lat),…)») → puntos. Lo raro ⇒ null. */
export function desdeTextoPostgres(texto: string | null): Punto[] | null {
  if (!texto || texto.length > 4000) return null;
  const pares = [...texto.matchAll(/\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\)/g)];
  if (pares.length === 0 || pares.length > ZONA_MAX_VERTICES) return null;
  const puntos = pares.map((m) => ({ lat: Number(m[2]), lng: Number(m[1]) }));
  return validarZona(puntos).ok ? puntos : null;
}

/** Lo guardado → los filtros de `/buscar` (para el enlace y el resumen). Lo que no se reconoce se omite. */
export function filtrosDeAlerta(c: CriteriosAlerta): Filtros {
  const f: Filtros = {};
  if (c.operacion && OPERACIONES.includes(c.operacion)) {
    f.operacion = c.operacion;
  }
  if (c.tipo && TIPOS.includes(c.tipo)) f.tipo = c.tipo;
  const loc = LOCALIDADES.find(
    (l) => l.toLowerCase() === (c.localidad ?? "").toLowerCase(),
  );
  if (loc) f.localidad = loc;
  if (c.precio_min !== null && c.precio_min !== undefined) {
    f.precioMin = c.precio_min;
  }
  if (c.precio_max !== null && c.precio_max !== undefined) {
    f.precioMax = c.precio_max;
  }
  if (c.habitaciones_min !== null && c.habitaciones_min !== undefined) {
    f.habitacionesMin = c.habitaciones_min;
  }
  const zona = desdeTextoPostgres(c.poligono);
  if (zona) f.zona = zona;
  return f;
}

/** «/buscar?op=venta&…» relativo a `base` (la URL de la app, sin barra final). */
export function enlaceBusqueda(base: string, f: Filtros): string {
  const q = aParams(f).toString();
  return `${base}/buscar${q ? `?${q}` : ""}`;
}

/** «Venta · Apartamento · en Chapinero · hasta $1.400.000.000 · 2+ habitaciones · zona dibujada». */
export function resumenCriterios(f: Filtros, idioma: Idioma): string {
  const t = enIdioma(ALERTAS, idioma).criterios;
  const d = enIdioma(COMUN, idioma).dominio;
  const partes: string[] = [];
  if (f.operacion) partes.push(d.operacion[f.operacion]);
  if (f.tipo) partes.push(d.tipo[f.tipo]);
  if (f.localidad) partes.push(rellenar(t.localidad, { nombre: f.localidad }));
  if (f.precioMin !== undefined) {
    partes.push(
      rellenar(t.desde, { precio: formatearCOP(f.precioMin, idioma) }),
    );
  }
  if (f.precioMax !== undefined) {
    partes.push(
      rellenar(t.hasta, { precio: formatearCOP(f.precioMax, idioma) }),
    );
  }
  if (f.habitacionesMin !== undefined) {
    partes.push(rellenar(t.habitaciones, { n: f.habitacionesMin }));
  }
  if (f.zona) partes.push(t.zona);
  return partes.join(" · ");
}

/** El nombre que propone el formulario: «Apartamentos en Chapinero», «Casas en mi zona», «Mi búsqueda». */
export function nombrePorDefecto(f: Filtros, idioma: Idioma): string {
  const t = enIdioma(ALERTAS, idioma).criterios;
  const lugar = f.localidad ?? (f.zona ? t.lugarZona : null);
  const nombre =
    f.tipo && lugar
      ? rellenar(t.nombreTipoEn, { tipo: t.tiposPlural[f.tipo], lugar })
      : f.tipo
        ? t.tiposPlural[f.tipo]
        : lugar
          ? rellenar(t.nombreTipoEn, {
              tipo: t.tiposPlural.otro,
              lugar,
            })
          : t.nombreBusqueda;
  return nombre.slice(0, NOMBRE_MAX);
}
