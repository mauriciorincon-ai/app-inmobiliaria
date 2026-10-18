// Hashes y comparación para la verificación del comprador (S7, ADR 015). Usa Web Crypto, que existe
// igual en Node (`next start`, e2e) y en Cloudflare Workers. Hex en minúsculas: es lo que produce
// `encode(sha256(...), 'hex')` en Postgres y lo que Meta manda en `X-Hub-Signature-256`.

const codificador = new TextEncoder();

function aHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** SHA-256 de un texto UTF-8, en hex. Igual que `encode(sha256(convert_to(t, 'UTF8')), 'hex')`. */
export async function sha256Hex(texto: string): Promise<string> {
  return aHex(await crypto.subtle.digest("SHA-256", codificador.encode(texto)));
}

/** HMAC-SHA256 del cuerpo con el secreto, en hex. */
export async function hmacSha256Hex(
  secreto: string,
  cuerpo: string,
): Promise<string> {
  const llave = await crypto.subtle.importKey(
    "raw",
    codificador.encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return aHex(
    await crypto.subtle.sign("HMAC", llave, codificador.encode(cuerpo)),
  );
}

/**
 * Compara dos textos sin cortar en la primera diferencia: el tiempo no revela cuántos caracteres
 * coinciden. El largo sí se revela, y no importa: la firma y el token tienen un largo fijo y público.
 */
export function igualesEnTiempoConstante(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) {
    diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diferencia === 0;
}
