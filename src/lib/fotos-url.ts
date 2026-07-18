// Helpers de URL de fotos — PUROS y client-safe (solo usan NEXT_PUBLIC_R2_PUBLIC_URL, que es
// pública por diseño). Separados de r2.ts para no arrastrar aws4fetch (server-only) al bundle
// del navegador.

// URL pública (r2.dev) de un objeto ya subido. Va como <img src> y como og:image.
export function urlPublicaFoto(key: string): string {
  const base = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(
    /\/+$/,
    "",
  );
  return `${base}/${key}`;
}

// Deriva la key de la miniatura desde la del full ("-full.webp" → "-thumb.webp"). Una sola
// columna en BD (r2_key = full); la thumb se calcula.
export function keyThumb(keyFull: string): string {
  return keyFull.replace(/-full\.webp$/, "-thumb.webp");
}
