import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Un correo es una pantalla que se lee en el teléfono de alguien: todo color de texto escrito en línea en el código que arma los
// correos cumple 4,5:1 sobre el fondo blanco del correo (WCAG 2.2 AA, texto pequeño). El S16 halló un pie de `#888` a 12 px (3,54:1)
// en las tres familias de correos porque el panel del operador lo mostró en su vista previa y axe lo marcó.

const luminancia = (hex: string) => {
  const h = hex.replace("#", "");
  const c = (h.length === 3 ? [...h].map((x) => x + x).join("") : h)
    .match(/../g)!
    .map((x) => parseInt(x, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrasteSobreBlanco = (hex: string) => 1.05 / (luminancia(hex) + 0.05);

const archivos = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const ruta = join(dir, f);
    return statSync(ruta).isDirectory() ? archivos(ruta) : ruta.endsWith(".ts") ? [ruta] : [];
  });

describe("el contraste de los correos", () => {
  it("la cuenta del contraste es la de WCAG (el gris que falló no pasa, el del sistema sí)", () => {
    expect(contrasteSobreBlanco("#888888")).toBeCloseTo(3.54, 1);
    expect(contrasteSobreBlanco("#6b7280")).toBeGreaterThan(4.5);
    expect(contrasteSobreBlanco("#7b5dd6")).toBeGreaterThan(4.5);
  });

  it("todo `color:#…` escrito en línea en src/engine y src/lib llega a 4,5:1 sobre blanco", () => {
    const hallados: Array<[string, string, number]> = [];
    for (const f of [...archivos("src/engine"), ...archivos("src/lib")]) {
      const texto = readFileSync(f, "utf8");
      for (const m of texto.matchAll(/(?<![-\w])color:\s*(#[0-9a-fA-F]{3,6})\b/g)) {
        hallados.push([f, m[1], contrasteSobreBlanco(m[1])]);
      }
    }
    expect(hallados.length, "debe encontrar los colores de los correos").toBeGreaterThan(5);
    const malos = hallados.filter(([, , c]) => c < 4.5).map(([f, hex, c]) => `${f} ${hex} (${c.toFixed(2)}:1)`);
    expect(malos).toEqual([]);
  });
});
