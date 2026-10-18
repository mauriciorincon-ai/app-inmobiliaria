import { createClient } from "@supabase/supabase-js";
import { expect } from "@playwright/test";
import { consultar } from "./bd";

// Compradores SINTÉTICOS para las pruebas de la base: una sesión (el hash de una cookie que nadie más
// conoce), un código por la RPC pública y su canje como `postgres` (el rol con el que el webhook usaría la
// llave de servicio). Cada prueba usa su propio teléfono: el comprador es único por número.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function sesionNueva(): string {
  // 64 hex aleatorios: el hash de una sesión que nadie más conoce.
  return Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
}

// Un celular colombiano de 10 dígitos que ninguna otra prueba usa (para no compartir comprador).
export function telefonoNuevo(): string {
  const cola = Array.from({ length: 9 }, () =>
    Math.floor(Math.random() * 10),
  ).join("");
  return `+573${cola}`;
}

export function hashDe(codigo: string): string {
  return consultar(
    `select encode(sha256(convert_to('${codigo}', 'UTF8')), 'hex')`,
  )[0];
}

export async function pedirCodigo(
  sesion: string,
  extra: Record<string, unknown> = {},
) {
  const supabase = createClient(url, anon);
  const { data, error } = await supabase.rpc("iniciar_verificacion", {
    p_sesion_hash: sesion,
    p_nombre: "Laura Sintetica",
    p_telefono: "+573115550101",
    p_idioma: "es",
    p_ip_hash: `s7-${sesion.slice(0, 12)}`,
    p_consentimiento: true,
    ...extra,
  });
  return { supabase, codigo: data as unknown as string, error };
}

export function canjear(codigo: string, telefono: string): string {
  return consultar(
    `select public.canjear_codigo_whatsapp('${hashDe(codigo)}', '${telefono}')`,
  )[0];
}

// Un comprador con el WhatsApp verificado: devuelve su sesión y su teléfono.
export async function compradorVerificado(
  opts: { telefono?: string; nombre?: string; idioma?: "es" | "en" } = {},
): Promise<{ sesion: string; telefono: string; nombre: string }> {
  const sesion = sesionNueva();
  const telefono = opts.telefono ?? telefonoNuevo();
  const nombre = opts.nombre ?? "Laura Sintetica";
  const { codigo, error } = await pedirCodigo(sesion, {
    p_telefono: telefono,
    p_nombre: nombre,
    p_idioma: opts.idioma ?? "es",
    p_ip_hash: `s8-${sesion.slice(0, 12)}`,
  });
  expect(error).toBeNull();
  expect(canjear(codigo, telefono)).toBe("ok");
  return { sesion, telefono, nombre };
}
