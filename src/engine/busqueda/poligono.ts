// La zona que el comprador dibuja en el mapa: una lista de puntos {lat, lng}. Vive en la URL
// (`zona=lat,lng;lat,lng;…`), se valida aquí ANTES de llegar a la BD y viaja a `buscar_inmuebles`
// como texto de un `polygon` de Postgres ('((lng,lat),(lng,lat),…)': x = longitud, y = latitud).
// Un anuncio entra si el centroide de SU BARRIO cae dentro; la zona nunca revela una dirección.

export type Punto = { lat: number; lng: number };

export const ZONA_MIN_VERTICES = 3;
export const ZONA_MAX_VERTICES = 100;
// Una zona más chica que esto no abarca ni un barrio: casi seguro fue un toque de más.
export const ZONA_AREA_MIN_KM2 = 0.05;
// Caja de Bogotá D.C. (incluye Sumapaz): fuera de ella no hay anuncios.
export const BOGOTA = {
  latMin: 3.7,
  latMax: 4.9,
  lngMin: -74.5,
  lngMax: -73.9,
};

export type MotivoZona =
  | "pocos_puntos"
  | "muchos_puntos"
  | "fuera_de_bogota"
  | "muy_pequena"
  | "se_cruza";

export type ResultadoZona = { ok: true } | { ok: false; motivo: MotivoZona };

const redondear = (v: number) => Math.round(v * 1e5) / 1e5; // ≈ 1 m

export function dentroDeBogota(p: Punto): boolean {
  return (
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    p.lat >= BOGOTA.latMin &&
    p.lat <= BOGOTA.latMax &&
    p.lng >= BOGOTA.lngMin &&
    p.lng <= BOGOTA.lngMax
  );
}

// Área aproximada en km² (proyección local plana; sobra para una zona de ciudad).
export function areaKm2(puntos: readonly Punto[]): number {
  if (puntos.length < 3) return 0;
  const lat0 = puntos.reduce((s, p) => s + p.lat, 0) / puntos.length;
  const kmLat = 111.32;
  const kmLng = 111.32 * Math.cos((lat0 * Math.PI) / 180);
  let a = 0;
  for (let i = 0; i < puntos.length; i++) {
    const p = puntos[i];
    const q = puntos[(i + 1) % puntos.length];
    a += p.lng * kmLng * (q.lat * kmLat) - q.lng * kmLng * (p.lat * kmLat);
  }
  return Math.abs(a) / 2;
}

function cruce(a: Punto, b: Punto, c: Punto, d: Punto): boolean {
  const giro = (p: Punto, q: Punto, r: Punto) =>
    Math.sign(
      (q.lng - p.lng) * (r.lat - p.lat) - (q.lat - p.lat) * (r.lng - p.lng),
    );
  return giro(a, b, c) * giro(a, b, d) < 0 && giro(c, d, a) * giro(c, d, b) < 0;
}

// ¿Algún lado cruza a otro que no es su vecino? Una zona en moño da resultados que nadie espera.
export function seCruza(puntos: readonly Punto[]): boolean {
  const n = puntos.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const vecinos = j === i + 1 || (i === 0 && j === n - 1);
      if (vecinos) continue;
      if (
        cruce(puntos[i], puntos[(i + 1) % n], puntos[j], puntos[(j + 1) % n])
      ) {
        return true;
      }
    }
  }
  return false;
}

export function validarZona(puntos: readonly Punto[]): ResultadoZona {
  if (puntos.length < ZONA_MIN_VERTICES)
    return { ok: false, motivo: "pocos_puntos" };
  if (puntos.length > ZONA_MAX_VERTICES)
    return { ok: false, motivo: "muchos_puntos" };
  if (!puntos.every(dentroDeBogota))
    return { ok: false, motivo: "fuera_de_bogota" };
  // Primero el cruce: el área de un moño se cancela sola y mentiría («muy pequeña»).
  if (seCruza(puntos)) return { ok: false, motivo: "se_cruza" };
  if (areaKm2(puntos) < ZONA_AREA_MIN_KM2)
    return { ok: false, motivo: "muy_pequena" };
  return { ok: true };
}

// `zona` de la URL → puntos. Cualquier cosa rara (formato, rango, cruce, tamaño) ⇒ null: la página
// ignora la zona y muestra la búsqueda sin ella, nunca un error.
export function parsearZona(texto: string): Punto[] | null {
  if (texto.length === 0 || texto.length > 4000) return null;
  const puntos: Punto[] = [];
  for (const par of texto.split(";")) {
    const m = /^(-?\d{1,3}(?:\.\d{1,6})?),(-?\d{1,3}(?:\.\d{1,6})?)$/.exec(par);
    if (!m) return null;
    puntos.push({ lat: Number(m[1]), lng: Number(m[2]) });
    if (puntos.length > ZONA_MAX_VERTICES) return null;
  }
  return validarZona(puntos).ok ? puntos : null;
}

// Puntos → `zona` de la URL (5 decimales, sin ceros de sobra).
export function serializarZona(puntos: readonly Punto[]): string {
  return puntos.map((p) => `${redondear(p.lat)},${redondear(p.lng)}`).join(";");
}

// Puntos → texto de `polygon` de Postgres. Postgres usa (x, y) = (longitud, latitud).
export function aTextoPostgres(puntos: readonly Punto[]): string {
  return `(${puntos.map((p) => `(${redondear(p.lng)},${redondear(p.lat)})`).join(",")})`;
}
