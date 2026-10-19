// Las alertas de un teléfono (S9, ADR 017). No hay cuenta: el teléfono que creó una alerta guarda su token de
// GESTIONAR en el almacenamiento del navegador y con él pide «Mis alertas». El mismo token llega por correo
// (`/alertas#t=…`) para abrirlas desde otro teléfono. Puro: leer nunca lanza; lo raro es una lista vacía.
import { TOKEN_REGEX } from "@/engine/token/token";
import { MAX_ALERTAS_TELEFONO } from "./topes";

export const CLAVE_ALERTAS = "inn:alertas:v1";

/** Lo guardado → tokens válidos, sin repetir, hasta el tope. */
export function leerTokensAlertas(crudo: string | null | undefined): string[] {
  if (!crudo) return [];
  try {
    const valor: unknown = JSON.parse(crudo);
    if (!Array.isArray(valor)) return [];
    const vistos = new Set<string>();
    for (const t of valor) {
      if (typeof t === "string" && TOKEN_REGEX.test(t)) vistos.add(t);
    }
    return [...vistos].slice(0, MAX_ALERTAS_TELEFONO);
  } catch {
    return [];
  }
}

export function serializarTokensAlertas(tokens: readonly string[]): string {
  return JSON.stringify(tokens.slice(0, MAX_ALERTAS_TELEFONO));
}

/** El token nuevo va primero; uno repetido sube al frente en vez de duplicarse. */
export function agregarTokenAlerta(
  tokens: readonly string[],
  nuevo: string,
): string[] {
  if (!TOKEN_REGEX.test(nuevo)) return [...tokens];
  return [nuevo, ...tokens.filter((t) => t !== nuevo)].slice(
    0,
    MAX_ALERTAS_TELEFONO,
  );
}

export function quitarTokenAlerta(
  tokens: readonly string[],
  token: string,
): string[] {
  return tokens.filter((t) => t !== token);
}
