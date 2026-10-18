// Geometría plana mínima para los sectores catastrales (sin dependencias). Los anillos son listas de
// [x, y]; el llamador decide el plano (SVG de la maqueta o lon/lat del catálogo). Lo usan
// `mapa-maqueta.mjs` y `convertir.mjs`.

export function distanciaSegmento([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t =
    l2 === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Douglas-Peucker. Un anillo cerrado (primer punto = último) se parte en el punto más lejano.
export function simplificar(puntos, tol) {
  if (puntos.length < 3) return puntos;
  let max = 0;
  let idx = 0;
  const fin = puntos.length - 1;
  for (let i = 1; i < fin; i++) {
    const d = distanciaSegmento(puntos[i], puntos[0], puntos[fin]);
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  if (max <= tol) return [puntos[0], puntos[fin]];
  const izq = simplificar(puntos.slice(0, idx + 1), tol);
  const der = simplificar(puntos.slice(idx), tol);
  return izq.slice(0, -1).concat(der);
}

// Centroide de área de un anillo cerrado.
export function centroide(anillo) {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < anillo.length - 1; i++) {
    const [x0, y0] = anillo[i];
    const [x1, y1] = anillo[i + 1];
    const f = x0 * y1 - x1 * y0;
    a += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  if (a === 0) return anillo[0];
  return [cx / (3 * a), cy / (3 * a)];
}

// Área con signo (positiva = antihoraria) de un anillo cerrado.
export function areaAnillo(anillo) {
  let a = 0;
  for (let i = 0; i < anillo.length - 1; i++) {
    a += anillo[i][0] * anillo[i + 1][1] - anillo[i + 1][0] * anillo[i][1];
  }
  return a / 2;
}

// ¿El punto cae dentro del anillo? (rayo hacia +x, par-impar.)
export function enAnillo([px, py], anillo) {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i];
    const [xj, yj] = anillo[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      dentro = !dentro;
    }
  }
  return dentro;
}

// ¿Dentro de la unión de anillos con la regla par-impar? (los huecos restan.)
export function enAnillos(punto, anillos) {
  let dentro = false;
  for (const a of anillos) if (enAnillo(punto, a)) dentro = !dentro;
  return dentro;
}

// Un punto GARANTIZADO dentro del anillo: el centroide si cae dentro; si el sector es cóncavo y el
// centroide cae fuera, el medio del tramo más ancho de la horizontal que pasa por el centroide.
export function puntoInterior(anillo) {
  const c = centroide(anillo);
  if (enAnillo(c, anillo)) return { punto: c, centroide: true };
  const y = c[1];
  const xs = [];
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i];
    const [xj, yj] = anillo[j];
    if (yi > y !== yj > y) xs.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
  }
  xs.sort((p, q) => p - q);
  let mejor = null;
  for (let k = 0; k + 1 < xs.length; k += 2) {
    const ancho = xs[k + 1] - xs[k];
    if (mejor === null || ancho > mejor.ancho) {
      mejor = { ancho, x: (xs[k] + xs[k + 1]) / 2 };
    }
  }
  return { punto: [mejor ? mejor.x : c[0], y], centroide: false };
}
