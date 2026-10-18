// El estado de la búsqueda del comprador ↔ la URL. La URL es la fuente de verdad (se comparte, se
// guarda, funciona sin JS): `?op=venta&tipo=apartamento&loc=Chapinero&min=&max=&hab=2&zona=lat,lng;…`.
// Todo lo que llega de la URL es no confiable: se lee SIN lanzar — un valor inválido se descarta y la
// búsqueda sigue sin ese filtro. De aquí salen también los argumentos de la RPC `buscar_inmuebles`.

import { z } from "zod";
import { OPERACIONES, TIPOS } from "@/engine/registro/schema";
import type { Operacion, TipoInmueble } from "@/engine/registro/schema";
import { LOCALIDADES } from "@/engine/zonas/localidades";
import type { Localidad } from "@/engine/zonas/localidades";
import {
  aTextoPostgres,
  parsearZona,
  serializarZona,
  type Punto,
} from "./poligono";

export const PRECIO_MAX = 900_000_000_000;
export const HABITACIONES_MAX = 10;
export const LIMITE_RESULTADOS = 60;

export type Filtros = {
  operacion?: Operacion;
  tipo?: TipoInmueble;
  localidad?: Localidad;
  precioMin?: number;
  precioMax?: number;
  habitacionesMin?: number;
  zona?: Punto[];
};

const opSchema = z.enum(OPERACIONES);
const tipoSchema = z.enum(TIPOS);
const locSchema = z.enum(LOCALIDADES);
const precioSchema = z
  .string()
  .regex(/^\d{1,12}$/)
  .transform(Number)
  .pipe(z.number().int().min(0).max(PRECIO_MAX));
const habSchema = z
  .string()
  .regex(/^\d{1,2}$/)
  .transform(Number)
  .pipe(z.number().int().min(0).max(HABITACIONES_MAX));

export type EntradaUrl =
  URLSearchParams | Record<string, string | string[] | undefined>;

function valor(entrada: EntradaUrl, clave: string): string | undefined {
  if (entrada instanceof URLSearchParams)
    return entrada.get(clave) ?? undefined;
  const v = entrada[clave];
  return Array.isArray(v) ? v[0] : v;
}

export function leerFiltros(entrada: EntradaUrl): Filtros {
  const f: Filtros = {};
  const op = opSchema.safeParse(valor(entrada, "op"));
  if (op.success) f.operacion = op.data;
  const tipo = tipoSchema.safeParse(valor(entrada, "tipo"));
  if (tipo.success) f.tipo = tipo.data;
  const loc = locSchema.safeParse(valor(entrada, "loc"));
  if (loc.success) f.localidad = loc.data;
  const min = precioSchema.safeParse(valor(entrada, "min"));
  if (min.success) f.precioMin = min.data;
  const max = precioSchema.safeParse(valor(entrada, "max"));
  if (max.success) f.precioMax = max.data;
  // Un rango al revés se endereza en vez de devolver cero resultados.
  if (
    f.precioMin !== undefined &&
    f.precioMax !== undefined &&
    f.precioMin > f.precioMax
  ) {
    [f.precioMin, f.precioMax] = [f.precioMax, f.precioMin];
  }
  const hab = habSchema.safeParse(valor(entrada, "hab"));
  if (hab.success) f.habitacionesMin = hab.data;
  const z = valor(entrada, "zona");
  const zona = z === undefined ? null : parsearZona(z);
  if (zona) f.zona = zona;
  return f;
}

// Filtros → parámetros de la URL, en orden fijo (la misma búsqueda produce la misma URL).
export function aParams(f: Filtros): URLSearchParams {
  const p = new URLSearchParams();
  if (f.operacion) p.set("op", f.operacion);
  if (f.tipo) p.set("tipo", f.tipo);
  if (f.localidad) p.set("loc", f.localidad);
  if (f.precioMin !== undefined) p.set("min", String(f.precioMin));
  if (f.precioMax !== undefined) p.set("max", String(f.precioMax));
  if (f.habitacionesMin !== undefined) p.set("hab", String(f.habitacionesMin));
  if (f.zona) p.set("zona", serializarZona(f.zona));
  return p;
}

// ¿Hay algún filtro puesto? (para distinguir «primera vez» de «sin resultados».)
export function hayFiltros(f: Filtros): boolean {
  return aParams(f).size > 0;
}

export type ArgsBuscar = {
  p_operacion: Operacion | null;
  p_tipo: TipoInmueble | null;
  p_localidad: Localidad | null;
  p_precio_min: number | null;
  p_precio_max: number | null;
  p_habitaciones_min: number | null;
  p_poligono: string | null;
  p_limite: number;
};

// Filtros → argumentos de `buscar_inmuebles` (todos presentes: PostgREST resuelve por nombre).
export function aArgsBuscar(f: Filtros): ArgsBuscar {
  return {
    p_operacion: f.operacion ?? null,
    p_tipo: f.tipo ?? null,
    p_localidad: f.localidad ?? null,
    p_precio_min: f.precioMin ?? null,
    p_precio_max: f.precioMax ?? null,
    p_habitaciones_min: f.habitacionesMin ?? null,
    p_poligono: f.zona ? aTextoPostgres(f.zona) : null,
    p_limite: LIMITE_RESULTADOS,
  };
}
