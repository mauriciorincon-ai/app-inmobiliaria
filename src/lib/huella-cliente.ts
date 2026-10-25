"use client";

import { dhash, grisDeRgba, promediarBloques } from "@/engine/antifraude/huella";

// La huella de una foto en el NAVEGADOR (S15): se pinta la imagen en un lienzo chico (90 × 80), se lleva a gris y se promedia
// a 9 × 8 con el motor puro. La usan la subida de «Mi anuncio» (sobre la miniatura recién comprimida) y el panel del operador
// (sobre la miniatura ya publicada), así las dos huellas salen del mismo código y de la misma imagen. Si el navegador no
// puede leer la imagen, devuelve null: la huella jamás bloquea una subida.
const ANCHO = 90;
const ALTO = 80;

export async function huellaDeImagen(imagen: Blob): Promise<string | null> {
  try {
    const mapa = await createImageBitmap(imagen);
    const lienzo = document.createElement("canvas");
    lienzo.width = ANCHO;
    lienzo.height = ALTO;
    const ctx = lienzo.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(mapa, 0, 0, ANCHO, ALTO);
    mapa.close();
    const { data } = ctx.getImageData(0, 0, ANCHO, ALTO);
    return dhash(promediarBloques(grisDeRgba(data), ANCHO, ALTO));
  } catch {
    return null;
  }
}
