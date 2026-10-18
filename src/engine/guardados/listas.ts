// Compartir una lista (S9, maqueta 07). Innmobiliaria JAMÁS envía nada por WhatsApp: «Compartir por WhatsApp»
// abre WhatsApp con el texto escrito y SIN número, y es la persona quien lo envía. Puro.
import { TOKEN_REGEX } from "@/engine/token/token";

const WHATSAPP = "https://wa.me/";

/** El enlace de la lista: el token va en el fragmento, que no llega al servidor ni a sus registros. */
export function enlaceLista(origen: string, token: string): string | null {
  if (!TOKEN_REGEX.test(token)) return null;
  return `${origen.replace(/\/+$/, "")}/lista#t=${token}`;
}

/** wa.me sin número: WhatsApp deja elegir a quién se lo manda. */
export function enlaceCompartirWhatsapp(texto: string, enlace: string): string {
  return `${WHATSAPP}?text=${encodeURIComponent(`${texto} ${enlace}`)}`;
}
