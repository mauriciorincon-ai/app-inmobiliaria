import { expect } from "@playwright/test";
import { consultar } from "./bd";
import type {
  AlertaCreada,
  ResultadoResumenes,
  ResumenReclamado,
} from "../../../src/lib/supabase/types";

// Alertas SINTÉTICAS para las pruebas (S9): se crean y se reclaman como `postgres`, el rol con el que lo haría
// la llave del servidor. Correos de dominio reservado; los anuncios de cada alerta se aíslan con una BANDA de
// precio estrecha y única (la base local se comparte entre specs).

// Cada alerta de prueba gasta cupo del día (250 en producción) y la base local se comparte entre corridas: las
// pruebas pasan un tope enorme, salvo las que prueban el tope a propósito.
export const TOPE_PRUEBAS = 1_000_000;

let secuenciaCorreo = 0;
export function correoNuevo(): string {
  secuenciaCorreo += 1;
  return `alerta.${Date.now()}.${secuenciaCorreo}.${Math.floor(Math.random() * 1e6)}@ejemplo.test`;
}

export function ipNueva(): string {
  return `s9-ip-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function lit(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return `'${v.replace(/'/g, "''")}'`;
}

// Lo que dice la base cuando una sentencia como `postgres` falla (el cliente psql lo manda a stderr).
export function mensaje(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (e) {
    const err = e as { stderr?: Buffer | string; message?: string };
    return String(err.stderr ?? err.message ?? e);
  }
}

export type CriteriosAlerta = {
  email?: string;
  idioma?: "es" | "en";
  nombre?: string;
  operacion?: "venta" | "arriendo" | null;
  tipo?: string | null;
  localidad?: string | null;
  precioMin?: number | null;
  precioMax?: number | null;
  habitacionesMin?: number | null;
  poligono?: string | null;
  nuevos?: boolean;
  bajas?: boolean;
  consentimiento?: boolean;
  ip?: string;
  tope?: number;
};

export function sqlCrearAlerta(c: CriteriosAlerta): string {
  return `select public.crear_alerta(
    p_email => ${lit(c.email ?? correoNuevo())},
    p_idioma => ${lit(c.idioma ?? "es")},
    p_nombre => ${lit(c.nombre ?? "Mi alerta sintetica")},
    p_operacion => ${c.operacion ? lit(c.operacion) : "null"}::public.operacion,
    p_tipo => ${c.tipo ? lit(c.tipo) : "null"}::public.tipo_inmueble,
    p_localidad => ${lit(c.localidad ?? null)},
    p_precio_min => ${lit(c.precioMin ?? null)}::bigint,
    p_precio_max => ${lit(c.precioMax ?? null)}::bigint,
    p_habitaciones_min => ${lit(c.habitacionesMin ?? null)}::smallint,
    p_poligono => ${lit(c.poligono ?? null)},
    p_avisar_nuevos => ${c.nuevos ?? true},
    p_avisar_bajas => ${c.bajas ?? true},
    p_consentimiento => ${c.consentimiento ?? true},
    p_ip_hash => ${lit(c.ip ?? ipNueva())},
    p_tope => ${c.tope ?? TOPE_PRUEBAS}
  )::text`;
}

export function crearAlerta(c: CriteriosAlerta = {}): AlertaCreada {
  return JSON.parse(consultar(sqlCrearAlerta(c))[0]) as AlertaCreada;
}

export function confirmar(token: string): { estado: string; nombre: string } {
  return JSON.parse(
    consultar(`select public.confirmar_alerta(${lit(token)})::text`)[0],
  );
}

// Una alerta ya confirmada, con la ventana que empieza ahora.
export function alertaConfirmada(c: CriteriosAlerta = {}): AlertaCreada {
  const a = crearAlerta(c);
  expect(confirmar(a.confirmar).estado).toBe("confirmada");
  return a;
}

// El reclamo del resumen, limitado a UNA alerta para no robarse los de otras pruebas.
export function reclamar(
  alertaId: string,
  tope: number = TOPE_PRUEBAS,
): ResultadoResumenes {
  return JSON.parse(
    consultar(
      `select public.reclamar_resumenes(p_tope => ${tope}, p_alerta => '${alertaId}')::text`,
    )[0],
  ) as ResultadoResumenes;
}

export function miResumen(
  r: ResultadoResumenes,
  alertaId: string,
): ResumenReclamado | undefined {
  return r.alertas.find((x) => x.alerta_id === alertaId);
}

// Una banda de precio estrecha: ningún otro anuncio de la corrida cae dentro.
export function banda(precio: number) {
  return { precioMin: precio - 1000, precioMax: precio + 1000 };
}
