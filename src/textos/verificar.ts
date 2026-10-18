// Verificación del WhatsApp del comprador (S7, ADR 015). Redactada en cada idioma, no traducida.
// Innmobiliaria jamás envía mensajes: el comprador nos escribe con un código y así prueba que el número
// es suyo. Las frases cuentan solo lo que la página hace hoy.
import type { Arbol } from "@/i18n/textos";

export const VERIFICAR = {
  // Lo que queda escrito en WhatsApp al abrirlo hacia el número de Innmobiliaria. `{codigo}` es INN-XXXXXX.
  mensajeWhatsapp: {
    es: "Hola Innmobiliaria, este es mi código para verificar mi WhatsApp: {codigo}",
    en: "Hi Innmobiliaria, this is my code to verify my WhatsApp: {codigo}",
  },
} as const satisfies Arbol;
