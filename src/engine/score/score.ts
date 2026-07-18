// Score de completitud del anuncio (goal-gradient). Motor puro: dado el estado del anuncio
// devuelve un porcentaje 40..100 y el siguiente paso sugerido. Los pesos y el ancla (primera
// foto → 55%) se fijan en ADR-006. El 100% NO exige verificación nivel 2 — el sello ⭐ es
// insignia aparte (depende del operador, no del vendedor; el goal-gradient solo funciona si la
// meta está en manos del propio vendedor desde su teléfono).

export const PUNTOS_BASE = 40; // registrarse ya "avanzó" (endowed progress).
export const PUNTOS_POR_FOTO = [15, 5, 4, 3, 3] as const; // suma 30; foto 6+ no suma (decrecientes).
export const PUNTOS_DESCRIPCION = 15;
export const PUNTOS_PORTADA = 5;
export const PUNTOS_CONTACTO = 10;
export const DESCRIPCION_MIN = 80; // una descripción real, no "linda casa".

export const MAX_FOTOS_PUNTUABLES = PUNTOS_POR_FOTO.length;

export type EstadoAnuncio = {
  fotos: number;
  tienePortada: boolean;
  descripcionLen: number;
  contactoPublico: boolean;
};

export function calcularScore(e: EstadoAnuncio): number {
  let s = PUNTOS_BASE;
  const nFotos = Math.max(0, Math.min(e.fotos, MAX_FOTOS_PUNTUABLES));
  for (let i = 0; i < nFotos; i++) s += PUNTOS_POR_FOTO[i];
  if (e.descripcionLen >= DESCRIPCION_MIN) s += PUNTOS_DESCRIPCION;
  if (e.tienePortada) s += PUNTOS_PORTADA;
  if (e.contactoPublico) s += PUNTOS_CONTACTO;
  return s;
}

export type PasoSugerido = { accion: string; puntos: number };

// El siguiente paso alcanzable (goal-gradient: siempre hay un paso pequeño y visible), o null
// cuando el anuncio llegó al 100%.
export function siguientePaso(e: EstadoAnuncio): PasoSugerido | null {
  if (e.fotos === 0) {
    return { accion: "Sube tu primera foto", puntos: PUNTOS_POR_FOTO[0] };
  }
  if (e.descripcionLen < DESCRIPCION_MIN) {
    return { accion: "Escribe la descripción", puntos: PUNTOS_DESCRIPCION };
  }
  if (!e.tienePortada) {
    return { accion: "Elige tu foto de portada", puntos: PUNTOS_PORTADA };
  }
  if (!e.contactoPublico) {
    return {
      accion: "Activa el contacto para interesados",
      puntos: PUNTOS_CONTACTO,
    };
  }
  if (e.fotos < MAX_FOTOS_PUNTUABLES) {
    return { accion: "Agrega otra foto", puntos: PUNTOS_POR_FOTO[e.fotos] };
  }
  return null;
}
