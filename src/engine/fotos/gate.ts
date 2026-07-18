// Gate de calidad de fotos — DETERMINISTA, sin IA (regla de dominio 7 + F0 #5). Corre
// client-side ANTES de comprimir y de cualquier red: una foto que no pasa jamás sube a R2.
// El mismo gate se re-evalúa server-side en /api/fotos/presign (defensa en profundidad).

export type RechazoFoto = "formato" | "peso" | "resolucion";

export const FORMATOS_ACEPTADOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

// Resolución mínima de entrada. El full servido es 1600px; exigir ≥1200 en el lado mayor limita
// la pérdida y acepta cualquier foto de cámara de teléfono (≥3000px) o reenviada por WhatsApp
// (~1600×1200), pero rechaza miniaturas y capturas de pantalla viejas.
export const MIN_LADO_MAYOR = 1200;
export const MIN_LADO_MENOR = 720;

export const MAX_BYTES_ENTRADA = 20 * 1024 * 1024; // 20 MB: techo de memoria en gama baja.
export const MAX_FOTOS = 12; // Límite superior visible (rendimientos decrecientes, Benefield).

// Salida de la compresión client-side (browser-image-compression).
export const FULL_MAX_PX = 1600;
export const THUMB_MAX_PX = 400;
export const FULL_MAX_BYTES = 1_500_000;
export const THUMB_MAX_BYTES = 150_000;

export type EntradaFoto = {
  tipo: string;
  bytes: number;
  ancho: number;
  alto: number;
};

export type ResultadoGate =
  { ok: true } | { ok: false; razon: RechazoFoto; mensaje: string };

// Evalúa una foto a partir de sus metadatos (tipo, bytes, dimensiones ya leídas client-side).
// Función pura: mismos datos → mismo veredicto. Los mensajes son es-CO llano y accionable.
export function evaluarFoto(m: EntradaFoto): ResultadoGate {
  if (
    !FORMATOS_ACEPTADOS.includes(m.tipo as (typeof FORMATOS_ACEPTADOS)[number])
  ) {
    return {
      ok: false,
      razon: "formato",
      mensaje: "Usa una foto en formato JPG, PNG o WebP.",
    };
  }
  if (m.bytes > MAX_BYTES_ENTRADA) {
    return {
      ok: false,
      razon: "peso",
      mensaje: "La foto pesa demasiado (máximo 20 MB). Prueba con otra.",
    };
  }
  const mayor = Math.max(m.ancho, m.alto);
  const menor = Math.min(m.ancho, m.alto);
  if (mayor < MIN_LADO_MAYOR || menor < MIN_LADO_MENOR) {
    return {
      ok: false,
      razon: "resolucion",
      mensaje:
        "La foto es muy pequeña. Tómala con la cámara del teléfono (no una captura de pantalla) y vuelve a intentar.",
    };
  }
  return { ok: true };
}

// ¿Se puede subir otra foto? El límite es visible en la UI y se re-valida en la RPC.
export function puedeAgregar(cantidadActual: number): boolean {
  return cantidadActual < MAX_FOTOS;
}
