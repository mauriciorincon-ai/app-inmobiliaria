import { describe, it, expect } from "vitest";
import {
  ZONA_MAX_VERTICES,
  aTextoPostgres,
  areaKm2,
  dentroDeBogota,
  parsearZona,
  seCruza,
  serializarZona,
  validarZona,
  type Punto,
} from "@/engine/busqueda/poligono";

// ≈ 2 km × 2 km sobre Chapinero (datos sintéticos: no son una dirección).
const CUADRO: Punto[] = [
  { lat: 4.64, lng: -74.07 },
  { lat: 4.64, lng: -74.05 },
  { lat: 4.66, lng: -74.05 },
  { lat: 4.66, lng: -74.07 },
];

describe("zona dibujada", () => {
  it("el cuadro de ejemplo es válido y mide unos 4,9 km²", () => {
    expect(validarZona(CUADRO)).toEqual({ ok: true });
    expect(areaKm2(CUADRO)).toBeGreaterThan(4);
    expect(areaKm2(CUADRO)).toBeLessThan(5.5);
  });

  it("rechaza con su motivo: pocos, muchos, fuera de Bogotá, minúscula y moño", () => {
    expect(validarZona(CUADRO.slice(0, 2))).toEqual({
      ok: false,
      motivo: "pocos_puntos",
    });
    const muchos = Array.from({ length: ZONA_MAX_VERTICES + 1 }, (_, i) => ({
      lat: 4.6 + (i % 2) * 0.01,
      lng: -74.1 + i * 0.0001,
    }));
    expect(validarZona(muchos)).toEqual({ ok: false, motivo: "muchos_puntos" });
    expect(validarZona(CUADRO.map((p) => ({ ...p, lat: p.lat + 5 })))).toEqual({
      ok: false,
      motivo: "fuera_de_bogota",
    });
    const diminuta = CUADRO.map((p) => ({
      lat: 4.64 + (p.lat - 4.64) / 100,
      lng: -74.07 + (p.lng + 74.07) / 100,
    }));
    expect(validarZona(diminuta)).toEqual({ ok: false, motivo: "muy_pequena" });
    const moño: Punto[] = [CUADRO[0], CUADRO[2], CUADRO[1], CUADRO[3]];
    expect(seCruza(moño)).toBe(true);
    expect(validarZona(moño)).toEqual({ ok: false, motivo: "se_cruza" });
    expect(seCruza(CUADRO)).toBe(false);
  });

  it("dos lados alineados que se montan o un vértice sobre otro lado también se cruzan", () => {
    // El 5.º vértice vuelve sobre el lado de abajo: el lado 4–5 se monta sobre el 0–1 (alineados).
    const montado: Punto[] = [
      { lat: 4.64, lng: -74.07 },
      { lat: 4.64, lng: -74.05 },
      { lat: 4.66, lng: -74.05 },
      { lat: 4.66, lng: -74.06 },
      { lat: 4.64, lng: -74.06 },
      { lat: 4.64, lng: -74.065 },
    ];
    expect(seCruza(montado)).toBe(true);
    // Un vértice que toca un lado que no es su vecino.
    const toca: Punto[] = [
      { lat: 4.64, lng: -74.07 },
      { lat: 4.64, lng: -74.05 },
      { lat: 4.66, lng: -74.06 },
      { lat: 4.64, lng: -74.06 },
      { lat: 4.66, lng: -74.07 },
    ];
    expect(seCruza(toca)).toBe(true);
  });

  it("dentroDeBogota descarta NaN y coordenadas del otro lado del mundo", () => {
    expect(dentroDeBogota({ lat: 4.65, lng: -74.06 })).toBe(true);
    expect(dentroDeBogota({ lat: Number.NaN, lng: -74 })).toBe(false);
    expect(dentroDeBogota({ lat: 40.4, lng: -3.7 })).toBe(false);
  });

  it("serializa a la URL y la lee de vuelta (ida y vuelta exacta)", () => {
    const url = serializarZona(CUADRO);
    expect(url).toBe("4.64,-74.07;4.64,-74.05;4.66,-74.05;4.66,-74.07");
    expect(parsearZona(url)).toEqual(CUADRO);
  });

  it("parsearZona nunca lanza: lo raro vuelve null", () => {
    for (const malo of [
      "",
      "basura",
      "4.64,-74.07",
      "4.64,-74.07;4.64,-74.05;nan,nan",
      "4.64,-74.07;4.64,-74.05;4.66,-74.05;<script>",
      "4.6412345678,-74.07;4.64,-74.05;4.66,-74.05",
      "4.64,-74.07;4.66,-74.05;4.64,-74.05;4.66,-74.07", // moño
      "x".repeat(5000),
    ]) {
      expect(parsearZona(malo), malo.slice(0, 30)).toBeNull();
    }
  });

  it("aTextoPostgres pone la longitud primero (x = lng, y = lat) y cierra los paréntesis", () => {
    expect(aTextoPostgres(CUADRO)).toBe(
      "((-74.07,4.64),(-74.05,4.64),(-74.05,4.66),(-74.07,4.66))",
    );
  });
});
