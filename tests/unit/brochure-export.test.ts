import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Contrato del export de la vitrina (schema v1.0.0) + su cuadre con el brochure y el manual.
//
// OJO — este test vigila FORMA y CUADRE, no VIGENCIA: no puede saber si una cifra sigue siendo
// cierta, solo que está bien declarada y que los tres documentos dicen el mismo número. Cada
// métrica se MIDE al generarla, y el export se genera de ÚLTIMO en el PR (lección de habla, que
// nació declarando 251 pruebas cuando su propio test recién escrito ya las volvía 261).

const raiz = join(process.cwd());
const exportJson = JSON.parse(
  readFileSync(join(raiz, "docs/brochure-export.json"), "utf8"),
);
const brochure = readFileSync(join(raiz, "docs/BROCHURE.html"), "utf8");
const manual = readFileSync(join(raiz, "docs/MANUAL-DE-USO.md"), "utf8");

const FUENTES_VALIDAS = ["medido", "calculada", "declarado", "estimacion"];

describe("contrato del brochure-export (schema v1.0.0)", () => {
  it("conserva el bloque _schema y su versión de FORMATO", () => {
    expect(exportJson._schema).toBeDefined();
    expect(exportJson._schema._lee_esto_primero).toContain(
      "no es dato de la app",
    );
    expect(exportJson.schema_version).toBe("1.0.0");
  });

  it("toda cifra de metricas[] declara una fuente válida y su detalle", () => {
    expect(exportJson.metricas.length).toBeGreaterThan(0);
    for (const m of exportJson.metricas) {
      expect(
        FUENTES_VALIDAS,
        `métrica "${m.clave}" sin fuente válida`,
      ).toContain(m.fuente);
      expect(typeof m.valor, `métrica "${m.clave}" sin valor numérico`).toBe(
        "number",
      );
      expect(
        m.detalle?.length ?? 0,
        `métrica "${m.clave}" sin detalle`,
      ).toBeGreaterThan(0);
    }
  });

  it("el total cuadra con las features listadas en los grupos", () => {
    const enGrupos = exportJson.funcionalidades.grupos.reduce(
      (n: number, g: { features: unknown[] }) => n + g.features.length,
      0,
    );
    expect(enGrupos).toBe(exportJson.funcionalidades.total);
  });

  it("el total cuadra con las secciones de feature del MANUAL (la fuente del conteo)", () => {
    expect(exportJson.funcionalidades.fuente_del_conteo).toBe(
      "docs/MANUAL-DE-USO.md",
    );
    const secciones = manual.match(/^### /gm)?.length ?? 0;
    expect(secciones).toBe(exportJson.funcionalidades.total);
  });

  it("cada feature apunta a una sección que EXISTE en el manual", () => {
    for (const grupo of exportJson.funcionalidades.grupos) {
      for (const f of grupo.features) {
        expect(
          manual.includes(`### ${f.seccion_manual}`),
          `la feature "${f.nombre}" apunta a "${f.seccion_manual}", que no existe en el manual`,
        ).toBe(true);
      }
    }
  });

  it("el conteo del pie del brochure dice el mismo número que el export", () => {
    const enPie = brochure.match(/data-contador[^>]*>(\d+)</)?.[1];
    expect(Number(enPie)).toBe(exportJson.funcionalidades.total);
  });

  it("la métrica de funcionalidades coincide con el total", () => {
    const m = exportJson.metricas.find(
      (x: { clave: string }) => x.clave === "funcionalidades",
    );
    expect(m.valor).toBe(exportJson.funcionalidades.total);
  });

  it("no viaja ningún enlace de acceso (regla de cero enlaces del portafolio)", () => {
    expect(exportJson.enlaces.produccion).toBeNull();
    expect(exportJson.enlaces.repositorio).toBeNull();
    expect(exportJson.enlaces.razon.length).toBeGreaterThan(0);
    // Y tampoco colado en cualquier otro punto del documento.
    const crudo = JSON.stringify(exportJson);
    expect(crudo).not.toMatch(
      /https?:\/\/[^"]*(workers\.dev|vercel\.app|r2\.dev)/,
    );
  });

  it("el brochure tampoco publica un enlace de producción", () => {
    expect(brochure).not.toMatch(/workers\.dev|vercel\.app/);
  });

  it("declara el estado del ciclo de vida (inicial hasta que el usuario selle)", () => {
    expect(["inicial", "sellado"]).toContain(exportJson.app.estado);
    if (exportJson.app.estado === "inicial") {
      expect(exportJson.app.sellado_en).toBeNull();
      // Y el brochure lo dice en su cabecera visible.
      expect(brochure).toMatch(/Brochure inicial/i);
    }
  });

  it("las descartadas, si las hay, traen razón y fecha", () => {
    for (const d of exportJson.funcionalidades.descartadas) {
      expect(d.razon?.length ?? 0).toBeGreaterThan(0);
      expect(d.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
