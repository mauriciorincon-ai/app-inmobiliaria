// @vitest-environment node
// El valor de referencia del terreno por barrio (S10, ADR 018): el convertidor sobre un fixture de juguete y el
// resultado generado que se versiona. Los datos reales de Catastro (41 858 manzanas) no se versionan; la salida sí.
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  documento,
  mediana,
  porBarrio,
} from "../../scripts/valor-referencia/convertir.mjs";
import { SECTORES } from "@/engine/zonas/sectores";
import generado from "@/engine/zonas/valor-referencia.json";

const CODIGOS = ["008108", "008109", "999999"];

describe("mediana", () => {
  it("toma el valor central y, si son pares, el promedio redondeado", () => {
    expect(mediana([5, 1, 3])).toBe(3);
    expect(mediana([1, 2])).toBe(2); // 1,5 → 2
    expect(mediana([1000000, 3000000, 2000000, 4000000])).toBe(2500000);
    expect(mediana([])).toBeNull();
  });
});

describe("porBarrio (convertidor sobre un fixture de juguete)", () => {
  const manzanas: Array<[string, number | string]> = [
    ["008108001", 7000000],
    ["008108002", 5000000],
    ["008108003", 4950000],
    ["008109001", 1200000],
    ["008109002", 0], // sin valor: se ignora
    ["008109003", -5], // inválido: se ignora
    ["123456001", 9000000], // barrio que no está en el catálogo
  ];

  it("agrupa por los 6 primeros dígitos y saca la mediana de las manzanas", () => {
    const { filas, sinBarrio } = porBarrio(manzanas, CODIGOS);
    expect(filas).toEqual([
      ["008108", 5000000, 3],
      ["008109", 1200000, 1],
    ]);
    expect(sinBarrio).toBe(1);
  });

  it("el mismo conjunto en otro orden da exactamente la misma salida", () => {
    const a = porBarrio(manzanas, CODIGOS).filas;
    const b = porBarrio([...manzanas].reverse(), CODIGOS).filas;
    expect(b).toEqual(a);
  });

  it("un barrio sin ninguna manzana con valor no aparece", () => {
    const { filas } = porBarrio([["008108001", 0]], CODIGOS);
    expect(filas).toEqual([]);
  });

  it("el documento lleva vigencia, fuente, licencia y fecha de descarga", () => {
    const d = documento([["008108", 1, 1]], "2026-10-19");
    expect(d).toMatchObject({
      vigencia: 2026,
      licencia: "CC BY 4.0",
      descargado: "2026-10-19",
    });
    expect(d.fuente).toContain("Catastro Bogotá");
  });
});

describe("valor-referencia.json generado", () => {
  const codigos = new Set(SECTORES.map((s) => s.codigo));

  it("declara su fuente, licencia, vigencia y que es de terreno por manzana", () => {
    expect(generado.licencia).toBe("CC BY 4.0");
    expect(generado.vigencia).toBe(2026);
    expect(generado.fuente).toContain("Catastro Bogotá");
    expect(generado.medida).toContain("terreno");
    expect(generado.descargado).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("cada fila es un barrio del catálogo, único, ordenado, con mediana y N enteros positivos", () => {
    const filas = generado.filas as Array<[string, number, number]>;
    const vistos = filas.map((f) => f[0]);
    expect(new Set(vistos).size).toBe(vistos.length);
    expect([...vistos].sort()).toEqual(vistos);
    for (const [codigo, valor, n] of filas) {
      expect(codigos.has(codigo), `código ${codigo} fuera del catálogo`).toBe(
        true,
      );
      expect(Number.isInteger(valor) && valor > 0).toBe(true);
      expect(Number.isInteger(n) && n >= 1).toBe(true);
    }
  });

  it("cubre al menos el 95 % de los barrios urbanos del catálogo", () => {
    const con = new Set((generado.filas as Array<[string]>).map((f) => f[0]));
    const urbanos = SECTORES.filter((s) => s.tipo === "urbano");
    const cubiertos = urbanos.filter((s) => con.has(s.codigo)).length;
    expect(cubiertos / urbanos.length).toBeGreaterThanOrEqual(0.95);
  });
});

describe("el archivo de Catastro no viaja al navegador", () => {
  const RAIZ = path.resolve(__dirname, "../../src");
  const archivos = (dir: string): string[] =>
    readdirSync(dir).flatMap((nombre) => {
      const ruta = path.join(dir, nombre);
      if (statSync(ruta).isDirectory()) return archivos(ruta);
      return /\.(ts|tsx)$/.test(nombre) ? [ruta] : [];
    });
  const IMPORTA = /from\s+["'][^"']*zonas\/valor-referencia(?:\.json)?["']/;

  it('ningún módulo "use client" ni el motor puro de zona lo importan', () => {
    const culpables = archivos(RAIZ)
      .filter((ruta) => {
        const texto = readFileSync(ruta, "utf8");
        const esCliente = /^\s*["']use client["']/.test(texto);
        const esMotorZona = ruta.endsWith(
          path.join("engine", "precio", "zona.ts"),
        );
        return (esCliente || esMotorZona) && IMPORTA.test(texto);
      })
      .map((ruta) => path.relative(RAIZ, ruta));
    expect(culpables).toEqual([]);
  });

  // S16 (deuda del S10): la de arriba solo veía el import DIRECTO. Esta sigue la cadena de imports desde cada módulo de cliente
  // (y desde el motor de zona): un módulo intermedio que lo importe también lo llevaría al navegador.
  it("tampoco lo alcanzan por una cadena de imports", () => {
    const DE = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
    const resolver = (desde: string, spec: string): string | null => {
      const base = spec.startsWith("@/")
        ? path.join(RAIZ, spec.slice(2))
        : spec.startsWith(".")
          ? path.resolve(path.dirname(desde), spec)
          : null;
      if (!base) return null;
      for (const c of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
        try {
          if (statSync(c).isFile()) return c;
        } catch {
          // no existe con esa extensión
        }
      }
      return null;
    };
    const objetivo = path.join(RAIZ, "engine", "zonas", "valor-referencia.ts");
    const alcanza = (inicio: string): string[] | null => {
      const visto = new Map<string, string | null>([[inicio, null]]);
      const cola = [inicio];
      while (cola.length) {
        const actual = cola.shift()!;
        if (!/\.(ts|tsx)$/.test(actual)) continue;
        for (const m of readFileSync(actual, "utf8").matchAll(DE)) {
          const sig = resolver(actual, m[1]);
          if (!sig || visto.has(sig)) continue;
          visto.set(sig, actual);
          if (sig === objetivo || /zonas\/valor-referencia/.test(m[1])) {
            const camino = [sig];
            for (let p: string | null | undefined = actual; p; p = visto.get(p)) camino.unshift(p);
            return camino.map((r) => path.relative(RAIZ, r));
          }
          cola.push(sig);
        }
      }
      return null;
    };
    const inicios = archivos(RAIZ).filter(
      (ruta) =>
        /^\s*["']use client["']/.test(readFileSync(ruta, "utf8")) ||
        ruta.endsWith(path.join("engine", "precio", "zona.ts")),
    );
    const caminos = inicios.map(alcanza).filter((c) => c !== null);
    expect(caminos).toEqual([]);
  });
});
