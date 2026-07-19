// Localidades urbanas de Bogotá — espejo EXACTO del seed de `zonas` en la migración
// 20260719000001_campana.sql (mismos nombres y acentos). El wizard las ofrece en un select y
// `registrar_fundador` resuelve el nombre → zona_id (`lower(nombre) = lower(btrim(p_zona))`).
// Fase 1 es Bogotá-only, así que la lista es cerrada.

export const LOCALIDADES = [
  "Usaquén",
  "Chapinero",
  "Santa Fe",
  "San Cristóbal",
  "Usme",
  "Tunjuelito",
  "Bosa",
  "Kennedy",
  "Fontibón",
  "Engativá",
  "Suba",
  "Barrios Unidos",
  "Teusaquillo",
  "Los Mártires",
  "Antonio Nariño",
  "Puente Aranda",
  "La Candelaria",
  "Rafael Uribe Uribe",
  "Ciudad Bolívar",
] as const;

export type Localidad = (typeof LOCALIDADES)[number];

export function esLocalidadValida(v: string): v is Localidad {
  return (LOCALIDADES as readonly string[]).includes(v);
}
