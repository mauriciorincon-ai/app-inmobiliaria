// @vitest-environment node
// Presupuesto de Lighthouse por ruta (S13). LHCI convierte cada entrada de `perf-budget.json` en un `matchingUrlPattern`
// (@lhci/utils 0.15.1, budgets-converter.js) y aplica TODAS las entradas que coinciden con una URL: una entrada propia
// nunca afloja el global `/*`, solo lo ajusta hacia abajo para que una ruta no crezca sin que la CI lo vea. Este gate
// ata las dos listas: toda ruta del módulo de vivienda nueva que entra a Lighthouse trae su entrada propia, ninguna entrada
// queda muerta (sin URL que la use) y ninguna supera el global. La demo en rojo del presupuesto en sí es una corrida local
// de `lhci` con un tope bajo (se anota en el cierre).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type Entrada = {
  path: string;
  timings: { metric: string; budget: number }[];
  resourceSizes: { resourceType: string; budget: number }[];
};

const RAIZ = join(__dirname, "..", "..");
const leer = <T>(f: string): T =>
  JSON.parse(readFileSync(join(RAIZ, f), "utf8")) as T;
const presupuestos = leer<Entrada[]>("perf-budget.json");
const urls = leer<string[]>("lighthouse-urls.json");

// Espejo de `convertPathExpressionToRegExp` de @lhci/utils: la URL completa se prueba contra este patrón.
function patron(path: string): RegExp {
  if (!path || path === "/") return /.*/;
  const escapado = path
    .split("*")
    .map((p) => p.replace(/([-[\]{}()*+?.,\\^|#\s])/g, "\\$1"))
    .join(".*");
  return new RegExp(`https?://[^/]+${escapado}`);
}
const coincide = (e: Entrada, ruta: string) =>
  patron(e.path).test(`http://localhost:3000${ruta}`);
const script = (e: Entrada) =>
  e.resourceSizes.find((r) => r.resourceType === "script")!.budget;

const GLOBAL = presupuestos.find((e) => e.path === "/*")!;
const PROPIAS = presupuestos.filter((e) => e.path !== "/*");
// Las rutas del módulo de vivienda nueva (S12 y S13).
const DEL_MODULO = (ruta: string) =>
  /^\/(nuevos\/|nuevo-o-usado|te-alcanza)/.test(ruta) ||
  ruta.startsWith("/buscar?v=nuevos");

describe("presupuesto de Lighthouse por ruta", () => {
  it("hay un presupuesto global y, junto a él, uno propio por ruta del módulo", () => {
    expect(GLOBAL).toBeDefined();
    expect(PROPIAS.length).toBeGreaterThan(0);
  });

  it("toda ruta del módulo que entra a Lighthouse tiene una entrada propia que la cubre", () => {
    const delModulo = urls.filter(DEL_MODULO);
    expect(delModulo.length).toBeGreaterThan(0);
    for (const ruta of delModulo) {
      expect(
        PROPIAS.some((e) => coincide(e, ruta)),
        `${ruta} no tiene presupuesto propio en perf-budget.json`,
      ).toBe(true);
    }
  });

  it("ninguna entrada propia está muerta y ninguna afloja el global", () => {
    for (const e of PROPIAS) {
      expect(
        urls.some((u) => coincide(e, u)),
        `${e.path} no coincide con ninguna URL de lighthouse-urls.json`,
      ).toBe(true);
      expect(script(e), `${e.path}: script`).toBeLessThanOrEqual(
        script(GLOBAL),
      );
      for (const r of e.resourceSizes) {
        const g = GLOBAL.resourceSizes.find(
          (x) => x.resourceType === r.resourceType,
        )!;
        expect(r.budget, `${e.path}: ${r.resourceType}`).toBeLessThanOrEqual(
          g.budget,
        );
      }
      for (const t of e.timings) {
        const g = GLOBAL.timings.find((x) => x.metric === t.metric)!;
        expect(t.budget, `${e.path}: ${t.metric}`).toBeLessThanOrEqual(
          g.budget,
        );
      }
    }
  });

  it("el patrón anclado con $ no cubre las rutas hijas (la ficha no es la visita)", () => {
    const ficha = PROPIAS.find((e) => e.path.endsWith("$"))!;
    expect(ficha).toBeDefined();
    expect(coincide(ficha, "/nuevos/torre-alba-ficticia")).toBe(true);
    expect(coincide(ficha, "/nuevos/torre-alba-ficticia/visita")).toBe(false);
  });
});
