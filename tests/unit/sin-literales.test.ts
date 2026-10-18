// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { barrer } from "./utils/barrido-literales";

// Regla de producto 10 (S5): ningún texto visible vive en un componente ni en un motor; todo sale
// del diccionario `src/textos/*` con sus dos idiomas. Este test recorre los componentes y páginas
// (.tsx) y los motores y `lib` (.ts) y falla ante un literal de texto en JSX, un atributo visible con
// literal, un `export const metadata`, copy en arreglos de datos, mensajes de Zod o frases sueltas.
// Ya no hay lista de excepciones: el S5 terminó de migrar todo y cualquier archivo nuevo nace limpio.

const RAIZ = join(__dirname, "..", "..");
const FUENTES: Array<[carpeta: string, extension: string]> = [
  ["src/app", ".tsx"],
  ["src/components", ".tsx"],
  ["src/engine", ".ts"],
  ["src/lib", ".ts"],
];

function archivos(dir: string, extension: string): string[] {
  const salida: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta, extension));
    else if (nombre.endsWith(extension)) salida.push(ruta);
  }
  return salida;
}

const todos = FUENTES.flatMap(([carpeta, ext]) =>
  archivos(join(RAIZ, carpeta), ext),
).map((a) => relative(RAIZ, a));
const hallazgosPorArchivo = new Map(
  todos.map((a) => [a, barrer(a, readFileSync(join(RAIZ, a), "utf8"))]),
);

describe("sin literales de texto fuera del diccionario", () => {
  it("el barrido ve los archivos de la app, los motores y lib", () => {
    expect(todos.length).toBeGreaterThan(60);
    expect(todos.some((a) => a.startsWith("src/engine/"))).toBe(true);
    expect(todos.some((a) => a.startsWith("src/lib/"))).toBe(true);
  });

  it("ningún archivo tiene literales de texto", () => {
    const sucios = todos
      .filter((a) => (hallazgosPorArchivo.get(a) ?? []).length > 0)
      .map(
        (a) =>
          `${a}\n` +
          (hallazgosPorArchivo.get(a) ?? [])
            .slice(0, 3)
            .map((h) => `    L${h.linea} [${h.tipo}] ${h.texto.slice(0, 60)}`)
            .join("\n"),
      );
    expect(
      sucios,
      `Literales fuera del diccionario:\n${sucios.join("\n")}`,
    ).toEqual([]);
  });
});
