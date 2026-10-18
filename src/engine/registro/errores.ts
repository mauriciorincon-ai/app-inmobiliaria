import { rellenar } from "@/i18n/textos";
import { esCodigoError, LIMITES, type CodigoError } from "./schema";

// Los mensajes de `schema.ts` son códigos; este módulo los convierte en la frase del idioma activo.
// `textos` es `PUBLICAR.errores` ya proyectado a un idioma (una cadena por código). Un mensaje que no
// sea un código (p. ej. el de Zod por defecto ante un campo ausente) cae en `alternativa`, para no
// mostrar nunca una frase en otro idioma.
export function textoDeError(
  mensaje: string,
  textos: Record<CodigoError, string>,
  alternativa: string,
): string {
  if (!esCodigoError(mensaje)) return alternativa;
  return rellenar(textos[mensaje], LIMITES);
}
