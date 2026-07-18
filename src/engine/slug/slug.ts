// Slug público del inmueble: `{tipo}-{barrio}-{sufijo}` (ej. apartamento-cedritos-a3f9c1).
// La generación autoritativa (con loop anticolisión + sufijo aleatorio) vive en Postgres
// (`generar_slug`, migración 2); este módulo es el ESPEJO en TS para validar y para tests —
// `slugificar` reproduce el mismo normalizado que hace el SQL. El slug es INMUTABLE (los links
// compartidos por WhatsApp no pueden morir).

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX = 96;
export const SUFIJO_LEN = 6; // 6 hex de gen_random_bytes(3) → 16.7M combinaciones, no enumerable.

// Normaliza un texto a segmento de slug: minúsculas, sin acentos, solo [a-z0-9-].
export function slugificar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita diacríticos (á→a, ñ→n, ü→u)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Base del slug sin el sufijo aleatorio (lo añade el SQL). Útil para tests del formato.
export function construirBaseSlug(tipo: string, barrio: string): string {
  return [slugificar(tipo), slugificar(barrio)].filter(Boolean).join("-");
}

export function esSlugValido(s: string): boolean {
  return s.length > 0 && s.length <= SLUG_MAX && SLUG_REGEX.test(s);
}
