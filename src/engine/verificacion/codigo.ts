// El código que el comprador manda por WhatsApp para probar que el número es suyo (S7, ADR 015). Lo
// genera la base (`iniciar_verificacion`) y la base guarda SOLO su hash; este módulo lo reconoce dentro
// del texto de un mensaje entrante y calcula el mismo hash que Postgres.
import { sha256Hex } from "./hash";

/** 32 símbolos sin los que se confunden (I, O, 0, 1). Idéntico al de la migración 9. */
export const ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const PREFIJO_CODIGO = "INN-";
export const LARGO_CODIGO = 6;
/** Minutos que vive un código (la RPC fija el vencimiento; la página lo cuenta). */
export const MINUTOS_CODIGO = 10;

export const REGEX_CODIGO = /^INN-[A-HJ-NP-Z2-9]{6}$/;

export function esCodigo(valor: unknown): valor is string {
  return typeof valor === "string" && REGEX_CODIGO.test(valor);
}

// Un mensaje real trae el código dentro de una frase, y la gente lo reescribe: minúsculas, espacio o
// guion bajo en vez del guion. Se busca «INN» seguido de 6 símbolos que no sigan pegados a más letras.
const EN_TEXTO = /(?:^|[^A-Z0-9])INN[\s\-_–—]*([A-Z0-9]{6})(?![A-Z0-9])/;

/** El código normalizado (`INN-XXXXXX`) que trae un mensaje, o `null` si no trae uno válido. */
export function extraerCodigo(texto: unknown): string | null {
  if (typeof texto !== "string" || texto.length > 1000) return null;
  const encontrado = texto.toUpperCase().match(EN_TEXTO);
  if (!encontrado) return null;
  const cuerpo = encontrado[1];
  for (const simbolo of cuerpo) {
    if (!ALFABETO_CODIGO.includes(simbolo)) return null;
  }
  return PREFIJO_CODIGO + cuerpo;
}

/** El hash con que la base guarda el código (SHA-256 hex del código normalizado). */
export function hashCodigo(codigo: string): Promise<string> {
  return sha256Hex(codigo);
}
