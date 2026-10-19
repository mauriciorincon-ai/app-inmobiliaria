// Los favoritos del teléfono (S9, ADR 017): una lista de slugs en `localStorage`, la más nueva primero, sin
// repetidos y con tope. Puro: la lectura NUNCA lanza (lo que venga mal se descarta) y quien guarda decide
// cuándo escribir. Al verificar el WhatsApp, esta lista se fusiona en la cuenta (`fusionar_favoritos`).

export const CLAVE_FAVORITOS = "inn:favoritos:v1";
export const TOPE_FAVORITOS = 100;

const SLUG = /^[a-z0-9-]{3,120}$/;

export function esSlug(valor: unknown): valor is string {
  return typeof valor === "string" && SLUG.test(valor);
}

/** Une listas en orden (la primera manda), sin repetidos ni basura, hasta el tope. */
export function unirFavoritos(...listas: readonly unknown[][]): string[] {
  const vistos = new Set<string>();
  const salida: string[] = [];
  for (const lista of listas) {
    for (const s of lista) {
      if (!esSlug(s) || vistos.has(s)) continue;
      vistos.add(s);
      salida.push(s);
      if (salida.length === TOPE_FAVORITOS) return salida;
    }
  }
  return salida;
}

/** Lo guardado en el teléfono → slugs. Cualquier cosa rara ⇒ lista vacía. */
export function leerFavoritos(texto: string | null | undefined): string[] {
  if (!texto) return [];
  try {
    const valor: unknown = JSON.parse(texto);
    return Array.isArray(valor) ? unirFavoritos(valor) : [];
  } catch {
    return [];
  }
}

export function serializarFavoritos(slugs: readonly string[]): string {
  return JSON.stringify(unirFavoritos([...slugs]));
}

/** Guarda o quita un anuncio. Lo recién guardado va primero. */
export function alternarFavorito(
  slugs: readonly string[],
  slug: string,
): { slugs: string[]; guardado: boolean } {
  if (slugs.includes(slug)) {
    return { slugs: slugs.filter((s) => s !== slug), guardado: false };
  }
  return { slugs: unirFavoritos([slug], [...slugs]), guardado: true };
}
