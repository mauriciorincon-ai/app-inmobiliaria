// @vitest-environment node
// El catálogo GENERADO (scripts/sectores/convertir.mjs) llega a tres sitios que deben decir lo mismo:
// el JSON del motor, la migración (tabla `sectores`) y el GeoJSON del mapa. Este test los cruza.
import { readFileSync, statSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { SECTORES, claveBarrio } from "@/engine/zonas/sectores";
import { BOGOTA } from "@/engine/busqueda/poligono";
import { clave } from "../../scripts/sectores/convertir.mjs";

const MIGRACION = readFileSync(
  "supabase/migrations/20261019000001_sectores_y_busqueda.sql",
  "utf8",
);
const FILA =
  /^\s+\('(\d{6})', '((?:[^']|'')*)', '((?:[^']|'')*)', '(urbano|rural|mixto)', point\((-?\d+(?:\.\d+)?), (-?\d+(?:\.\d+)?)\)\)/;

const filasSql = MIGRACION.slice(
  MIGRACION.indexOf("-- BEGIN GENERADO: sectores"),
  MIGRACION.indexOf("-- END GENERADO: sectores"),
)
  .split("\n")
  .map((l) => FILA.exec(l))
  .filter((m): m is RegExpExecArray => m !== null)
  .map(([, codigo, nombre, localidad, tipo, lon, lat]) => ({
    codigo,
    nombre: nombre.replace(/''/g, "'"),
    localidad: localidad.replace(/''/g, "'"),
    tipo,
    lon: Number(lon),
    lat: Number(lat),
  }));

describe("catálogo de sectores: JSON del motor ↔ migración ↔ mapa", () => {
  it("la migración inserta los mismos 1 230 sectores que el JSON del motor, en el mismo orden", () => {
    expect(filasSql).toHaveLength(1230);
    expect(
      filasSql.map(({ codigo, nombre, localidad, tipo }) => ({
        codigo,
        nombre,
        localidad,
        tipo,
      })),
    ).toEqual(SECTORES.map((s) => ({ ...s })));
  });

  it("todo centroide cae dentro de la caja de Bogotá (x = longitud, y = latitud)", () => {
    for (const f of filasSql) {
      expect(f.lon, f.codigo).toBeGreaterThanOrEqual(BOGOTA.lngMin);
      expect(f.lon, f.codigo).toBeLessThanOrEqual(BOGOTA.lngMax);
      expect(f.lat, f.codigo).toBeGreaterThanOrEqual(BOGOTA.latMin);
      expect(f.lat, f.codigo).toBeLessThanOrEqual(BOGOTA.latMax);
    }
  });

  it("los barrios de la maqueta tienen su centroide donde deben (Chapinero al sur de Usaquén)", () => {
    const rosales = filasSql.find((f) => f.codigo === "008304")!;
    const usaquen = filasSql.find((f) => f.codigo === "008407")!;
    expect(rosales.lat).toBeLessThan(usaquen.lat);
  });

  it("claveBarrio (motor), clave (convertidor) y public.clave_barrio (BD) piden lo mismo", () => {
    for (const s of SECTORES)
      expect(claveBarrio(s.nombre), s.codigo).toBe(clave(s.nombre));
    // La BD traduce solo las letras del español; el catálogo no usa otras.
    expect(MIGRACION).toContain("'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun'");
    for (const s of SECTORES)
      expect(s.nombre, s.codigo).toMatch(/^[\p{L}\p{N}\s().'\-/,]+$/u);
  });

  it("el GeoJSON del mapa trae un polígono cerrado por sector, el mismo código y pesa menos de 1 MB", () => {
    const ruta = "public/datos/sectores.geojson";
    expect(statSync(ruta).size).toBeLessThan(1_000_000);
    const g = JSON.parse(readFileSync(ruta, "utf8"));
    expect(g.features).toHaveLength(1230);
    const codigos = new Set(SECTORES.map((s) => s.codigo));
    for (const f of g.features) {
      expect(codigos.has(f.properties.c), f.properties.c).toBe(true);
      expect(Object.keys(f.properties)).toEqual(["c"]); // solo el código: el nombre sale del catálogo
      const poligonos =
        f.geometry.type === "Polygon"
          ? [f.geometry.coordinates]
          : f.geometry.coordinates;
      for (const [anillo] of poligonos) {
        expect(anillo.length, f.properties.c).toBeGreaterThanOrEqual(4);
        expect(anillo[0], f.properties.c).toEqual(anillo.at(-1));
      }
    }
    expect(
      new Set(
        g.features.map((f: { properties: { c: string } }) => f.properties.c),
      ).size,
    ).toBe(1230);
  });
});
