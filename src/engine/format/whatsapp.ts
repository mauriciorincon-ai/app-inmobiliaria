// Normalización de números de WhatsApp colombianos a E.164 (+57 + 10 dígitos).
// Los celulares colombianos son 10 dígitos que empiezan por 3. Aceptamos las formas en que un
// vendedor los escribe (con espacios, guiones, prefijo país o indicativo internacional) y las
// llevamos a un único formato canónico. La BD blinda con un CHECK sobre el mismo patrón.

/** Devuelve el número en E.164 (`+573001234567`) o `null` si no es un celular colombiano válido. */
export function normalizarWhatsapp(entrada: string): string | null {
  if (typeof entrada !== "string") return null;

  // Nos quedamos solo con dígitos (descarta +, espacios, guiones, paréntesis, puntos).
  const digitos = entrada.replace(/\D/g, "");

  // 10 dígitos locales: 3XXXXXXXXX
  if (digitos.length === 10 && digitos.startsWith("3")) {
    return `+57${digitos}`;
  }
  // Con indicativo país: 57 + 3XXXXXXXXX
  if (digitos.length === 12 && digitos.startsWith("57") && digitos[2] === "3") {
    return `+${digitos}`;
  }
  // Con salida internacional colombiana: 0057 + 3XXXXXXXXX
  if (
    digitos.length === 14 &&
    digitos.startsWith("0057") &&
    digitos[4] === "3"
  ) {
    return `+${digitos.slice(2)}`;
  }
  return null;
}

/** `true` si la entrada puede normalizarse a un celular colombiano válido. */
export function esWhatsappValido(entrada: string): boolean {
  return normalizarWhatsapp(entrada) !== null;
}

/**
 * Construye un enlace `wa.me` que abre WhatsApp con un mensaje prellenado. Acepta E.164
 * (`+573001234567`) o cualquier forma normalizable; se queda solo con los dígitos (wa.me no
 * lleva el `+`). Usado por el botón de re-contacto del panel.
 */
export function construirWaMe(numero: string, texto: string): string {
  const e164 = normalizarWhatsapp(numero) ?? numero;
  const digitos = e164.replace(/\D/g, "");
  return `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}`;
}

/**
 * Mensaje de re-contacto para un fundador del S1: lo invita a completar su anuncio con su magic
 * link. Copy es-CO, sin cifras no citables. `nombre` se recorta al primer nombre.
 */
export function mensajeReContacto(nombre: string, link: string): string {
  const primerNombre = nombre.trim().split(/\s+/)[0] || "hola";
  return (
    `Hola ${primerNombre}, te saludamos de Innmobiliaria. Tu inmueble ya está publicado como ` +
    `fundador. Ahora puedes completarlo con fotos y descripción para que luzca mejor — entra ` +
    `desde este enlace (es solo tuyo, guárdalo): ${link}`
  );
}
