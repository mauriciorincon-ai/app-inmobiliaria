// La firma de Meta en el webhook de WhatsApp (S7, ADR 015). Meta firma el CUERPO CRUDO con el secreto
// de la app y manda `X-Hub-Signature-256: sha256=<hex>`. Se valida antes de interpretar el cuerpo; sin
// secreto configurado, nada es válido (falla cerrado).
import { hmacSha256Hex, igualesEnTiempoConstante } from "./hash";

export const CABECERA_FIRMA = "x-hub-signature-256";
const PREFIJO = "sha256=";

/** La cabecera que Meta mandaría para este cuerpo. La usan las pruebas para simular a Meta. */
export async function firmarCuerpo(
  secreto: string,
  cuerpo: string,
): Promise<string> {
  return PREFIJO + (await hmacSha256Hex(secreto, cuerpo));
}

export async function firmaValida(
  cabecera: string | null | undefined,
  secreto: string | null | undefined,
  cuerpo: string,
): Promise<boolean> {
  if (!secreto || !cabecera) return false;
  const esperada = await firmarCuerpo(secreto, cuerpo);
  return igualesEnTiempoConstante(cabecera.trim().toLowerCase(), esperada);
}

/** El saludo de suscripción (`GET` con `hub.verify_token`): el token que tú elegiste en Meta. */
export function tokenSuscripcionValido(
  recibido: string | null | undefined,
  esperado: string | null | undefined,
): boolean {
  if (!esperado || !recibido) return false;
  return igualesEnTiempoConstante(recibido, esperado);
}
