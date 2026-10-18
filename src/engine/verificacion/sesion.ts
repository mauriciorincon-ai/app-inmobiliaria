// La sesión del comprador (S7, ADR 015): un valor aleatorio de 32 bytes en una cookie httpOnly. La base
// guarda SOLO su SHA-256, como el magic link del vendedor (ADR 004): quien lea la base no puede hacerse
// pasar por el navegador del comprador.
import { sha256Hex } from "./hash";

export const COOKIE_COMPRADOR = "inn_comprador";
export const VIGENCIA_SESION_SEGUNDOS = 60 * 60 * 24 * 365;
/** 32 bytes en base64url sin relleno = 43 caracteres. */
export const REGEX_SESION = /^[A-Za-z0-9_-]{43}$/;

export function generarSesion(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function esSesionValida(valor: unknown): valor is string {
  return typeof valor === "string" && REGEX_SESION.test(valor);
}

export function hashSesion(sesion: string): Promise<string> {
  return sha256Hex(sesion);
}

const BASE_FICTICIA = "https://innmobiliaria.invalid";

/**
 * A dónde volver tras verificar (`?volver=`): SOLO una ruta de esta misma app. Rechaza lo que un
 * navegador entendería como otro sitio (`//x`, `/\x`, `https:`…) y los caracteres de control.
 */
export function rutaDeVuelta(volver: unknown): string | null {
  if (
    typeof volver !== "string" ||
    volver.length === 0 ||
    volver.length > 200
  ) {
    return null;
  }
  if (
    !volver.startsWith("/") ||
    volver.startsWith("//") ||
    volver.includes("\\")
  ) {
    return null;
  }
  if (/[\u0000-\u001f\u007f]/.test(volver)) return null;
  try {
    const url = new URL(volver, BASE_FICTICIA);
    if (url.origin !== BASE_FICTICIA) return null;
    // `new URL` resuelve los segmentos `.` y `..`: «/.//x» queda como «//x», que un navegador lee como
    // OTRO sitio. Se mira la ruta YA normalizada, no la que llegó.
    const ruta = url.pathname + url.search;
    if (ruta.startsWith("//") || ruta.startsWith("/\\")) return null;
    return ruta;
  } catch {
    return null;
  }
}
