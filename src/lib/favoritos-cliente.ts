// Los favoritos en el NAVEGADOR (S9, ADR 017). Viven en `localStorage` y, si este navegador ya verificó su
// WhatsApp, también se avisan a la cuenta (el servidor lee la sesión de la cookie httpOnly; aquí no se puede).
// Un 403 significa «aún no verificado» y se ignora: el teléfono ya lo tiene. Nunca lanza.
import {
  CLAVE_FAVORITOS,
  leerFavoritos,
  serializarFavoritos,
} from "@/engine/guardados/favoritos";
import { escribirLocal, leerLocal } from "@/lib/almacen-local";

const EVENTO = "inn:favoritos";
const CABECERAS = { "content-type": "application/json" };

// Tras el primer 403 de esta carga de página no se vuelve a preguntar.
let sinCuenta = false;

export function suscribirFavoritos(avisar: () => void): () => void {
  window.addEventListener("storage", avisar);
  window.addEventListener(EVENTO, avisar);
  return () => {
    window.removeEventListener("storage", avisar);
    window.removeEventListener(EVENTO, avisar);
  };
}

/** Lo guardado tal cual (texto): estable entre lecturas, apto para `useSyncExternalStore`. */
export function instantaneaFavoritos(): string {
  return leerLocal(CLAVE_FAVORITOS) ?? "";
}

export function favoritosLocales(): string[] {
  return leerFavoritos(instantaneaFavoritos());
}

export function guardarFavoritosLocales(slugs: readonly string[]): void {
  escribirLocal(CLAVE_FAVORITOS, serializarFavoritos(slugs));
  window.dispatchEvent(new Event(EVENTO));
}

/** Avisa a la cuenta que se guardó o se quitó un favorito. Sin sesión verificada no hace nada. */
export async function avisarFavorito(
  slug: string,
  guardado: boolean,
): Promise<void> {
  if (sinCuenta) return;
  try {
    const res = await fetch("/api/favoritos", {
      method: guardado ? "POST" : "DELETE",
      headers: CABECERAS,
      body: JSON.stringify(guardado ? { slugs: [slug] } : { slug }),
    });
    // Se lee siempre el cuerpo: una respuesta sin leer deja la petición «en curso» en el navegador.
    await res.text();
    if (res.status === 403) sinCuenta = true;
  } catch {
    // sin red: el teléfono ya lo tiene
  }
}

/**
 * Pasa los favoritos del teléfono a la cuenta (sin duplicar) y devuelve los de la cuenta. `null` = este
 * navegador no está verificado (o no hay red): los favoritos siguen siendo solo del teléfono.
 */
export async function fusionarConCuenta(
  locales: readonly string[],
): Promise<string[] | null> {
  try {
    const res = await fetch(
      "/api/favoritos",
      locales.length > 0
        ? {
            method: "POST",
            headers: CABECERAS,
            body: JSON.stringify({ slugs: locales }),
          }
        : { method: "GET", cache: "no-store" },
    );
    if (!res.ok) {
      await res.text();
      if (res.status === 403) sinCuenta = true;
      return null;
    }
    sinCuenta = false;
    const datos = (await res.json()) as { slugs?: string[] };
    return Array.isArray(datos.slugs) ? datos.slugs : null;
  } catch {
    return null;
  }
}
