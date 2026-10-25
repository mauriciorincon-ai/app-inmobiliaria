// La huella perceptual de una foto (S15): dHash de 64 bits. La imagen se lleva a gris, se reduce a 9 × 8 promediando
// bloques, y cada bit dice si un píxel es más claro que el de su derecha. Dos fotos iguales —aunque se hayan recomprimido o
// cambiado de tamaño— quedan a pocos bits de distancia. Se calcula en el navegador (al subir la foto, sobre su miniatura, y
// en el panel para las ya subidas) con este mismo código; la base compara las distancias. Puro: recibe píxeles, no lee nada.
import { UMBRALES } from "./reglas";

export const HUELLA_ANCHO = 9;
export const HUELLA_ALTO = 8;

/** Luminancia (0–255) de cada píxel de un búfer RGBA, como la del estándar BT.601. El canal alfa se ignora. */
export function grisDeRgba(rgba: ArrayLike<number>): number[] {
  const gris: number[] = [];
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    gris.push(0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]);
  }
  return gris;
}

/** Reduce una imagen gris `ancho × alto` a `anchoDestino × altoDestino` promediando bloques (área, sin suavizado del navegador). */
export function promediarBloques(
  gris: ArrayLike<number>,
  ancho: number,
  alto: number,
  anchoDestino = HUELLA_ANCHO,
  altoDestino = HUELLA_ALTO,
): number[] {
  if (gris.length !== ancho * alto || ancho < anchoDestino || alto < altoDestino) {
    throw new RangeError("dimensiones");
  }
  const salida: number[] = [];
  for (let fy = 0; fy < altoDestino; fy++) {
    const y0 = Math.floor((fy * alto) / altoDestino);
    const y1 = Math.floor(((fy + 1) * alto) / altoDestino);
    for (let fx = 0; fx < anchoDestino; fx++) {
      const x0 = Math.floor((fx * ancho) / anchoDestino);
      const x1 = Math.floor(((fx + 1) * ancho) / anchoDestino);
      let suma = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) suma += gris[y * ancho + x];
      }
      salida.push(suma / ((y1 - y0) * (x1 - x0)));
    }
  }
  return salida;
}

/** dHash de una imagen gris de 9 × 8: 64 bits, en 16 dígitos hexadecimales (el primer bit es el más significativo). */
export function dhash(gris9x8: ArrayLike<number>): string {
  if (gris9x8.length !== HUELLA_ANCHO * HUELLA_ALTO) {
    throw new RangeError("dimensiones");
  }
  let hex = "";
  let nibble = 0;
  let bits = 0;
  for (let y = 0; y < HUELLA_ALTO; y++) {
    for (let x = 0; x < HUELLA_ANCHO - 1; x++) {
      const i = y * HUELLA_ANCHO + x;
      nibble = (nibble << 1) | (gris9x8[i] > gris9x8[i + 1] ? 1 : 0);
      bits++;
      if (bits === 4) {
        hex += nibble.toString(16);
        nibble = 0;
        bits = 0;
      }
    }
  }
  return hex;
}

const HEX = /^[0-9a-f]{16}$/;

function unosDe(n: number): number {
  let c = 0;
  for (let v = n; v; v >>= 1) c += v & 1;
  return c;
}

/** Cuántos bits en 1 tiene una huella. */
export function unos(huella: string): number {
  if (!HEX.test(huella)) throw new RangeError("huella");
  let c = 0;
  for (const d of huella) c += unosDe(parseInt(d, 16));
  return c;
}

/** Distancia de Hamming entre dos huellas: cuántos de sus 64 bits difieren. */
export function distanciaHuella(a: string, b: string): number {
  if (!HEX.test(a) || !HEX.test(b)) throw new RangeError("huella");
  let c = 0;
  for (let i = 0; i < 16; i++) {
    c += unosDe(parseInt(a[i], 16) ^ parseInt(b[i], 16));
  }
  return c;
}

/** Una huella casi lisa no informa nada (la regla no la compara). */
export function huellaInformativa(huella: string): boolean {
  const n = unos(huella);
  return n >= UMBRALES.huellaMinUnos && n <= UMBRALES.huellaMaxUnos;
}

/** La regla de la foto, la misma de la base: las dos informan y están a 6 bits o menos. */
export function mismaFoto(a: string, b: string): boolean {
  return (
    huellaInformativa(a) &&
    huellaInformativa(b) &&
    distanciaHuella(a, b) <= UMBRALES.huellaDistancia
  );
}
