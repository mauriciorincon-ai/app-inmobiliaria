import { createClient } from "@supabase/supabase-js";
import { expect } from "@playwright/test";
import { consultar, ejecutar } from "./bd";
import { fechaBogota } from "./fechas";

// Crea anuncios SINTÉTICOS por la RPC pública (como lo hace el wizard) para las pruebas de la búsqueda.
// Cada prueba aísla sus anuncios con un PRECIO ÚNICO (`min=max=precio`): la BD local se comparte entre
// specs y ningún conteo global es fiable.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type AnuncioCreado = { id: string; slug: string; precio: number };

let secuencia = 0;

// Un precio entre 100 M y 899 M que ningún otro anuncio de la corrida usa.
export function precioUnico(): number {
  secuencia += 1;
  return (
    100_000_000 +
    ((Date.now() * 7 +
      secuencia * 1_000_003 +
      Math.floor(Math.random() * 1_000_000)) %
      799_000_000)
  );
}

export async function crearAnuncio(
  opts: {
    barrio?: string;
    localidad?: string;
    precio?: number;
    direccion?: string | null;
    nombre?: string;
    tipo?: "apartamento" | "casa" | "apartaestudio" | "otro";
    operacion?: "venta" | "arriendo";
    habitaciones?: number;
  } = {},
): Promise<AnuncioCreado> {
  const precio = opts.precio ?? precioUnico();
  const { data, error } = await createClient(url, anon).rpc(
    "registrar_fundador",
    {
      p_nombre: opts.nombre ?? "Vendedor Sintetico",
      p_whatsapp: "+573001234567",
      p_email: null,
      p_ciudad: "Bogotá",
      p_zona: opts.localidad ?? "Chapinero",
      p_operacion: opts.operacion ?? "venta",
      p_tipo: opts.tipo ?? "apartamento",
      p_barrio: opts.barrio ?? "Los Rosales",
      p_direccion: opts.direccion ?? null,
      p_area: 78,
      p_habitaciones: opts.habitaciones ?? 3,
      p_precio: precio,
      p_consentimiento: true,
      p_ip_hash: `e2e-${Date.now()}-${secuencia}-${Math.floor(Math.random() * 1e9)}`,
    },
  );
  expect(error).toBeNull();
  const reg = data as unknown as { id: string; slug: string };
  return { id: reg.id, slug: reg.slug, precio };
}

// Verificación CON fecha de CTL (hace `dias` días).
export function verificarConCtl(a: AnuncioCreado, dias = 3): string {
  const fecha = fechaBogota(dias);
  ejecutar(
    `select public.marcar_verificado_ctl('${a.id}', '50N-1234567', date '${fecha}')`,
  );
  return fecha;
}

// Verificación de ANTES del S6: nivel y matrícula, sin fecha del CTL.
export function verificarSinFecha(a: AnuncioCreado): void {
  ejecutar(`select public.marcar_verificado('${a.id}', '50N-7654321')`);
}

// Lo deja vencido (vigente_hasta en el pasado).
export function vencer(a: AnuncioCreado): void {
  consultar(
    `update public.inmuebles set vigente_hasta = now() - interval '1 day' where id = '${a.id}'`,
  );
}

// Lo marca como confirmado hace `dias` días y unas horas (vigente_hasta = última confirmación + 60 d).
// Las 6 horas de más absorben el desfase entre el reloj de la BD (una máquina virtual) y el del
// navegador: el conteo de días COMPLETOS no baja de `dias` por unos segundos de diferencia.
export function confirmadoHace(a: AnuncioCreado, dias: number): void {
  consultar(
    `update public.inmuebles set vigente_hasta = now() + interval '${60 - dias} days' - interval '6 hours' where id = '${a.id}'`,
  );
}

// Zonas de prueba, en el formato de la URL (lat,lng;…): ≈ 2,2 × 2,2 km.
export const ZONA_ROSALES = "4.65,-74.06;4.65,-74.04;4.67,-74.04;4.67,-74.06"; // contiene Los Rosales
export const ZONA_SUBA = "4.72,-74.12;4.72,-74.10;4.74,-74.10;4.74,-74.12"; // no contiene Los Rosales
