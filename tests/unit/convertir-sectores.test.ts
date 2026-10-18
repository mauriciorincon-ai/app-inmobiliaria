// @vitest-environment node
// El convertidor del catálogo (scripts/sectores/convertir.mjs) sobre un fixture de juguete: dos
// localidades cuadradas y cuatro sectores, uno de ellos cóncavo. Los datos reales de Catastro no se
// versionan (18 MB); el resultado generado SÍ, y lo vigila tests/unit/catalogo-sectores.test.ts.
import { describe, it, expect } from "vitest";
import {
  LOCALIDAD_POR_CODIGO,
  bloqueInserts,
  catalogo,
  clave,
  convertir,
  desambiguar,
  geojsonMapa,
  reemplazarBloque,
} from "../../scripts/sectores/convertir.mjs";
import { enAnillo } from "../../scripts/sectores/geometria.mjs";
import { LOCALIDADES } from "@/engine/zonas/localidades";

const cuadro = (x0: number, y0: number, x1: number, y1: number) => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
  [x0, y0],
];
const sector = (
  cod: string,
  nombre: string,
  tipo: number,
  anillo: number[][],
) => ({
  type: "Feature",
  properties: { SCACODIGO: cod, SCANOMBRE: nombre, SCATIPO: tipo },
  geometry: { type: "Polygon", coordinates: [anillo] },
});

// «C» abierta hacia la derecha: su centroide cae en el hueco, fuera del polígono.
const C = [
  [1, 1],
  [9, 1],
  [9, 3],
  [3, 3],
  [3, 7],
  [9, 7],
  [9, 9],
  [1, 9],
  [1, 1],
];

const LOCALIDADES_JUGUETE = {
  features: [
    {
      attributes: { LocCodigo: "02" },
      geometry: { rings: [cuadro(0, 0, 10, 10)] },
    },
    {
      attributes: { LocCodigo: "01" },
      geometry: { rings: [cuadro(10, 0, 20, 10)] },
    },
  ],
};
const SECTORES_JUGUETE = {
  features: [
    sector("000003", "LAS ACACIAS", 0, cuadro(5, 5, 6, 6)),
    sector("000001", "LOS ROSALES", 0, cuadro(2, 2, 4, 4)),
    sector("000002", "LAS ACACIAS", 2, cuadro(12, 2, 14, 4)),
    sector("000004", "LAS ACACIAS", 1, cuadro(7, 2, 8, 3)),
    sector("000005", "LA CONCAVA", 0, C),
  ],
};

describe("convertir — fixture de juguete", () => {
  const r = convertir(SECTORES_JUGUETE, LOCALIDADES_JUGUETE);
  const por = (c: string) =>
    r.sectores.find((s: { codigo: string }) => s.codigo === c)!;

  it("ordena por código y asigna la localidad que contiene el punto interior", () => {
    expect(r.sectores.map((s: { codigo: string }) => s.codigo)).toEqual([
      "000001",
      "000002",
      "000003",
      "000004",
      "000005",
    ]);
    expect(por("000001").localidad).toBe("Chapinero");
    expect(por("000002").localidad).toBe("Usaquén");
  });

  it("traduce el tipo de Catastro (0 urbano, 1 rural, 2 mixto)", () => {
    expect([
      por("000001").tipo,
      por("000004").tipo,
      por("000002").tipo,
    ]).toEqual(["urbano", "rural", "mixto"]);
  });

  it("un nombre repetido en la MISMA localidad lleva ‹(2)›, ‹(3)›; en otra localidad no", () => {
    expect(por("000003").nombre).toBe("Las Acacias");
    expect(por("000004").nombre).toBe("Las Acacias (2)");
    expect(por("000002").nombre).toBe("Las Acacias"); // Usaquén: el primero de su localidad
  });

  it("un sector cóncavo recibe un punto que SÍ está dentro de él", () => {
    expect(r.centroideFuera).toBe(1);
    const c = por("000005");
    expect(enAnillo([c.lon, c.lat], C)).toBe(true);
    expect(por("000001").lon).toBe(3); // el cuadrado: su centroide es el punto
  });

  it("el mapa dibuja primero el sector grande y encima el chico", () => {
    const g = JSON.parse(geojsonMapa(r.sectores));
    expect(g.features[0].properties.c).toBe("000005");
    expect(g.features.at(-1).properties.c).toBe("000004");
    expect(g.features[0].geometry.type).toBe("Polygon");
  });

  it("el catálogo son tuplas [código, nombre, localidad, tipo]", () => {
    expect(JSON.parse(catalogo(r.sectores))[0]).toEqual([
      "000001",
      "Los Rosales",
      "Chapinero",
      "urbano",
    ]);
  });
});

describe("convertir — piezas", () => {
  it("clave: sin tildes, eñes, signos ni mayúsculas", () => {
    expect(clave("Cañada Núñez (2)")).toBe("canada nunez 2");
  });

  it("desambiguar trata como el mismo nombre al que solo difiere en tildes o mayúsculas (así lo ve el trigger)", () => {
    const r = desambiguar([
      { localidad: "Suba", nombre: "La Gaitana" },
      { localidad: "Suba", nombre: "LA GAITANA" },
    ]);
    expect(r.map((s: { nombre: string }) => s.nombre)).toEqual([
      "La Gaitana",
      "LA GAITANA (2)",
    ]);
  });

  it("los nombres de localidad salen EXACTOS de LOCALIDADES (más Sumapaz)", () => {
    const nombres = Object.values(LOCALIDAD_POR_CODIGO) as string[];
    expect(nombres).toHaveLength(20);
    for (const l of LOCALIDADES) expect(nombres).toContain(l);
    expect(nombres).toContain("Sumapaz");
  });

  it("el bloque de inserts escapa las comillas y reemplazarBloque conserva el resto de la migración", () => {
    const bloque = bloqueInserts([
      {
        codigo: "000009",
        nombre: "O'Higgins",
        localidad: "Suba",
        tipo: "urbano",
        lon: -74.1,
        lat: 4.7,
      },
    ]);
    expect(bloque).toContain("'O''Higgins'");
    expect(bloque).toContain("point(-74.1, 4.7)");
    const migracion =
      "antes\n-- BEGIN GENERADO: sectores\nviejo\n-- END GENERADO: sectores\ndespués\n";
    const nueva = reemplazarBloque(migracion, bloque);
    expect(nueva.startsWith("antes\n")).toBe(true);
    expect(nueva.endsWith("\ndespués\n")).toBe(true);
    expect(nueva).not.toContain("viejo");
    expect(() => reemplazarBloque("sin marcas", bloque)).toThrow(/marcas/);
  });
});
