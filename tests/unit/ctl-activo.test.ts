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
describe("el lector de CTL sigue apagado donde se sirve", () => {
  const RAIZ = join(__dirname, "..", "..");
  const leer = (f: string) => readFileSync(join(RAIZ, f), "utf8");

  it("/papeleo solo pasa los textos del lector con el interruptor encendido", () => {
    const pagina = leer("src/app/[lang]/papeleo/page.tsx");
    expect(pagina).toContain(
      "ctl={lectorCtlActivo() ? enIdioma(CTL, lang) : null}",
    );
  });

  it("solo el job e2e de la CI define el interruptor; el build, Lighthouse y el despliegue no", () => {
    const ci = leer(".github/workflows/ci.yml");
    const e2e = ci.indexOf("\n  e2e:");
    const lighthouse = ci.indexOf("\n  lighthouse:");
    expect(e2e).toBeGreaterThan(0);
    expect(lighthouse).toBeGreaterThan(e2e);
    const veces = [...ci.matchAll(/LECTOR_CTL_ACTIVO: "1"/g)].map(
      (m) => m.index!,
    );
    expect(veces).toHaveLength(1);
    expect(veces[0]).toBeGreaterThan(e2e);
    expect(veces[0]).toBeLessThan(lighthouse);
    for (const f of [
      "wrangler.jsonc",
      "wrangler.toml",
      ".env.example",
      "package.json",
    ]) {
      let texto = "";
      try {
        texto = leer(f);
      } catch {
        // el archivo puede no existir
      }
      expect(texto, f).not.toContain("LECTOR_CTL_ACTIVO");
    }
  });
});
