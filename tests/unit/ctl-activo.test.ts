// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lectorCtlActivo } from "@/lib/ctl-activo";

// S15 — el lector de CTL nace APAGADO: solo «1» lo enciende; ausente, vacío o cualquier otro valor lo deja apagado.
describe("el interruptor del lector de CTL", () => {
  it("ausente ⇒ apagado", () => {
    expect(lectorCtlActivo({})).toBe(false);
  });
  it.each(["", "0", "true", "si", "on", " 1"])("«%s» ⇒ apagado", (v) => {
    expect(lectorCtlActivo({ LECTOR_CTL_ACTIVO: v })).toBe(false);
  });
  it("«1» ⇒ encendido", () => {
    expect(lectorCtlActivo({ LECTOR_CTL_ACTIVO: "1" })).toBe(true);
  });
});

// Que esté apagado NO depende solo de la función: la página solo manda los textos del lector con el interruptor encendido, y
// ningún archivo de despliegue lo enciende. Solo el job e2e de la CI (certificados SINTÉTICOS) lo define.
const DEFINE = /LECTOR_CTL_ACTIVO: "1"/g;

/** Dónde define el interruptor un `ci.yml` fuera del job e2e (los trabajos de build, Lighthouse y demás deben medir la página apagada). */
function definicionesFueraDelE2e(ci: string): number[] {
  const e2e = ci.indexOf("\n  e2e:");
  const siguiente = ci.indexOf("\n  lighthouse:", e2e);
  if (e2e < 0 || siguiente < 0)
    throw new Error(
      "el ci.yml no trae los trabajos e2e y lighthouse en ese orden",
    );
  return [...ci.matchAll(DEFINE)]
    .map((m) => m.index!)
    .filter((i) => i < e2e || i > siguiente);
}

describe("el lector de CTL sigue apagado donde se sirve", () => {
  const RAIZ = join(__dirname, "..", "..");
  const leer = (f: string) => readFileSync(join(RAIZ, f), "utf8");

  it("/papeleo solo pasa los textos del lector con el interruptor encendido", () => {
    const pagina = leer("src/app/[lang]/papeleo/page.tsx");
    expect(pagina).toContain(
      "ctl={lectorCtlActivo() ? enIdioma(CTL, lang) : null}",
    );
  });

  it("solo el job e2e de la CI define el interruptor; el build y Lighthouse no", () => {
    const ci = leer(".github/workflows/ci.yml");
    expect([...ci.matchAll(DEFINE)]).toHaveLength(1);
    expect(definicionesFueraDelE2e(ci)).toEqual([]);
  });

  it("DEMO EN ROJO: el detector ve el interruptor si alguien lo pone en Lighthouse o en el build", () => {
    const base =
      'jobs:\n  quality:\n    env:\n      A: b\n  e2e:\n    env:\n      LECTOR_CTL_ACTIVO: "1"\n  lighthouse:\n    env:\n      C: d\n';
    expect(definicionesFueraDelE2e(base)).toEqual([]);
    const enLighthouse = base.replace(
      "      C: d",
      '      LECTOR_CTL_ACTIVO: "1"',
    );
    expect(definicionesFueraDelE2e(enLighthouse)).toHaveLength(1);
    const enBuild = base.replace("      A: b", '      LECTOR_CTL_ACTIVO: "1"');
    expect(definicionesFueraDelE2e(enBuild)).toHaveLength(1);
  });

  it("ningún archivo de despliegue lo enciende", () => {
    for (const f of ["wrangler.jsonc", ".env.example", "package.json"]) {
      expect(leer(f), f).not.toContain("LECTOR_CTL_ACTIVO");
    }
  });
});
