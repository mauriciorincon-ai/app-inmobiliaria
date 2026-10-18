"use client";

import {
  evaluarFoto,
  FULL_MAX_PX,
  THUMB_MAX_PX,
  FULL_MAX_BYTES,
  THUMB_MAX_BYTES,
  type RechazoFoto,
  type ResultadoGate,
} from "@/engine/fotos/gate";
import { CONTENT_TYPE_FOTO } from "@/lib/r2";
import { leerDimensiones, type LeerDimensiones } from "@/lib/leer-dimensiones";

// Orquesta la subida de UNA foto desde el navegador: gate → comprime (full+thumb WebP) →
// presign → PUT directo a R2 → confirma con registrar_foto. La compresión se importa de forma
// DINÁMICA (solo al elegir la primera foto) para no cargar browser-image-compression en el
// bundle inicial de /mi-anuncio (presupuesto de script). El lector de dimensiones se inyecta.

// Por qué no se subió una foto: un rechazo del gate (formato, peso, resolución) o un fallo de la
// cadena. La UI pone la frase en el idioma activo (`MI_ANUNCIO.subidor.errores`); aquí solo códigos.
export type RazonSubida =
  | RechazoFoto
  | "lectura"
  | "limite"
  | "presign"
  | "subida"
  | "confirmacion"
  | "red";

export type ResultadoSubida =
  | { ok: true; fotoId: string; orden: number }
  | { ok: false; razon: RazonSubida };

async function comprimir(
  file: File,
  maxPx: number,
  maxBytes: number,
): Promise<File> {
  const { default: imageCompression } =
    await import("browser-image-compression");
  return imageCompression(file, {
    maxWidthOrHeight: maxPx,
    maxSizeMB: maxBytes / (1024 * 1024),
    fileType: CONTENT_TYPE_FOTO,
    initialQuality: 0.8,
    useWebWorker: true,
  });
}

export async function subirFoto(
  file: File,
  token: string,
  leer: LeerDimensiones = leerDimensiones,
): Promise<ResultadoSubida> {
  // 1. Gate determinista ANTES de comprimir o tocar la red.
  let dim: { ancho: number; alto: number };
  try {
    dim = await leer(file);
  } catch {
    return { ok: false, razon: "lectura" };
  }
  const gate: ResultadoGate = evaluarFoto({
    tipo: file.type,
    bytes: file.size,
    ancho: dim.ancho,
    alto: dim.alto,
  });
  if (!gate.ok) return { ok: false, razon: gate.razon };

  try {
    // 2. Comprime full + thumb en paralelo.
    const [full, thumb] = await Promise.all([
      comprimir(file, FULL_MAX_PX, FULL_MAX_BYTES),
      comprimir(file, THUMB_MAX_PX, THUMB_MAX_BYTES),
    ]);

    // 3. Pide las URLs firmadas.
    const resp = await fetch("/api/fotos/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        ancho: dim.ancho,
        alto: dim.alto,
        tipo: CONTENT_TYPE_FOTO,
        bytesFull: full.size,
        bytesThumb: thumb.size,
      }),
    });
    if (!resp.ok) {
      const cuerpo = (await resp.json().catch(() => ({}))) as {
        error?: string;
      };
      if (cuerpo.error === "limite_fotos") {
        return { ok: false, razon: "limite" };
      }
      return { ok: false, razon: "presign" };
    }
    const { key, urlFull, urlThumb } = (await resp.json()) as {
      key: string;
      urlFull: string;
      urlThumb: string;
    };

    // 4. PUT directo a R2 (full + thumb). Content-Type exacto para que R2 lo sirva bien.
    const puts = await Promise.all([
      fetch(urlFull, {
        method: "PUT",
        body: full,
        headers: { "content-type": CONTENT_TYPE_FOTO },
      }),
      fetch(urlThumb, {
        method: "PUT",
        body: thumb,
        headers: { "content-type": CONTENT_TYPE_FOTO },
      }),
    ]);
    if (puts.some((p) => !p.ok)) {
      return { ok: false, razon: "subida" };
    }

    // 5. Confirma en la BD.
    const { crearClienteNavegador } = await import("@/lib/supabase/client");
    const supabase = crearClienteNavegador();
    const { data, error } = await supabase.rpc("registrar_foto", {
      p_token: token,
      p_r2_key: key,
      p_ancho: dim.ancho,
      p_alto: dim.alto,
      p_bytes: full.size,
    });
    if (error || !data) {
      return { ok: false, razon: "confirmacion" };
    }
    return { ok: true, fotoId: data.id, orden: data.orden };
  } catch {
    return { ok: false, razon: "red" };
  }
}
