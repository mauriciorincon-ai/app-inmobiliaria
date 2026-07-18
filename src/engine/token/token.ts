// Token del magic link "mi anuncio". El token se GENERA y se HASHEA en Postgres (256 bits de
// pgcrypto → base64url de 43 chars, solo el hash SHA-256 se persiste; ADR-004). Este módulo es
// la validación de forma + la construcción del link en el cliente. El token viaja como FRAGMENT
// (`/mi-anuncio#t=…`) para que jamás llegue al servidor ni a logs de acceso; todas las acciones
// van por POST.

// base64url de 32 bytes sin padding = 43 chars del alfabeto [A-Za-z0-9_-].
export const TOKEN_REGEX = /^[A-Za-z0-9_-]{43}$/;

// Clave de sessionStorage donde el Wizard deja el link recién generado para que /confirmacion lo
// muestre una sola vez (efímero: muere con la pestaña, el token en claro no se persiste).
export const CLAVE_LINK = "publicar.link.v1";

export function esTokenValido(token: string): boolean {
  return typeof token === "string" && TOKEN_REGEX.test(token);
}

// Arma el link completo del anuncio a partir del origin del sitio y el token.
export function construirLinkAnuncio(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/mi-anuncio#t=${token}`;
}

// Extrae y valida el token del fragment de la URL (`#t=…` o `t=…`). Devuelve null si no hay un
// token bien formado — el cliente entonces muestra el estado "necesitas tu enlace".
export function extraerTokenDeHash(hash: string): string | null {
  if (typeof hash !== "string") return null;
  const limpio = hash.replace(/^#/, "");
  const match = limpio.match(/(?:^|&)t=([^&]+)/);
  if (!match) return null;
  let valor: string;
  try {
    valor = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  return esTokenValido(valor) ? valor : null;
}
